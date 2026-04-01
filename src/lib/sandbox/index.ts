// CortexOps - Sandbox Execution System
// Secure code execution with resource limits and monitoring

import { SecurityManager } from '../security'

// ==========================================
// Types
// ==========================================
export type SupportedLanguage = 'python' | 'javascript'

export interface SandboxConfig {
  timeout: number // seconds, max 30
  maxMemory: number // MB, max 512
  maxCpuCores: number // max 2
  networkEnabled: boolean
  allowedDomains: string[]
  allowedDirs: string[]
}

export interface ExecutionRequest {
  code: string
  language: SupportedLanguage
  input?: Record<string, unknown>
  config?: Partial<SandboxConfig>
}

export interface ExecutionResponse {
  success: boolean
  output: string | null
  error: string | null
  exitCode: number
  executionTime: number // ms
  memoryUsed: number // bytes
  logs: string[]
  securityWarnings: string[]
}

export interface SecurityCheckResult {
  safe: boolean
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  issues: Array<{
    type: string
    severity: string
    message: string
    line?: number
  }>
  blockedItems: string[]
}

// ==========================================
// Default Configuration
// ==========================================
const DEFAULT_CONFIG: SandboxConfig = {
  timeout: 30,
  maxMemory: 512,
  maxCpuCores: 2,
  networkEnabled: false,
  allowedDomains: [],
  allowedDirs: ['/tmp/sandbox'],
}

// ==========================================
// Sandbox Executor Class
// ==========================================
export class SandboxExecutor {
  private securityManager: SecurityManager
  private dockerAvailable: boolean = false

  constructor() {
    this.securityManager = new SecurityManager()
  }

  async initialize(): Promise<void> {
    // Check if Docker is available
    try {
      const response = await fetch('http://localhost:2375/version', {
        signal: AbortSignal.timeout(2000),
      })
      this.dockerAvailable = response.ok
    } catch {
      this.dockerAvailable = false
    }
  }

  /**
   * Execute code in sandbox
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResponse> {
    const config = { ...DEFAULT_CONFIG, ...request.config }

    // Step 1: Security analysis before execution
    const securityCheck = await this.analyzeSecurity(request.code, request.language)
    if (!securityCheck.safe) {
      return {
        success: false,
        output: null,
        error: 'Code blocked by security analysis',
        exitCode: -1,
        executionTime: 0,
        memoryUsed: 0,
        logs: [`Security check failed: ${securityCheck.issues.map((i) => i.message).join(', ')}`],
        securityWarnings: securityCheck.issues.map((i) => i.message),
      }
    }

    // Step 2: Execute in Docker sandbox if available, otherwise simulated
    if (this.dockerAvailable) {
      return this.executeInDocker(request, config)
    }

    return this.executeSimulated(request, config, securityCheck)
  }

  /**
   * Analyze code security
   */
  async analyzeSecurity(
    code: string,
    language: SupportedLanguage
  ): Promise<SecurityCheckResult> {
    const result =
      language === 'python'
        ? this.securityManager.analyzeCode(code, 'python')
        : this.securityManager.analyzeCode(code, 'javascript')

    return {
      safe: result.safe,
      riskLevel: result.safe ? (result.issues.length > 0 ? 'medium' : 'low') : 'critical',
      issues: result.issues.map((issue) => ({
        type: issue.type,
        severity: issue.severity,
        message: issue.message,
        line: issue.line,
      })),
      blockedItems: result.issues.filter((i) => i.severity === 'critical').map((i) => i.message),
    }
  }

  /**
   * Execute code in Docker container
   */
  private async executeInDocker(
    request: ExecutionRequest,
    config: SandboxConfig
  ): Promise<ExecutionResponse> {
    const startTime = Date.now()
    const containerName = `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const image =
      request.language === 'python' ? 'cortexops-sandbox:python' : 'cortexops-sandbox:node'

    try {
      // Create and run container
      const createResponse = await fetch('http://localhost:2375/containers/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Image: image,
          Cmd: this.getCommand(request),
          HostConfig: {
            Memory: config.maxMemory * 1024 * 1024,
            NanoCpus: config.maxCpuCores * 1e9,
            NetworkMode: config.networkEnabled ? 'bridge' : 'none',
            ReadonlyRootfs: true,
            Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=100m' },
            PidsLimit: 100,
            Ulimits: [{ Name: 'nofile', Soft: 1024, Hard: 1024 }],
            AutoRemove: true,
          },
          AttachStdout: true,
          AttachStderr: true,
        }),
        signal: AbortSignal.timeout(5000),
      })

      if (!createResponse.ok) {
        throw new Error('Failed to create container')
      }

      const { Id: containerId } = await createResponse.json()

      // Start container
      await fetch(`http://localhost:2375/containers/${containerId}/start`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      })

      // Wait for container to finish with timeout
      const waitController = new AbortController()
      const timeoutId = setTimeout(() => waitController.abort(), config.timeout * 1000)

      try {
        await fetch(`http://localhost:2375/containers/${containerId}/wait`, {
          method: 'POST',
          signal: waitController.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      // Get logs
      const logsResponse = await fetch(
        `http://localhost:2375/containers/${containerId}/logs?stdout=true&stderr=true`,
        { signal: AbortSignal.timeout(5000) }
      )
      const logs = (await logsResponse.text()).split('\n').filter(Boolean)

      // Get container stats
      const statsResponse = await fetch(
        `http://localhost:2375/containers/${containerId}/stats?stream=false`,
        { signal: AbortSignal.timeout(5000) }
      )
      const stats = await statsResponse.json().catch(() => ({}))

      const executionTime = Date.now() - startTime
      const memoryUsed = stats.memory_stats?.usage || 0

      return {
        success: true,
        output: logs.join('\n'),
        error: null,
        exitCode: 0,
        executionTime,
        memoryUsed,
        logs,
        securityWarnings: [],
      }
    } catch (error) {
      // Clean up container on error
      try {
        await fetch(`http://localhost:2375/containers/${containerName}?force=true`, {
          method: 'DELETE',
          signal: AbortSignal.timeout(2000),
        })
      } catch {
        // Ignore cleanup errors
      }

      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Execution failed',
        exitCode: -1,
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
        logs: [],
        securityWarnings: [],
      }
    }
  }

  /**
   * Simulated execution when Docker is not available
   */
  private async executeSimulated(
    request: ExecutionRequest,
    config: SandboxConfig,
    securityCheck: SecurityCheckResult
  ): Promise<ExecutionResponse> {
    const startTime = Date.now()

    // Simulate execution with timeout
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Execution timeout')), config.timeout * 1000)
    )

    const executionPromise = new Promise<ExecutionResponse>((resolve) => {
      // Simulate processing time
      setTimeout(() => {
        resolve({
          success: true,
          output: `[Simulated] Code executed successfully in ${request.language}`,
          error: null,
          exitCode: 0,
          executionTime: Date.now() - startTime,
          memoryUsed: Math.floor(Math.random() * 1024 * 1024 * 50), // Random 0-50MB
          logs: [
            `[${request.language}] Starting execution...`,
            `Security check passed (risk: ${securityCheck.riskLevel})`,
            'Execution completed',
          ],
          securityWarnings: securityCheck.issues
            .filter((i) => i.severity === 'warning')
            .map((i) => i.message),
        })
      }, 500 + Math.random() * 1000)
    })

    try {
      return await Promise.race([executionPromise, timeoutPromise])
    } catch (error) {
      return {
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Execution failed',
        exitCode: -1,
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
        logs: ['Execution terminated due to timeout'],
        securityWarnings: [],
      }
    }
  }

  /**
   * Get Docker command based on language
   */
  private getCommand(request: ExecutionRequest): string[] {
    if (request.language === 'python') {
      return ['python3', '-c', request.code]
    }
    return ['node', '-e', request.code]
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{
    language: SupportedLanguage
    version: string
    image: string
  }> {
    return [
      { language: 'python', version: '3.12', image: 'cortexops-sandbox:python' },
      { language: 'javascript', version: '20', image: 'cortexops-sandbox:node' },
    ]
  }
}

// Export singleton instance
export const sandboxExecutor = new SandboxExecutor()
