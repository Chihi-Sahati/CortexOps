// CortexOps - Node Registry
// Definitions for all available node types

import type { NodeDefinition, NodeType } from '@/types';

// ==========================================
// ⚡ Trigger Nodes (Start Workflows)
// ==========================================
const triggerNodes: NodeDefinition[] = [
  {
    type: 'trigger.webhook',
    category: 'trigger',
    name: 'Webhook',
    description: 'Trigger workflow upon receiving an HTTP request',
    icon: 'Webhook',
    color: '#3B82F6',
    configSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          title: 'HTTP Method',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
          default: 'POST',
        },
        path: {
          type: 'string',
          title: 'Endpoint Path',
          description: 'Custom path for the webhook (optional)',
        },
        authentication: {
          type: 'boolean',
          title: 'Require Authentication',
          default: false,
        },
      },
      required: ['method'],
    },
    inputs: [],
    outputs: [{ name: 'output', label: 'Payload', type: 'object', required: true }],
  },
  {
    type: 'trigger.cron',
    category: 'trigger',
    name: 'Schedule',
    description: 'Execute workflow on a schedule (cron)',
    icon: 'Clock',
    color: '#3B82F6',
    configSchema: {
      type: 'object',
      properties: {
        cronExpression: {
          type: 'string',
          title: 'Cron Expression',
          description: 'e.g., "0 9 * * *" (9 AM daily)',
        },
        timezone: {
          type: 'string',
          title: 'Timezone',
          default: 'UTC',
        },
      },
      required: ['cronExpression'],
    },
    inputs: [],
    outputs: [{ name: 'output', label: 'Trigger Event', type: 'object', required: true }],
  },
  {
    type: 'trigger.event',
    category: 'trigger',
    name: 'Event',
    description: 'Trigger workflow when a system event occurs',
    icon: 'Zap',
    color: '#3B82F6',
    configSchema: {
      type: 'object',
      properties: {
        eventType: {
          type: 'string',
          title: 'Event Type',
        },
        source: {
          type: 'string',
          title: 'Source',
        },
      },
      required: ['eventType'],
    },
    inputs: [],
    outputs: [{ name: 'output', label: 'Event Data', type: 'object', required: true }],
  },
  {
    type: 'trigger.manual',
    category: 'trigger',
    name: 'Manual',
    description: 'Manually start workflow execution',
    icon: 'Play',
    color: '#3B82F6',
    configSchema: {
      type: 'object',
      properties: {},
    },
    inputs: [],
    outputs: [{ name: 'output', label: 'Trigger Info', type: 'object', required: true }],
  },
];

// ==========================================
// 🛠️ Action Nodes (Perform Work)
// ==========================================
const actionNodes: NodeDefinition[] = [
  {
    type: 'action.http',
    category: 'action',
    name: 'HTTP Request',
    description: 'Call an external API or service',
    icon: 'Globe',
    color: '#22C55E',
    configSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          title: 'Method',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          default: 'GET',
        },
        url: {
          type: 'string',
          title: 'URL',
        },
        headers: {
          type: 'object',
          title: 'Headers',
        },
        body: {
          type: 'object',
          title: 'Body',
        },
        authentication: {
          type: 'string',
          title: 'Auth Type',
          enum: ['none', 'bearer', 'basic', 'api_key'],
          default: 'none',
        },
        credentialRef: {
          type: 'string',
          title: 'Credentials',
        },
        timeout: {
          type: 'number',
          title: 'Timeout (ms)',
          default: 30000,
        },
      },
      required: ['method', 'url'],
    },
    inputs: [{ name: 'input', label: 'Input', type: 'any' }],
    outputs: [{ name: 'output', label: 'Response', type: 'object', required: true }],
  },
  {
    type: 'action.code',
    category: 'action',
    name: 'Code',
    description: 'Execute custom Python/JS code (sandboxed)',
    icon: 'Code',
    color: '#22C55E',
    configSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          title: 'Language',
          enum: ['python', 'javascript'],
          default: 'python',
        },
        code: {
          type: 'string',
          title: 'Source Code',
        },
        timeout: {
          type: 'number',
          title: 'Timeout (s)',
          default: 30,
        },
      },
      required: ['language', 'code'],
    },
    inputs: [{ name: 'input', label: 'Input Data', type: 'any' }],
    outputs: [{ name: 'output', label: 'Result', type: 'any', required: true }],
  },
  {
    type: 'action.ai',
    category: 'action', // Fixed: was action in registry, keeping for logic but naming it 'AI'
    name: 'AI Hub',
    description: 'Process and reason using generic LLMs',
    icon: 'Brain',
    color: '#8B5CF6',
    configSchema: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          title: 'Model',
          enum: ['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet'],
          default: 'gpt-4o-mini',
        },
        prompt: {
          type: 'string',
          title: 'Instructions',
        },
        temperature: {
          type: 'number',
          title: 'Temp',
          default: 0.7,
        },
        maxTokens: {
          type: 'number',
          title: 'Limit',
          default: 2000,
        },
      },
      required: ['model', 'prompt'],
    },
    inputs: [{ name: 'input', label: 'Data', type: 'any' }],
    outputs: [{ name: 'output', label: 'Generated', type: 'string', required: true }],
  },
  {
    type: 'action.transform',
    category: 'action',
    name: 'Transform',
    description: 'Map and transform data structures',
    icon: 'Shuffle',
    color: '#22C55E',
    configSchema: {
      type: 'object',
      properties: {
        transformations: {
          type: 'array',
          title: 'Rules',
        },
        expression: {
          type: 'string',
          title: 'JSONata/Expression',
        },
      },
    },
    inputs: [{ name: 'input', label: 'Raw', type: 'any' }],
    outputs: [{ name: 'output', label: 'Transformed', type: 'any', required: true }],
  },
  {
    type: 'action.filter',
    category: 'action',
    name: 'Filter',
    description: 'Selectively pass data through',
    icon: 'Filter',
    color: '#22C55E',
    configSchema: {
      type: 'object',
      properties: {
        conditions: {
          type: 'array',
          title: 'Criteria',
        },
        mode: {
          type: 'string',
          title: 'Mode',
          enum: ['all', 'any'],
          default: 'all',
        },
      },
    },
    inputs: [{ name: 'input', label: 'Collection', type: 'array' }],
    outputs: [{ name: 'output', label: 'Filtered', type: 'array', required: true }],
  },
];

// ==========================================
// 🔀 Logic Nodes (Branching & Flows)
// ==========================================
const logicNodes: NodeDefinition[] = [
  {
    type: 'logic.if_else',
    category: 'logic',
    name: 'Conditional',
    description: 'Split paths based on a boolean check',
    icon: 'GitBranch',
    color: '#F59E0B',
    configSchema: {
      type: 'object',
      properties: {
        condition: {
          type: 'string',
          title: 'Expression',
        },
      },
      required: ['condition'],
    },
    inputs: [{ name: 'input', label: 'Data', type: 'any' }],
    outputs: [
      { name: 'true', label: 'True', type: 'any' },
      { name: 'false', label: 'False', type: 'any' },
    ],
  },
  {
    type: 'logic.switch',
    category: 'logic',
    name: 'Router',
    description: 'Dynamic routing for variable inputs',
    icon: 'Split',
    color: '#F59E0B',
    configSchema: {
      type: 'object',
      properties: {
        field: {
          type: 'string',
          title: 'Key to Check',
        },
        cases: {
          type: 'array',
          title: 'Routes',
        },
      },
      required: ['field', 'cases'],
    },
    inputs: [{ name: 'input', label: 'Data', type: 'any' }],
    outputs: [
      { name: 'case-default', label: 'Default', type: 'any' },
    ],
  },
  {
    type: 'logic.loop',
    category: 'logic',
    name: 'Loop',
    description: 'Iterate over collections',
    icon: 'Repeat',
    color: '#F59E0B',
    configSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          title: 'Strategy',
          enum: ['forEach', 'while'],
          default: 'forEach',
        },
      },
    },
    inputs: [{ name: 'input', label: 'Collection', type: 'array' }],
    outputs: [
      { name: 'item', label: 'Item', type: 'any' },
      { name: 'done', label: 'Finished', type: 'array' },
    ],
  },
];

// ==========================================
// 📥 Output Nodes (Final Actions)
// ==========================================
const outputNodes: NodeDefinition[] = [
  {
    type: 'output.response',
    category: 'output',
    name: 'Response',
    description: 'Complete webhook lifecycle',
    icon: 'Send',
    color: '#06B6D4',
    configSchema: {
      type: 'object',
      properties: {
        statusCode: {
          type: 'number',
          title: 'Code',
          default: 200,
        },
        body: {
          type: 'object',
          title: 'Payload',
        },
      },
    },
    inputs: [{ name: 'input', label: 'Final Data', type: 'any' }],
    outputs: [],
  },
  {
    type: 'output.notification',
    category: 'output',
    name: 'Notify',
    description: 'Alert user via configured channels',
    icon: 'Bell',
    color: '#06B6D4',
    configSchema: {
      type: 'object',
      properties: {
        channel: {
          type: 'string',
          title: 'Target',
          enum: ['slack', 'discord', 'email'],
        },
        message: {
          type: 'string',
          title: 'Text',
        },
      },
      required: ['channel', 'message'],
    },
    inputs: [{ name: 'input', label: 'Context', type: 'any' }],
    outputs: [],
  },
];

// ==========================================
// 🧠 Native AI Agents (Cortex Core)
// ==========================================
const aiAgentNodes: NodeDefinition[] = [
  {
    type: 'logic.ai_decision',
    category: 'logic',
    name: 'AI Agent (Router)',
    description: 'Autonomous path selection based on reason',
    icon: 'BrainCircuit',
    color: '#8B5CF6',
    configSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string', title: 'Objective' },
        options: { type: 'array', title: 'Paths' }
      },
      required: ['goal'],
    },
    inputs: [{ name: 'input', label: 'State', type: 'any' }],
    outputs: [
      { name: 'decision', label: 'Action', type: 'string' },
      { name: 'rationale', label: 'Logic', type: 'string' },
    ],
  },
];

// ==========================================
// Export All
// ==========================================
export const nodeRegistry: NodeDefinition[] = [
  ...triggerNodes,
  ...actionNodes,
  ...logicNodes,
  ...outputNodes,
  ...aiAgentNodes,
];

export function getNodeDefinition(type: NodeType): NodeDefinition | undefined {
  return nodeRegistry.find((node) => node.type === type);
}

export function getNodesByCategory(category: string): NodeDefinition[] {
  return nodeRegistry.filter((node) => node.category === category);
}

export function getNodeColor(type: NodeType): string {
  const node = getNodeDefinition(type);
  return node?.color || '#6B7280';
}

export function getNodeIcon(type: NodeType): string {
  const node = getNodeDefinition(type);
  return node?.icon || 'Box';
}

export const nodeCategories = [
  { id: 'trigger', name: 'Start', color: '#3B82F6', icon: 'Power' },
  { id: 'action', name: 'Work', color: '#22C55E', icon: 'Hammer' },
  { id: 'logic', name: 'Flow', color: '#F59E0B', icon: 'GitBranch' },
  { id: 'output', name: 'Finish', color: '#06B6D4', icon: 'CheckCircle' },
];

