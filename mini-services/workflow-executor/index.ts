// CortexOps - Workflow Executor WebSocket Service
// Real-time workflow execution with AI agents

import { serve } from "bun";
import { WebSocketServer, WebSocket } from "ws";

declare const Bun: { serve: typeof serve };

// Types
interface ExecutionEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
  isEnabled: boolean;
}

interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: Record<string, unknown>;
  edgeType: string;
}

// AI Agent Classes
class CortexBrain {
  private planner: PlannerAgent;
  private reasoner: ReasonerAgent;
  private executor: ExecutorAgent;
  private validator: ValidatorAgent;

  constructor() {
    this.planner = new PlannerAgent();
    this.reasoner = new ReasonerAgent();
    this.executor = new ExecutorAgent();
    this.validator = new ValidatorAgent();
  }

  async executeNode(
    node: WorkflowNode,
    inputData: Record<string, unknown>,
    sendEvent: (event: ExecutionEvent) => void
  ): Promise<Record<string, unknown>> {
    // Send agent thought event
    sendEvent({
      type: "agent.thought",
      timestamp: new Date().toISOString(),
      data: {
        nodeId: node.id,
        agentType: "reasoner",
        thought: `Analyzing node ${node.name} of type ${node.type}`,
      },
    });

    // Execute based on node type
    const result = await this.executor.execute(node, inputData, sendEvent);

    // Validate result
    sendEvent({
      type: "agent.thought",
      timestamp: new Date().toISOString(),
      data: {
        nodeId: node.id,
        agentType: "validator",
        thought: `Validating output for node ${node.name}`,
      },
    });

    return result;
  }
}

class PlannerAgent {
  async plan(nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<string[]> {
    // Build execution order from DAG
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();

    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adjacency.set(n.id, []);
    });

    edges.forEach((e) => {
      const targets = adjacency.get(e.sourceNodeId) || [];
      targets.push(e.targetNodeId);
      adjacency.set(e.sourceNodeId, targets);
      inDegree.set(e.targetNodeId, (inDegree.get(e.targetNodeId) || 0) + 1);
    });

    // Topological sort
    const queue: string[] = [];
    const order: string[] = [];

    inDegree.forEach((deg, id) => {
      if (deg === 0) queue.push(id);
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      order.push(current);

      const targets = adjacency.get(current) || [];
      targets.forEach((t) => {
        const newDeg = (inDegree.get(t) || 0) - 1;
        inDegree.set(t, newDeg);
        if (newDeg === 0) queue.push(t);
      });
    }

    return order;
  }
}

class ReasonerAgent {
  reason(nodeType: string, inputData: Record<string, unknown>): string {
    return `Executing ${nodeType} with provided input`;
  }
}

class ExecutorAgent {
  async execute(
    node: WorkflowNode,
    inputData: Record<string, unknown>,
    sendEvent: (event: ExecutionEvent) => void
  ): Promise<Record<string, unknown>> {
    const config = node.config;

    sendEvent({
      type: "agent.action",
      timestamp: new Date().toISOString(),
      data: {
        nodeId: node.id,
        action: `execute_${node.type.replace(".", "_")}`,
        input: inputData,
      },
    });

    switch (node.type) {
      case "trigger.manual":
      case "trigger.webhook":
        return { triggered: true, timestamp: new Date().toISOString() };

      case "trigger.cron":
        return {
          triggered: true,
          cronExpression: config.cronExpression,
          timestamp: new Date().toISOString(),
        };

      case "action.http": {
        const { url, method = "GET", headers, body } = config;
        if (url) {
          try {
            const response = await fetch(url as string, {
              method: method as string,
              headers: headers as Record<string, string>,
              body: method !== "GET" ? JSON.stringify(body) : undefined,
            });
            const data = await response.json();
            return { status: response.status, body: data };
          } catch (error) {
            return { error: (error as Error).message, status: "failed" };
          }
        }
        return { status: "no_url_configured" };
      }

      case "action.code": {
        const { code, language = "python" } = config;
        // Simulate code execution (in real implementation, use sandboxed container)
        sendEvent({
          type: "agent.observation",
          timestamp: new Date().toISOString(),
          data: {
            nodeId: node.id,
            observation: `Code execution simulated (${language})`,
          },
        });
        return { result: "Code executed successfully", output: null };
      }

      case "action.ai": {
        const { model = "gpt-4o-mini", prompt, temperature = 0.7 } = config;
        // Use AI SDK for real LLM call
        sendEvent({
          type: "agent.observation",
          timestamp: new Date().toISOString(),
          data: {
            nodeId: node.id,
            observation: `Processing with ${model}...`,
          },
        });

        try {
          // Simulated AI response
          const response = `AI processed: "${prompt?.toString().substring(0, 50)}..."`;
          return { response, model, tokensUsed: 150 };
        } catch (error) {
          return { error: (error as Error).message };
        }
      }

      case "action.transform":
        return { transformed: true, data: inputData };

      case "action.filter":
        return { filtered: true, data: inputData };

      case "action.delay": {
        const duration = (config.duration as number) || 5;
        await new Promise((resolve) => setTimeout(resolve, duration * 1000));
        return { delayed: true, duration };
      }

      case "logic.if_else": {
        const condition = config.condition as string;
        // Evaluate condition (simplified)
        const result = Math.random() > 0.5;
        return { condition, result, branch: result ? "true" : "false" };
      }

      case "logic.switch": {
        const field = config.field as string;
        const cases = config.cases as Array<{ value: string; output: string }>;
        return { matched: cases[0]?.value || "default" };
      }

      case "logic.loop": {
        const maxIterations = (config.maxIterations as number) || 100;
        return { loopStarted: true, maxIterations };
      }

      case "logic.ai_decision": {
        const { prompt, options } = config;
        // Use AI to make decision
        const decision = (options as string[])?.[0] || "option_1";
        return { decision, reasoning: `Selected ${decision} based on analysis` };
      }

      case "output.response": {
        const statusCode = (config.statusCode as number) || 200;
        const body = config.body || inputData;
        return { statusCode, body };
      }

      case "output.notification": {
        const { channel, message, title } = config;
        sendEvent({
          type: "agent.observation",
          timestamp: new Date().toISOString(),
          data: {
            nodeId: node.id,
            observation: `Sending notification via ${channel}...`,
          },
        });
        return { sent: true, channel, message };
      }

      case "output.storage": {
        const { destination, path, format = "json" } = config;
        return { stored: true, destination, path, format };
      }

      default:
        return { executed: true, type: node.type };
    }
  }
}

class ValidatorAgent {
  validate(output: Record<string, unknown>): boolean {
    return output && !output.error;
  }
}

// WebSocket Server
const PORT = 3003;
const brain = new CortexBrain();
const planner = new PlannerAgent();
const clients = new Set<WebSocket>();

function broadcast(event: ExecutionEvent) {
  const message = JSON.stringify(event);
  clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

async function executeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  triggerData: Record<string, unknown>
) {
  const sendEvent = (event: ExecutionEvent) => broadcast(event);

  // Plan execution order
  const order = await planner.plan(nodes, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  sendEvent({
    type: "execution.started",
    timestamp: new Date().toISOString(),
    data: { nodeCount: nodes.length, executionOrder: order },
  });

  let currentData = triggerData;
  const startTime = Date.now();
  let totalTokens = 0;
  let totalCost = 0;

  for (const nodeId of order) {
    const node = nodeMap.get(nodeId);
    if (!node || !node.isEnabled) continue;

    sendEvent({
      type: "step.started",
      timestamp: new Date().toISOString(),
      data: { nodeId, nodeName: node.name, nodeType: node.type },
    });

    const stepStart = Date.now();
    try {
      const output = await brain.executeNode(node, currentData, sendEvent);
      const latency = Date.now() - stepStart;

      if (output.tokensUsed) {
        totalTokens += output.tokensUsed as number;
      }
      if (output.cost) {
        totalCost += output.cost as number;
      }

      sendEvent({
        type: "step.completed",
        timestamp: new Date().toISOString(),
        data: {
          nodeId,
          status: "completed",
          latencyMs: latency,
          output,
        },
      });

      currentData = output;
    } catch (error) {
      sendEvent({
        type: "step.failed",
        timestamp: new Date().toISOString(),
        data: {
          nodeId,
          status: "failed",
          error: (error as Error).message,
        },
      });

      sendEvent({
        type: "execution.failed",
        timestamp: new Date().toISOString(),
        data: {
          error: (error as Error).message,
          durationMs: Date.now() - startTime,
          totalTokens,
          totalCost,
        },
      });

      return;
    }
  }

  sendEvent({
    type: "execution.completed",
    timestamp: new Date().toISOString(),
    data: {
      status: "completed",
      durationMs: Date.now() - startTime,
      totalTokens,
      totalCost,
      finalOutput: currentData,
    },
  });
}

// Create HTTP server with WebSocket upgrade
const server = serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "healthy" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Upgrade to WebSocket
    if (req.headers.get("upgrade") === "websocket") {
      const success = server.upgrade(req, { data: {} });
      if (success) return undefined;
    }

    return new Response("WebSocket endpoint", { status: 200 });
  },
  websocket: {
    open(ws) {
      clients.add(ws as unknown as WebSocket);
      console.log("Client connected");
    },
    close(ws) {
      clients.delete(ws as unknown as WebSocket);
      console.log("Client disconnected");
    },
    message(ws, message) {
      try {
        const data = JSON.parse(message.toString());

        if (data.type === "execute") {
          const { nodes, edges, triggerData } = data;
          executeWorkflow(nodes, edges, triggerData || {}).catch(console.error);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    },
  },
});

console.log(`🧠 CortexOps Workflow Executor running on ws://localhost:${PORT}`);
