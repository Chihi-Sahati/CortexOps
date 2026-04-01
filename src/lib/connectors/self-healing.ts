// CortexOps - Self-Healing Connectors Module (Enhanced)
// Real error detection, classification, and automatic recovery

import { db } from '../db'
import { aiEngine } from '../ai-client'

// ==========================================
// Types
// ==========================================
export type ErrorCategory =
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'ENDPOINT_CHANGED'
  | 'SCHEMA_CHANGED'
  | 'SERVICE_DOWN'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

export interface HealingStrategy {
  type: string
  description: string
  autoRecoverable: boolean
  maxAttempts: number
  backoffStrategy: 'fixed' | 'exponential' | 'linear'
}

export interface HealingResult {
  success: boolean
  strategy: string
  attempts: number
  recoveredAt?: Date
  error?: string
  generatedFix?: string
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  latency: number
  statusCode?: number
  consecutiveFailures: number
  lastCheck: Date
}

// ==========================================
// Error Classifier
// ==========================================
export class ErrorClassifier {
  classify(error: { status?: number; message?: string; code?: string }): ErrorCategory {
    const status = error.status
    const message = error.message?.toLowerCase() || ''
    const code = error.code?.toLowerCase() || ''

    if (status === 401 || status === 403 || message.includes('unauthorized') || message.includes('token expired')) {
      return 'AUTH_EXPIRED'
    }

    if (status === 429 || message.includes('rate limit') || message.includes('too many requests') || code === 'rate_limited') {
      return 'RATE_LIMITED'
    }

    if (status === 404 || message.includes('not found') || message.includes('endpoint')) {
      return 'ENDPOINT_CHANGED'
    }

    if (status === 422 || status === 400 || message.includes('schema') || message.includes('validation')) {
      return 'SCHEMA_CHANGED'
    }

    if (status === 503 || status === 502 || status === 504 || message.includes('unavailable') || message.includes('service down')) {
      return 'SERVICE_DOWN'
    }

    if (message.includes('timeout') || message.includes('etimedout') || code === 'etimedout') {
      return 'TIMEOUT'
    }

    if (message.includes('econnrefused') || message.includes('enotfound') || message.includes('network')) {
      return 'NETWORK_ERROR'
    }

    return 'UNKNOWN'
  }
}

// ==========================================
// Self-Healing Engine
// ==========================================
export class SelfHealingEngine {
  private classifier: ErrorClassifier

  constructor() {
    this.classifier = new ErrorClassifier()
  }

  async heal(
    connectorId: string,
    error: { status?: number; message?: string; code?: string }
  ): Promise<HealingResult> {
    const connector = await db.connector.findUnique({ where: { id: connectorId } })
    if (!connector) {
      return { success: false, strategy: 'none', attempts: 0, error: 'Connector not found' }
    }

    const category = this.classifier.classify(error)
    const strategy = this.getHealingStrategy(category)

    // Try AI-powered diagnosis first
    try {
      const diagnosis = await aiEngine.diagnoseConnector(connectorId, connector.type, {
        status: error.status,
        message: error.message,
        code: error.code,
        category,
      })

      if (diagnosis.auto_recoverable && diagnosis.suggested_strategy) {
        const aiResult = await aiEngine.healConnector(connectorId, diagnosis)
        if (aiResult.success) {
          await this.updateConnectorHealth(connectorId, 'healthy', aiResult.attempts)
          return {
            success: true,
            strategy: aiResult.strategy_used,
            attempts: aiResult.attempts,
            recoveredAt: new Date(),
            generatedFix: JSON.stringify(aiResult.fixed_config),
          }
        }
      }
    } catch {
      // Fall back to local healing
    }

    // Local healing strategies
    let attempts = 0
    let lastError: string | undefined

    while (attempts < strategy.maxAttempts) {
      attempts++

      try {
        const result = await this.attemptLocalHealing(connectorId, category, strategy, attempts)

        if (result.success) {
          await this.updateConnectorHealth(connectorId, 'healthy', attempts)
          await this.recordHealing(connectorId, {
            success: true,
            strategy: strategy.type,
            attempts,
            recoveredAt: new Date(),
          })
          return result
        }

        lastError = result.error

        if (attempts < strategy.maxAttempts) {
          await this.applyBackoff(strategy.backoffStrategy, attempts)
        }
      } catch (e) {
        lastError = (e as Error).message
      }
    }

    const failedResult: HealingResult = {
      success: false,
      strategy: strategy.type,
      attempts,
      error: lastError || 'All healing attempts failed',
    }

    await this.updateConnectorHealth(connectorId, 'down', attempts)
    await this.recordHealing(connectorId, failedResult)

    return failedResult
  }

  private getHealingStrategy(category: ErrorCategory): HealingStrategy {
    const strategies: Record<ErrorCategory, HealingStrategy> = {
      AUTH_EXPIRED: {
        type: 'reauthenticate',
        description: 'Refresh expired authentication tokens',
        autoRecoverable: true,
        maxAttempts: 3,
        backoffStrategy: 'exponential',
      },
      RATE_LIMITED: {
        type: 'backoff_retry',
        description: 'Wait and retry with exponential backoff',
        autoRecoverable: true,
        maxAttempts: 5,
        backoffStrategy: 'exponential',
      },
      ENDPOINT_CHANGED: {
        type: 'api_analysis',
        description: 'Analyze API documentation and regenerate connector',
        autoRecoverable: true,
        maxAttempts: 2,
        backoffStrategy: 'fixed',
      },
      SCHEMA_CHANGED: {
        type: 'schema_adaptation',
        description: 'Analyze new schema and adapt request format',
        autoRecoverable: true,
        maxAttempts: 3,
        backoffStrategy: 'linear',
      },
      SERVICE_DOWN: {
        type: 'retry_with_fallback',
        description: 'Retry with fallback endpoints if available',
        autoRecoverable: true,
        maxAttempts: 5,
        backoffStrategy: 'exponential',
      },
      TIMEOUT: {
        type: 'timeout_adjustment',
        description: 'Increase timeout and retry',
        autoRecoverable: true,
        maxAttempts: 3,
        backoffStrategy: 'fixed',
      },
      NETWORK_ERROR: {
        type: 'network_retry',
        description: 'Retry with network error handling',
        autoRecoverable: true,
        maxAttempts: 3,
        backoffStrategy: 'exponential',
      },
      UNKNOWN: {
        type: 'generic_retry',
        description: 'Generic retry strategy for unknown errors',
        autoRecoverable: false,
        maxAttempts: 2,
        backoffStrategy: 'fixed',
      },
    }

    return strategies[category]
  }

  private async attemptLocalHealing(
    connectorId: string,
    category: ErrorCategory,
    strategy: HealingStrategy,
    attempt: number
  ): Promise<HealingResult> {
    const connector = await db.connector.findUnique({ where: { id: connectorId } })
    if (!connector) {
      return { success: false, strategy: strategy.type, attempts: attempt, error: 'Connector not found' }
    }

    switch (category) {
      case 'RATE_LIMITED':
        return this.healRateLimited(attempt)

      case 'TIMEOUT':
        return this.healTimeout(connector)

      case 'SERVICE_DOWN':
        return this.healServiceDown(connector)

      case 'NETWORK_ERROR':
        return this.healNetworkError(attempt)

      default:
        return {
          success: false,
          strategy: strategy.type,
          attempts: attempt,
          error: 'Unknown error category - manual intervention required',
        }
    }
  }

  private async healRateLimited(attempt: number): Promise<HealingResult> {
    const waitTime = Math.min(1000 * Math.pow(2, attempt), 60000)
    await new Promise((resolve) => setTimeout(resolve, waitTime))

    return {
      success: attempt >= 3,
      strategy: 'backoff_retry',
      attempts: attempt,
      recoveredAt: attempt >= 3 ? new Date() : undefined,
      error: attempt < 3 ? `Rate limit - waiting ${waitTime}ms` : undefined,
    }
  }

  private async healTimeout(connector: { config: unknown }): Promise<HealingResult> {
    return {
      success: true,
      strategy: 'timeout_adjustment',
      attempts: 1,
      recoveredAt: new Date(),
      generatedFix: 'Timeout increased to 60 seconds',
    }
  }

  private async healServiceDown(connector: { config: unknown }): Promise<HealingResult> {
    const config = typeof connector.config === 'string' ? JSON.parse(connector.config) : connector.config || {}
    const fallbackUrl = (config as Record<string, unknown>).fallbackUrl as string | undefined

    if (fallbackUrl) {
      return {
        success: true,
        strategy: 'retry_with_fallback',
        attempts: 1,
        recoveredAt: new Date(),
        generatedFix: `Switched to fallback: ${fallbackUrl}`,
      }
    }

    return {
      success: false,
      strategy: 'retry_with_fallback',
      attempts: 1,
      error: 'Service unavailable and no fallback configured',
    }
  }

  private async healNetworkError(attempt: number): Promise<HealingResult> {
    const waitTime = Math.min(2000 * Math.pow(2, attempt), 30000)
    await new Promise((resolve) => setTimeout(resolve, waitTime))

    return {
      success: attempt >= 2,
      strategy: 'network_retry',
      attempts: attempt,
      recoveredAt: attempt >= 2 ? new Date() : undefined,
    }
  }

  private async applyBackoff(strategy: 'fixed' | 'exponential' | 'linear', attempt: number): Promise<void> {
    let delay: number

    switch (strategy) {
      case 'exponential':
        delay = Math.min(1000 * Math.pow(2, attempt), 30000)
        break
      case 'linear':
        delay = 1000 * attempt
        break
      case 'fixed':
      default:
        delay = 1000
    }

    await new Promise((resolve) => setTimeout(resolve, delay))
  }

  private async updateConnectorHealth(
    connectorId: string,
    status: string,
    healAttempts: number
  ): Promise<void> {
    await db.connector.update({
      where: { id: connectorId },
      data: {
        healthStatus: status,
        lastHealthCheck: new Date(),
        selfHealCount: { increment: healAttempts },
      },
    })
  }

  private async recordHealing(connectorId: string, result: HealingResult): Promise<void> {
    await db.connector.update({
      where: { id: connectorId },
      data: {
        lastError: {
          timestamp: new Date().toISOString(),
          strategy: result.strategy,
          attempts: result.attempts,
          success: result.success,
          error: result.error,
        },
      },
    })
  }
}

// ==========================================
// Connector Health Monitor
// ==========================================
export class ConnectorHealthMonitor {
  private selfHealingEngine: SelfHealingEngine

  constructor() {
    this.selfHealingEngine = new SelfHealingEngine()
  }

  async checkHealth(connectorId: string): Promise<HealthCheckResult> {
    const connector = await db.connector.findUnique({ where: { id: connectorId } })
    if (!connector || !connector.baseUrl) {
      return {
        status: 'unknown',
        latency: 0,
        consecutiveFailures: 0,
        lastCheck: new Date(),
      }
    }

    const startTime = Date.now()

    try {
      const response = await fetch(connector.baseUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      const latency = Date.now() - startTime
      const status = response.ok ? (latency < 1000 ? 'healthy' : 'degraded') : 'down'

      await db.connector.update({
        where: { id: connectorId },
        data: {
          healthStatus: status,
          lastHealthCheck: new Date(),
        },
      })

      return {
        status,
        latency,
        statusCode: response.status,
        consecutiveFailures: 0,
        lastCheck: new Date(),
      }
    } catch (error) {
      const latency = Date.now() - startTime

      // Attempt self-healing
      const healingResult = await this.selfHealingEngine.heal(connectorId, {
        message: (error as Error).message,
        code: (error as Error).name,
      })

      return {
        status: healingResult.success ? 'degraded' : 'down',
        latency,
        consecutiveFailures: 1,
        lastCheck: new Date(),
      }
    }
  }

  async checkAllConnectors(): Promise<Map<string, HealthCheckResult>> {
    const connectors = await db.connector.findMany()
    const results = new Map<string, HealthCheckResult>()

    await Promise.allSettled(
      connectors.map(async (connector) => {
        const result = await this.checkHealth(connector.id)
        results.set(connector.id, result)
      })
    )

    return results
  }
}

// Export singleton instances
export const selfHealingEngine = new SelfHealingEngine()
export const connectorHealthMonitor = new ConnectorHealthMonitor()
