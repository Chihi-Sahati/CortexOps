// CortexOps - AI Engine Client
// Enhanced client with retry, circuit breaker, SSE streaming, and caching

import { db } from './db'
import { hashValue } from './crypto'

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8100'

// ==========================================
// Types
// ==========================================
export interface PlanStep {
  step_id: string
  description: string
  type: string
  dependencies: string[]
  estimated_complexity: string
  security_risk: string
  can_parallel: boolean
  config: Record<string, unknown>
}

export interface PlanResponse {
  plan_id: string
  steps: PlanStep[]
  total_steps: number
  estimated_tokens: number
  estimated_cost: number
  complexity: string
}

export interface ReasoningResult {
  thought: string
  strategy: string
  action: Record<string, unknown>
  confidence: number
  fallback_plan?: string
}

export interface ExecutionResult {
  success: boolean
  result: Record<string, unknown>
  tokens_used: number
  cost: number
  latency_ms: number
}

export interface ValidationResult {
  valid: boolean
  confidence: number
  issues: string[]
  suggestion?: string
}

export interface OrchestrationResult {
  success: boolean
  plan_id: string
  execution_id: string
  steps_executed: number
  total_tokens: number
  total_cost: number
  total_time_seconds: number
  strategies_used: string[]
  reasoning_iterations: number
  self_heal_attempts: number
  security_alerts: number
  guardrail_triggers: string[]
  confidence: number
  final_output: Record<string, unknown>
  traces: Record<string, unknown>[]
}

export interface SecurityAnalysis {
  safe: boolean
  risk_level: string
  issues: Array<{
    type: string
    severity: string
    message: string
    line?: number
  }>
  blocked_items: string[]
  suggestion?: string
  complexity_score: number
}

export interface WorkflowSuggestion {
  plan: PlanStep[]
  estimated_duration: number
  estimated_cost: number
  risk_level: string
  confidence: number
}

// ==========================================
// Circuit Breaker
// ==========================================
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private lastFailureTime: number = 0
  private readonly failureThreshold: number
  private readonly resetTimeout: number

  constructor(failureThreshold: number = 5, resetTimeout: number = 30000) {
    this.failureThreshold = failureThreshold
    this.resetTimeout = resetTimeout
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = CircuitState.HALF_OPEN
      } else {
        throw new Error('Circuit breaker is OPEN - AI Engine unavailable')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = CircuitState.CLOSED
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN
    }
  }

  getState(): CircuitState {
    return this.state
  }
}

// ==========================================
// Retry with Exponential Backoff
// ==========================================
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        const jitter = Math.random() * delay * 0.1
        await new Promise((resolve) => setTimeout(resolve, delay + jitter))
      }
    }
  }

  throw lastError
}

// ==========================================
// AI Engine Client Class
// ==========================================
export class AIEngineClient {
  private baseUrl: string
  private circuitBreaker: CircuitBreaker

  constructor(baseUrl: string = AI_ENGINE_URL) {
    this.baseUrl = baseUrl
    this.circuitBreaker = new CircuitBreaker(5, 30000)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        try {
          const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(error.error?.message || `AI Engine error: ${response.status}`)
          }

          return await response.json()
        } finally {
          clearTimeout(timeout)
        }
      }, 3, 1000)
    })
  }

  // ==========================================
  // Agent Operations
  // ==========================================
  async orchestrate(
    task: string,
    connectors: string[] = [],
    context: Record<string, unknown> = {},
    maxIterations: number = 10
  ): Promise<OrchestrationResult> {
    return this.request('POST', '/ai/agents/orchestrate', {
      task,
      connectors,
      context,
      max_iterations: maxIterations,
    })
  }

  async plan(
    task: string,
    connectors: string[] = [],
    tools: string[] = [],
    context: Record<string, unknown> = {}
  ): Promise<PlanResponse> {
    return this.request('POST', '/ai/agents/plan', {
      task,
      connectors,
      tools,
      context,
    })
  }

  async reason(
    step: PlanStep,
    context: Record<string, unknown> = {},
    errorHistory: Record<string, unknown>[] = [],
    connectors: string[] = []
  ): Promise<ReasoningResult> {
    return this.request('POST', '/ai/agents/reason', {
      step,
      context,
      error_history: errorHistory,
      connectors,
    })
  }

  async execute(
    action: Record<string, unknown>,
    strategy: string,
    timeout: number = 30
  ): Promise<ExecutionResult> {
    return this.request('POST', '/ai/agents/execute', {
      action,
      strategy,
      timeout,
    })
  }

  async validate(
    expected: Record<string, unknown>,
    actual: Record<string, unknown>,
    step: PlanStep
  ): Promise<ValidationResult> {
    return this.request('POST', '/ai/agents/validate', {
      expected,
      actual,
      step,
    })
  }

  // ==========================================
  // Natural Language with Caching
  // ==========================================
  async parseNLCommand(command: string): Promise<WorkflowSuggestion> {
    const queryHash = hashValue(command)

    // Check cache first
    const cached = await db.llmCache.findUnique({ where: { queryHash } })
    if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
      // Update hit count
      await db.llmCache.update({
        where: { id: cached.id },
        data: { hitCount: { increment: 1 } },
      })
      return JSON.parse(cached.responseText)
    }

    // Call AI Engine
    const response = await this.request<WorkflowSuggestion>('POST', '/ai/nl/parse', { command })

    // Cache response
    await db.llmCache.create({
      data: {
        queryHash,
        queryText: command,
        responseText: JSON.stringify(response),
        modelUsed: 'gpt-4o-mini',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    })

    return response
  }

  async getSuggestions(partial: string): Promise<{
    suggestions: Array<{ type: string; text: string }>
    completions: string[]
  }> {
    return this.request('POST', '/ai/nl/suggest', { partial })
  }

  // ==========================================
  // Security
  // ==========================================
  async analyzeCode(
    code: string,
    language: 'python' | 'javascript' = 'python'
  ): Promise<SecurityAnalysis> {
    return this.request('POST', '/ai/security/analyze-code', { code, language })
  }

  async checkPrompt(prompt: string): Promise<{
    safe: boolean
    injection_detected: boolean
    patterns_found: string[]
    sanitized_prompt: string
  }> {
    return this.request('POST', '/ai/security/check-prompt', { prompt })
  }

  async scanOutput(output: string, destination: string = 'external'): Promise<{
    safe: boolean
    detected_types: string[]
    masked_output: string
    classification: string
  }> {
    return this.request('POST', '/ai/security/scan-output', { output, destination })
  }

  // ==========================================
  // Self-Healing
  // ==========================================
  async diagnoseConnector(
    connectorId: string,
    connectorType: string,
    error: Record<string, unknown>
  ): Promise<{
    error_category: string
    auto_recoverable: boolean
    suggested_strategy: string
  }> {
    return this.request('POST', '/ai/connectors/diagnose', {
      connector_id: connectorId,
      connector_type: connectorType,
      error,
    })
  }

  async healConnector(
    connectorId: string,
    diagnosis: Record<string, unknown>
  ): Promise<{
    success: boolean
    strategy_used: string
    attempts: number
    fixed_config?: Record<string, unknown>
  }> {
    return this.request('POST', '/ai/connectors/heal', {
      connector_id: connectorId,
      diagnosis,
    })
  }

  // ==========================================
  // SSE Streaming
  // ==========================================
  async *streamOrchestration(
    task: string,
    connectors: string[] = [],
    context: Record<string, unknown> = {}
  ): AsyncGenerator<{ type: string; data: unknown }> {
    const response = await fetch(`${this.baseUrl}/ai/agents/orchestrate/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, connectors, context, max_iterations: 10 }),
    })

    if (!response.ok || !response.body) {
      throw new Error(`AI Engine stream error: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              yield data
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // ==========================================
  // Metrics
  // ==========================================
  async getAgentMetrics(): Promise<{
    total_invocations: number
    success_rate: number
    total_tokens: number
    total_cost: number
  }> {
    return this.request('GET', '/ai/metrics/agents')
  }

  async getCostMetrics(): Promise<{
    total_cost: number
    cost_savings: number
    cache_hit_rate: number
  }> {
    return this.request('GET', '/ai/metrics/costs')
  }

  async getSecurityMetrics(): Promise<{
    total_scans: number
    blocked_count: number
    security_score: number
  }> {
    return this.request('GET', '/ai/metrics/security')
  }

  async getSelfHealingMetrics(): Promise<{
    total_attempts: number
    successful_heals: number
    shr: number
  }> {
    return this.request('GET', '/ai/metrics/self-healing')
  }

  async healthCheck(): Promise<{
    status: string
    version: string
    services: Record<string, string>
  }> {
    return this.request('GET', '/ai/health')
  }

  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState()
  }
}

// Export singleton instance
export const aiEngine = new AIEngineClient()
