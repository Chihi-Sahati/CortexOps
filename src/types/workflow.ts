// Core domain types for CortexOps workflows (strongly-typed to avoid 'any')

// Node categories within a workflow
export type NodeCategory = 'trigger' | 'action' | 'logic' | 'output'

// A generic node type string (e.g. 'http.request', 'code.execute', etc.)
export type NodeType = string

// Data payload for a node
export interface WorkflowNodeData {
  label: string
  type: NodeType
  config: Record<string, unknown>
  description?: string
  enabled: boolean
  [key: string]: unknown
}

// Node definition used by React Flow
export interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: WorkflowNodeData
}

// Edge between two nodes
export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  label?: string
  type?: 'default' | 'success' | 'failure' | 'condition'
}

// Execution step within a workflow execution
export interface ExecutionStep {
  id: string
  nodeId: string
  nodeName: string
  nodeType: NodeType
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  error?: { code: string; message: string; details?: string }
  startedAt?: string
  completedAt?: string
  duration?: number
}

// Execution instance
export interface Execution {
  id: string
  workflowId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  steps: ExecutionStep[]
  triggeredBy: string
  input?: Record<string, unknown>
  output?: Record<string, unknown>
  startedAt: string
  completedAt?: string
  duration?: number
  error?: string
}

// API response wrappers
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string; details?: unknown }
  meta?: { page?: number; limit?: number; total?: number; nextCursor?: string }
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: { page: number; limit: number; total: number; nextCursor?: string; hasMore: boolean }
}
