import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '@/lib/db';
import { executionQueue, selfHealQueue, notificationQueue } from './index';
import type { ExecutionJobData, SelfHealJobData, NotificationJobData } from './index';

const connection = new IORedis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  { maxRetriesPerRequest: null }
);

// ==========================================
// Execution Worker
// ==========================================
export const executionWorker = new Worker<ExecutionJobData>(
  'workflow-executions',
  async (job: Job<ExecutionJobData>) => {
    const { workflowId, executionId, triggeredBy, inputData } = job.data;

    // Update execution status to running
    await db.execution.update({
      where: { id: executionId },
      data: { status: 'running', startedAt: new Date() },
    });

    // Fetch workflow with nodes and edges
    const workflow = await db.workflow.findUnique({
      where: { id: workflowId },
      include: { nodes: { orderBy: { createdAt: 'asc' } }, edges: true },
    });

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Build execution graph
    const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));
    const edgeMap = new Map<string, string[]>();
    for (const edge of workflow.edges) {
      if (!edgeMap.has(edge.sourceNodeId)) {
        edgeMap.set(edge.sourceNodeId, []);
      }
      edgeMap.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }

    // Find trigger nodes (nodes with no incoming edges)
    const targetNodes = new Set(workflow.edges.map((e) => e.targetNodeId));
    const triggerNodes = workflow.nodes.filter((n) => !targetNodes.has(n.id));

    // Execute nodes in order
    let currentNodeId: string | null = triggerNodes[0]?.id || null;
    let stepResults: Array<{ nodeId: string; status: string; output?: unknown }> = [];

    while (currentNodeId) {
      const node = nodeMap.get(currentNodeId);
      if (!node) break;

      // Create execution step
      const step = await db.executionStep.create({
        data: {
          executionId,
          nodeId: node.id,
          status: 'running',
          attemptNumber: 1,
          tokensUsed: 0,
          cost: 0,
          createdAt: new Date(),
          agentTraces: { create: [] },
        },
      });

      try {
        // Execute node based on type
        const output = await executeNode(node, inputData || {});

        await db.executionStep.update({
          where: { id: step.id },
          data: {
            status: 'completed',
            outputData: output ? JSON.parse(JSON.stringify(output)) : undefined,
            completedAt: new Date(),
            latencyMs: Date.now() - (step.startedAt?.getTime() || Date.now()),
          },
        });

        stepResults.push({ nodeId: currentNodeId, status: 'completed', output });

        // Move to next node
        const nextNodes = edgeMap.get(currentNodeId) || [];
        currentNodeId = nextNodes[0] || null;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await db.executionStep.update({
          where: { id: step.id },
          data: {
            status: 'failed',
            errorDetails: { message: errorMessage },
            completedAt: new Date(),
          },
        });

        // Queue self-healing attempt
        await selfHealQueue.add('self-heal', {
          executionId,
          stepId: step.id,
          errorCode: 500,
          errorMessage,
          nodeType: node.type,
          attempt: 1,
        });

        throw new Error(`Node ${node.id} failed: ${errorMessage}`);
      }
    }

    // Update execution status to completed
    await db.execution.update({
      where: { id: executionId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        durationMs: Date.now() - (workflow.nodes[0]?.createdAt.getTime() || Date.now()),
      },
    });

    // Queue notification
    await notificationQueue.add('notify', {
      type: 'email',
      to: 'user@example.com',
      subject: `Workflow completed: ${workflow.name}`,
      body: `Workflow "${workflow.name}" completed successfully with ${stepResults.length} steps.`,
    });

    return { success: true, steps: stepResults.length };
  },
  {
    connection,
    concurrency: 5,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

// ==========================================
// Self-Healing Worker
// ==========================================
export const selfHealWorker = new Worker<SelfHealJobData>(
  'self-healing',
  async (job: Job<SelfHealJobData>) => {
    const { executionId, stepId, errorCode, errorMessage, nodeType, attempt } = job.data;

    // Determine healing strategy based on error code
    const strategies: Record<number, { action: string; delay: number }> = {
      401: { action: 'refresh_token', delay: 2000 },
      429: { action: 'backoff_retry', delay: Math.min(2 ** attempt * 5000, 300000) },
      500: { action: 'retry', delay: 10000 },
      503: { action: 'fallback', delay: 5000 },
    };

    const strategy = strategies[errorCode] || { action: 'escalate', delay: 0 };

    if (strategy.action === 'escalate') {
      await db.executionStep.update({
        where: { id: stepId },
        data: {
          status: 'failed',
          errorDetails: { message: `Self-healing failed: ${errorMessage}`, details: { strategy: 'escalate' } },
        },
      });
      throw new Error(`Self-healing escalated for step ${stepId}`);
    }

    // Wait for delay
    if (strategy.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, strategy.delay));
    }

    // Retry the step
    await db.executionStep.update({
      where: { id: stepId },
      data: {
        status: 'retrying',
        attemptNumber: attempt + 1,
      },
    });

    return { strategy: strategy.action, attempt: attempt + 1 };
  },
  {
    connection,
    concurrency: 3,
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  }
);

// ==========================================
// Notification Worker
// ==========================================
export const notificationWorker = new Worker<NotificationJobData>(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    const { type, to, subject, body, metadata } = job.data;

    // In production, this would call actual email/Slack/webhook APIs
    console.log(`[${type}] Sending to ${to}: ${subject || 'Notification'}`);
    console.log(`Body: ${body}`);

    return { sent: true, type, to };
  },
  {
    connection,
    concurrency: 10,
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 100 },
  }
);

// ==========================================
// Node Executor
// ==========================================
async function executeNode(node: { type: string; config: unknown }, inputData: Record<string, unknown>): Promise<unknown> {
  const config = (node.config as Record<string, unknown>) || {};

  switch (node.type) {
    case 'trigger.webhook':
      return { triggered: true, data: inputData };

    case 'trigger.cron':
      return { triggered: true, timestamp: new Date().toISOString() };

    case 'action.http': {
      const url = (config.url as string) || '';
      const method = (config.method as string) || 'GET';
      const response = await fetch(url, {
        method,
        headers: (config.headers as Record<string, string>) || {},
        body: method !== 'GET' ? JSON.stringify(config.body || inputData) : undefined,
      });
      return await response.json();
    }

    case 'action.ai': {
      // Call AI engine
      const aiEngineUrl = process.env.AI_ENGINE_URL || 'http://localhost:8100';
      const response = await fetch(`${aiEngineUrl}/ai/agents/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: config.prompt as string,
          agent_type: 'executor',
          context: { input: inputData },
        }),
      });
      return await response.json();
    }

    case 'action.transform': {
      // Simple data transformation
      return { ...inputData, transformed: true };
    }

    case 'action.filter': {
      const field = config.field as string;
      const value = config.value as string;
      const operator = (config.operator as string) || 'equals';

      const inputVal = (inputData as Record<string, unknown>)[field];
      let passed = false;

      switch (operator) {
        case 'equals':
          passed = inputVal === value;
          break;
        case 'not_equals':
          passed = inputVal !== value;
          break;
        case 'contains':
          passed = String(inputVal || '').includes(value);
          break;
        case 'exists':
          passed = inputVal !== undefined && inputVal !== null;
          break;
      }

      return { passed, field, value, operator };
    }

    case 'logic.if_else': {
      const condition = config.condition as Record<string, unknown>;
      const field = condition?.field as string;
      const operator = condition?.operator as string;
      const value = condition?.value as string;
      const inputVal = (inputData as Record<string, unknown>)[field];

      let result = false;
      switch (operator) {
        case 'equals':
          result = inputVal === value;
          break;
        case 'not_equals':
          result = inputVal !== value;
          break;
        case 'gt':
          result = Number(inputVal) > Number(value);
          break;
        case 'lt':
          result = Number(inputVal) < Number(value);
          break;
      }

      return { condition: result, field, value };
    }

    case 'output.response':
      return { output: inputData };

    case 'output.notification': {
      const channel = config.channel as string;
      const recipient = config.to as string;
      await notificationQueue.add('notify', {
        type: channel,
        to: recipient,
        subject: 'Workflow Notification',
        body: JSON.stringify(inputData),
      });
      return { sent: true, channel, to: recipient };
    }

    default:
      return { type: node.type, data: inputData };
  }
}

// ==========================================
// Start all workers
// ==========================================
function startWorkers() {
  console.log('🚀 Starting CortexOps workers...');

  executionWorker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  executionWorker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  selfHealWorker.on('completed', (job) => {
    console.log(`🔧 Self-heal job ${job.id} completed`);
  });

  notificationWorker.on('completed', (job) => {
    console.log(`📧 Notification job ${job.id} sent`);
  });

  console.log('✅ All workers started');
}

export { startWorkers };
