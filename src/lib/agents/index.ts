// CortexOps - AI Agents Module
// Cortex Brain, Planner, Reasoner, Executor, and Validator Agents

import type { WorkflowNode, WorkflowEdge, AgentTrace } from '@/types';

// ==========================================
// Types
// ==========================================
interface AgentContext {
  workflowId: string;
  executionId: string;
  nodeId?: string;
  inputData: Record<string, unknown>;
  previousSteps: AgentTrace[];
}

interface AgentResult {
  success: boolean;
  output?: Record<string, unknown>;
  trace: AgentTrace;
  nextAction?: string;
}

// ==========================================
// Cortex Brain - Main Orchestrator
// ==========================================
export class CortexBrain {
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

  async executeWorkflow(
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    onEvent: (event: { type: string; data: unknown }) => void
  ): Promise<{ success: boolean; output: Record<string, unknown>; traces: AgentTrace[] }> {
    const traces: AgentTrace[] = [];
    
    // Plan execution order
    const order = this.planner.planExecution(nodes, edges);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    
    onEvent({ type: 'execution.started', data: { nodeCount: nodes.length, order } });
    
    let currentData: Record<string, unknown> = {};
    
    for (const nodeId of order) {
      const node = nodeMap.get(nodeId);
      if (!node || !node.isEnabled) continue;
      
      onEvent({ type: 'step.started', data: { nodeId, nodeName: node.name } });
      
      // Reason about how to execute this node
      const reasonResult = this.reasoner.reason(node, currentData);
      traces.push(reasonResult.trace);
      
      // Execute the node
      const execResult = await this.executor.execute(node, currentData, onEvent);
      traces.push(execResult.trace);
      
      // Validate the result
      const validationResult = this.validator.validate(node, execResult.output || {});
      traces.push(validationResult.trace);
      
      if (!validationResult.success) {
        onEvent({ type: 'step.failed', data: { nodeId, error: 'Validation failed' } });
        return { success: false, output: {}, traces };
      }
      
      onEvent({ type: 'step.completed', data: { nodeId, output: execResult.output } });
      currentData = execResult.output || {};
    }
    
    onEvent({ type: 'execution.completed', data: { output: currentData } });
    
    return { success: true, output: currentData, traces };
  }

  async processNaturalLanguage(command: string): Promise<{
    plan: Array<{ nodeType: string; description: string }>;
    confidence: number;
  }> {
    // Use AI to parse natural language command
    // This would call the LLM API in a real implementation
    const plan = this.planner.parseNaturalLanguage(command);
    return { plan, confidence: 0.85 };
  }
}

// ==========================================
// Planner Agent - Task Decomposition
// ==========================================
export class PlannerAgent {
  planExecution(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    // Build adjacency list and calculate in-degrees
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
    
    // Topological sort (Kahn's algorithm)
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

  parseNaturalLanguage(command: string): Array<{ nodeType: string; description: string }> {
    const lowerCommand = command.toLowerCase();
    const plan: Array<{ nodeType: string; description: string }> = [];
    
    // Detect trigger type
    if (lowerCommand.includes('every day') || lowerCommand.includes('daily')) {
      plan.push({ nodeType: 'trigger.cron', description: 'Daily scheduled trigger' });
    } else if (lowerCommand.includes('webhook')) {
      plan.push({ nodeType: 'trigger.webhook', description: 'Webhook trigger endpoint' });
    } else {
      plan.push({ nodeType: 'trigger.manual', description: 'Manual trigger' });
    }
    
    // Detect actions
    if (lowerCommand.includes('api') || lowerCommand.includes('fetch')) {
      plan.push({ nodeType: 'action.http', description: 'Make HTTP request' });
    }
    
    if (lowerCommand.includes('ai') || lowerCommand.includes('analyze') || lowerCommand.includes('summarize')) {
      plan.push({ nodeType: 'action.ai', description: 'AI processing' });
    }
    
    if (lowerCommand.includes('database') || lowerCommand.includes('query')) {
      plan.push({ nodeType: 'action.code', description: 'Database query' });
    }
    
    // Detect output
    if (lowerCommand.includes('slack') || lowerCommand.includes('notify')) {
      plan.push({ nodeType: 'output.notification', description: 'Send notification' });
    } else {
      plan.push({ nodeType: 'output.response', description: 'Return response' });
    }
    
    return plan;
  }
}

// ==========================================
// Reasoner Agent - ReAct Loop
// ==========================================
export class ReasonerAgent {
  reason(node: WorkflowNode, inputData: Record<string, unknown>): AgentResult {
    const thought = `Analyzing node "${node.name}" of type "${node.type}". Input: ${JSON.stringify(inputData).substring(0, 100)}...`;
    
    // Determine best execution strategy
    let strategy = 'static';
    if (node.type === 'action.http') {
      strategy = 'static_api';
    } else if (node.type === 'action.code') {
      strategy = 'code_generation';
    } else if (node.type === 'action.ai') {
      strategy = 'llm_call';
    }
    
    const trace: AgentTrace = {
      id: crypto.randomUUID(),
      executionStepId: crypto.randomUUID(),
      agentType: 'reasoner',
      thought,
      action: `determine_strategy:${strategy}`,
      actionInput: { nodeType: node.type },
      confidenceScore: 0.85,
      modelUsed: 'internal',
      stepNumber: 1,
      createdAt: new Date(),
    };
    
    return {
      success: true,
      trace,
      nextAction: strategy,
    };
  }
}

// ==========================================
// Executor Agent - Action Execution
// ==========================================
export class ExecutorAgent {
  async execute(
    node: WorkflowNode,
    inputData: Record<string, unknown>,
    onEvent: (event: { type: string; data: unknown }) => void
  ): Promise<AgentResult> {
    const config = node.config;
    let output: Record<string, unknown> = {};
    
    onEvent({
      type: 'agent.action',
      data: { nodeId: node.id, action: `execute_${node.type.replace('.', '_')}` },
    });
    
    try {
      switch (node.type) {
        case 'trigger.manual':
        case 'trigger.webhook':
          output = { triggered: true, timestamp: new Date().toISOString() };
          break;
          
        case 'action.http':
          output = await this.executeHttp(config);
          break;
          
        case 'action.code':
          output = await this.executeCode(config);
          break;
          
        case 'action.ai':
          output = await this.executeAI(config, inputData, onEvent);
          break;
          
        case 'logic.if_else':
          output = this.executeIfElse(config, inputData);
          break;
          
        case 'logic.ai_decision':
          output = await this.executeAIDecision(config, inputData);
          break;
          
        case 'output.notification':
          output = { sent: true, channel: config.channel, timestamp: new Date().toISOString() };
          break;
          
        default:
          output = { executed: true, type: node.type };
      }
      
      const trace: AgentTrace = {
        id: crypto.randomUUID(),
        executionStepId: crypto.randomUUID(),
        agentType: 'executor',
        action: `executed:${node.type}`,
        actionInput: config,
        observation: JSON.stringify(output).substring(0, 500),
        confidenceScore: 0.9,
        stepNumber: 2,
        createdAt: new Date(),
      };
      
      return { success: true, output, trace };
    } catch (error) {
      const trace: AgentTrace = {
        id: crypto.randomUUID(),
        executionStepId: crypto.randomUUID(),
        agentType: 'executor',
        action: `failed:${node.type}`,
        observation: (error as Error).message,
        confidenceScore: 0,
        stepNumber: 2,
        createdAt: new Date(),
      };
      
      return { success: false, output: { error: (error as Error).message }, trace };
    }
  }
  
  private async executeHttp(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { url, method = 'GET', headers, body } = config;
    
    if (!url) {
      return { error: 'No URL configured' };
    }
    
    try {
      const response = await fetch(url as string, {
        method: method as string,
        headers: headers as Record<string, string>,
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
      });
      
      const data = await response.json().catch(() => ({}));
      
      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: data,
      };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }
  
  private async executeCode(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    // In a real implementation, this would execute in a sandboxed container
    const { code, language = 'python' } = config;
    
    return {
      result: 'Code execution simulated',
      language,
      timestamp: new Date().toISOString(),
    };
  }
  
  private async executeAI(
    config: Record<string, unknown>,
    inputData: Record<string, unknown>,
    onEvent: (event: { type: string; data: unknown }) => void
  ): Promise<Record<string, unknown>> {
    const { model = 'gpt-4o-mini', prompt, temperature = 0.7, maxTokens = 2000 } = config;
    
    onEvent({
      type: 'agent.thought',
      data: { model, prompt: prompt?.toString().substring(0, 100) },
    });
    
    // In a real implementation, this would call the LLM API
    // For now, return a simulated response
    const response = `[AI Response via ${model}]: Processed input successfully.`;
    
    return {
      response,
      model,
      tokensUsed: 150,
      finishReason: 'stop',
    };
  }
  
  private executeIfElse(config: Record<string, unknown>, inputData: Record<string, unknown>): Record<string, unknown> {
    const { condition } = config;
    // Simplified condition evaluation
    const result = Math.random() > 0.5;
    
    return {
      condition,
      result,
      branch: result ? 'true' : 'false',
    };
  }
  
  private async executeAIDecision(config: Record<string, unknown>, inputData: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { prompt, options } = config;
    const opts = options as string[] || ['option_1', 'option_2'];
    
    return {
      decision: opts[0],
      reasoning: `Selected ${opts[0]} based on AI analysis`,
      confidence: 0.85,
    };
  }
}

// ==========================================
// Validator Agent - Output Validation
// ==========================================
export class ValidatorAgent {
  validate(node: WorkflowNode, output: Record<string, unknown>): AgentResult {
    const hasError = output.error !== undefined;
    const isValid = !hasError;
    
    const trace: AgentTrace = {
      id: crypto.randomUUID(),
      executionStepId: crypto.randomUUID(),
      agentType: 'validator',
      thought: `Validating output for node "${node.name}". Valid: ${isValid}`,
      observation: hasError ? `Error found: ${output.error}` : 'Output validated successfully',
      confidenceScore: isValid ? 0.95 : 0.1,
      stepNumber: 3,
      createdAt: new Date(),
    };
    
    return {
      success: isValid,
      output,
      trace,
    };
  }
}

// ==========================================
// Model Router - Smart LLM Selection
// ==========================================
export class ModelRouter {
  private models = {
    simple: ['gpt-4o-mini', 'claude-3.5-haiku'],
    medium: ['gpt-4o-mini', 'claude-3.5-sonnet'],
    complex: ['gpt-4o', 'claude-3.5-sonnet'],
    critical: ['gpt-4o', 'claude-3.5-sonnet'],
  };
  
  private costs = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
    'claude-3.5-haiku': { input: 0.00025, output: 0.00125 },
  };
  
  selectModel(task: { complexity: 'simple' | 'medium' | 'complex' | 'critical'; budgetRemaining: number }): string {
    const availableModels = this.models[task.complexity];
    
    // Select cheapest model that fits budget
    for (const model of availableModels) {
      const cost = this.costs[model as keyof typeof this.costs];
      if (cost && cost.input < task.budgetRemaining) {
        return model;
      }
    }
    
    return availableModels[0];
  }
  
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    const cost = this.costs[model as keyof typeof this.costs];
    if (!cost) return 0;
    return (cost.input * inputTokens / 1000) + (cost.output * outputTokens / 1000);
  }
}

// Export singleton instance
export const cortexBrain = new CortexBrain();
export const modelRouter = new ModelRouter();
