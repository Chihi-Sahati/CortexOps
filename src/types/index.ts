// CortexOps - Secure Agentic Workflow Automation Engine
// Type Definitions

// ==========================================
// User Types
// ==========================================
export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ==========================================
// Workflow Types
// ==========================================
export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'archived';
export type TriggerType = 'manual' | 'webhook' | 'cron' | 'event';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: WorkflowStatus;
  isTemplate: boolean;
  triggerType?: TriggerType;
  cronExpression?: string;
  config: Record<string, unknown>;
  tags: string[];
  version: number;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowNode {
  id: string;
  workflowId: string;
  type: NodeType;
  name: string;
  config: NodeConfig;
  positionX: number;
  positionY: number;
  isEnabled: boolean;
  createdAt: Date;
}

export interface WorkflowEdge {
  id: string;
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  condition?: EdgeCondition;
  label?: string;
  edgeType: EdgeType;
  createdAt: Date;
}

export type NodeType =
  // Triggers
  | 'trigger.webhook'
  | 'trigger.cron'
  | 'trigger.event'
  | 'trigger.email'
  | 'trigger.manual'
  // Actions
  | 'action.http'
  | 'action.code'
  | 'action.ai'
  | 'action.transform'
  | 'action.filter'
  | 'action.merge'
  | 'action.split'
  | 'action.delay'
  // Logic
  | 'logic.if_else'
  | 'logic.switch'
  | 'logic.loop'
  | 'logic.ai_decision'
  // Output
  | 'output.response'
  | 'output.notification'
  | 'output.storage';

export type EdgeType = 'default' | 'conditional_true' | 'conditional_false' | 'error';

export interface NodeConfig {
  parameters?: Record<string, unknown>;
  credentialsRef?: string;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  [key: string]: unknown;
}

export interface EdgeCondition {
  type: 'if_true' | 'if_false' | 'always' | 'error' | 'custom';
  expression?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay: number;
}

// ==========================================
// Execution Types
// ==========================================
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused_hitl';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  triggerType?: TriggerType;
  triggerData?: Record<string, unknown>;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  errorMessage?: string;
  totalTokens: number;
  totalCost: number;
  metadata: Record<string, unknown>;
  steps: ExecutionStep[];
  createdAt: Date;
}

export interface ExecutionStep {
  id: string;
  executionId: string;
  nodeId?: string;
  status: StepStatus;
  inputData?: Record<string, unknown>;
  outputData?: Record<string, unknown>;
  errorDetails?: ErrorDetails;
  strategyUsed?: StrategyType;
  attemptNumber: number;
  tokensUsed: number;
  cost: number;
  latencyMs?: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  agentTraces: AgentTrace[];
}

export type StrategyType = 'static_api' | 'self_healing' | 'code_generation' | 'fallback';

export interface ErrorDetails {
  message: string;
  code?: string;
  stack?: string;
  details?: Record<string, unknown>;
}

// ==========================================
// Agent Types
// ==========================================
export type AgentType = 'planner' | 'reasoner' | 'executor' | 'validator';

export interface AgentTrace {
  id: string;
  executionStepId: string;
  agentType: AgentType;
  thought?: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  observation?: string;
  confidenceScore?: number;
  modelUsed?: string;
  tokensUsed?: number;
  stepNumber?: number;
  createdAt: Date;
}

// ==========================================
// Connector Types
// ==========================================
export type ConnectorType = 'static' | 'dynamic' | 'self_healed';
export type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface Connector {
  id: string;
  name: string;
  type: ConnectorType;
  serviceName?: string;
  baseUrl?: string;
  authType?: string;
  config: Record<string, unknown>;
  healthStatus: HealthStatus;
  lastHealthCheck?: Date;
  selfHealCount: number;
  generatedCode?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// Credential Types
// ==========================================
export type CredentialType = 'api_key' | 'oauth2' | 'basic_auth' | 'bearer_token' | 'custom';

export interface Credential {
  id: string;
  ownerId: string;
  name: string;
  type: CredentialType;
  metadata: Record<string, unknown>;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// Node Registry Types
// ==========================================
export interface NodeDefinition {
  type: NodeType;
  category: NodeCategory;
  name: string;
  description: string;
  icon: string;
  color: string;
  configSchema: ConfigSchema;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
}

export type NodeCategory = 'trigger' | 'action' | 'logic' | 'output';

export interface ConfigSchema {
  type: 'object';
  properties: Record<string, SchemaProperty>;
  required?: string[];
}

export interface SchemaProperty {
  type: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  [key: string]: unknown;
}

export interface PortDefinition {
  name: string;
  label: string;
  type: 'any' | 'object' | 'array' | 'string' | 'number' | 'boolean';
  required?: boolean;
}

// ==========================================
// WebSocket Event Types
// ==========================================
export type WebSocketEventType =
  | 'execution.started'
  | 'execution.completed'
  | 'execution.failed'
  | 'step.started'
  | 'step.completed'
  | 'step.failed'
  | 'agent.thought'
  | 'agent.action'
  | 'agent.observation'
  | 'self_heal.started'
  | 'self_heal.completed'
  | 'hitl.required';

export interface WebSocketEvent {
  type: WebSocketEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

// ==========================================
// Natural Language Command Types
// ==========================================
export interface NLCommand {
  command: string;
  context?: Record<string, unknown>;
}

export interface WorkflowSuggestion {
  plan: PlanStep[];
  estimatedDuration: number;
  estimatedCost: number;
  riskAssessment: RiskLevel;
}

export interface PlanStep {
  order: number;
  nodeType: NodeType;
  description: string;
  dependencies: string[];
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ==========================================
// Audit Log Types
// ==========================================
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  riskLevel: RiskLevel;
  createdAt: Date;
}

// ==========================================
// API Response Types
// ==========================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==========================================
// React Flow Types
// ==========================================
import type { Node, Edge } from '@xyflow/react';

export interface WorkflowNodeData {
  label: string;
  type: NodeType;
  config: Record<string, unknown>;
  description?: string;
  enabled: boolean;
  [key: string]: unknown;
}

export type FlowNode = Node<WorkflowNodeData, NodeType>;
export type FlowEdge = Edge;
