// CortexOps - Workflow Templates
// Pre-built workflow templates for quick start

import type { NodeType } from '@/types'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: string
  tags: string[]
  nodes: Array<{
    id: string
    type: NodeType
    name: string
    config: Record<string, unknown>
    positionX: number
    positionY: number
  }>
  edges: Array<{
    sourceNodeId: string
    targetNodeId: string
    edgeType: string
  }>
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'daily-report',
    name: 'Daily Report Generator',
    description: 'Fetch data daily, analyze with AI, and send report to Slack',
    category: 'automation',
    icon: 'BarChart3',
    tags: ['report', 'daily', 'slack', 'ai'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger.cron',
        name: 'Daily Trigger',
        config: { cronExpression: '0 9 * * *', timezone: 'UTC' },
        positionX: 250,
        positionY: 50,
      },
      {
        id: 'http-1',
        type: 'action.http',
        name: 'Fetch Data',
        config: { method: 'GET', url: 'https://api.example.com/data' },
        positionX: 250,
        positionY: 150,
      },
      {
        id: 'ai-1',
        type: 'action.ai',
        name: 'Analyze Data',
        config: { model: 'gpt-4o-mini', prompt: 'Summarize the data and provide key insights' },
        positionX: 250,
        positionY: 250,
      },
      {
        id: 'notify-1',
        type: 'output.notification',
        name: 'Send to Slack',
        config: { channel: 'slack', message: '{{ai-1.response}}' },
        positionX: 250,
        positionY: 350,
      },
    ],
    edges: [
      { sourceNodeId: 'trigger-1', targetNodeId: 'http-1', edgeType: 'default' },
      { sourceNodeId: 'http-1', targetNodeId: 'ai-1', edgeType: 'default' },
      { sourceNodeId: 'ai-1', targetNodeId: 'notify-1', edgeType: 'default' },
    ],
  },
  {
    id: 'webhook-handler',
    name: 'Webhook Handler',
    description: 'Receive webhook, process data, and return response',
    category: 'integration',
    icon: 'Webhook',
    tags: ['webhook', 'api', 'integration'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger.webhook',
        name: 'Webhook Trigger',
        config: { method: 'POST', path: '/webhook/data' },
        positionX: 250,
        positionY: 50,
      },
      {
        id: 'code-1',
        type: 'action.code',
        name: 'Process Data',
        config: { language: 'python', code: '# Process incoming data\nresult = {"processed": True}' },
        positionX: 250,
        positionY: 150,
      },
      {
        id: 'response-1',
        type: 'output.response',
        name: 'Return Response',
        config: { statusCode: 200 },
        positionX: 250,
        positionY: 250,
      },
    ],
    edges: [
      { sourceNodeId: 'trigger-1', targetNodeId: 'code-1', edgeType: 'default' },
      { sourceNodeId: 'code-1', targetNodeId: 'response-1', edgeType: 'default' },
    ],
  },
  {
    id: 'data-pipeline',
    name: 'Data Pipeline',
    description: 'Fetch, filter, transform, and store data',
    category: 'data',
    icon: 'Database',
    tags: ['data', 'etl', 'pipeline'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger.manual',
        name: 'Manual Trigger',
        config: {},
        positionX: 250,
        positionY: 50,
      },
      {
        id: 'http-1',
        type: 'action.http',
        name: 'Fetch Source Data',
        config: { method: 'GET', url: '' },
        positionX: 250,
        positionY: 150,
      },
      {
        id: 'filter-1',
        type: 'action.filter',
        name: 'Filter Records',
        config: { conditions: [], mode: 'all' },
        positionX: 250,
        positionY: 250,
      },
      {
        id: 'transform-1',
        type: 'action.transform',
        name: 'Transform Data',
        config: { expression: '' },
        positionX: 250,
        positionY: 350,
      },
      {
        id: 'storage-1',
        type: 'output.storage',
        name: 'Store Results',
        config: { destination: 'database', path: 'processed_data' },
        positionX: 250,
        positionY: 450,
      },
    ],
    edges: [
      { sourceNodeId: 'trigger-1', targetNodeId: 'http-1', edgeType: 'default' },
      { sourceNodeId: 'http-1', targetNodeId: 'filter-1', edgeType: 'default' },
      { sourceNodeId: 'filter-1', targetNodeId: 'transform-1', edgeType: 'default' },
      { sourceNodeId: 'transform-1', targetNodeId: 'storage-1', edgeType: 'default' },
    ],
  },
  {
    id: 'conditional-workflow',
    name: 'Conditional Workflow',
    description: 'Execute different paths based on conditions',
    category: 'logic',
    icon: 'GitBranch',
    tags: ['conditional', 'branching', 'logic'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger.manual',
        name: 'Manual Trigger',
        config: {},
        positionX: 250,
        positionY: 50,
      },
      {
        id: 'http-1',
        type: 'action.http',
        name: 'Check Status',
        config: { method: 'GET', url: '' },
        positionX: 250,
        positionY: 150,
      },
      {
        id: 'if-1',
        type: 'logic.if_else',
        name: 'Check Condition',
        config: { condition: 'status == 200' },
        positionX: 250,
        positionY: 250,
      },
      {
        id: 'ai-1',
        type: 'action.ai',
        name: 'Process Success',
        config: { model: 'gpt-4o-mini', prompt: 'Process successful response' },
        positionX: 100,
        positionY: 350,
      },
      {
        id: 'notify-1',
        type: 'output.notification',
        name: 'Notify Error',
        config: { channel: 'slack', message: 'Status check failed' },
        positionX: 400,
        positionY: 350,
      },
    ],
    edges: [
      { sourceNodeId: 'trigger-1', targetNodeId: 'http-1', edgeType: 'default' },
      { sourceNodeId: 'http-1', targetNodeId: 'if-1', edgeType: 'default' },
      { sourceNodeId: 'if-1', targetNodeId: 'ai-1', edgeType: 'conditional_true' },
      { sourceNodeId: 'if-1', targetNodeId: 'notify-1', edgeType: 'conditional_false' },
    ],
  },
  {
    id: 'ai-content-generator',
    name: 'AI Content Generator',
    description: 'Generate content using AI and save to storage',
    category: 'ai',
    icon: 'Brain',
    tags: ['ai', 'content', 'generation'],
    nodes: [
      {
        id: 'trigger-1',
        type: 'trigger.manual',
        name: 'Manual Trigger',
        config: {},
        positionX: 250,
        positionY: 50,
      },
      {
        id: 'ai-1',
        type: 'action.ai',
        name: 'Generate Content',
        config: {
          model: 'gpt-4o',
          prompt: 'Write a professional blog post about the given topic',
          temperature: 0.7,
          maxTokens: 2000,
        },
        positionX: 250,
        positionY: 150,
      },
      {
        id: 'storage-1',
        type: 'output.storage',
        name: 'Save Content',
        config: { destination: 'database', path: 'generated_content' },
        positionX: 250,
        positionY: 250,
      },
    ],
    edges: [
      { sourceNodeId: 'trigger-1', targetNodeId: 'ai-1', edgeType: 'default' },
      { sourceNodeId: 'ai-1', targetNodeId: 'storage-1', edgeType: 'default' },
    ],
  },
]

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((t) => t.id === id)
}

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return workflowTemplates.filter((t) => t.category === category)
}

export function getTemplatesByTag(tag: string): WorkflowTemplate[] {
  return workflowTemplates.filter((t) => t.tags.includes(tag))
}

export const templateCategories = [
  { id: 'automation', name: 'Automation', icon: 'Zap' },
  { id: 'integration', name: 'Integration', icon: 'Plug' },
  { id: 'data', name: 'Data Processing', icon: 'Database' },
  { id: 'logic', name: 'Logic & Control', icon: 'GitBranch' },
  { id: 'ai', name: 'AI & ML', icon: 'Brain' },
]
