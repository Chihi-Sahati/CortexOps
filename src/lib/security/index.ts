// CortexOps - Security Layer Module
// Comprehensive security for workflow execution

// ==========================================
// Types
// ==========================================
interface SecurityCheckResult {
  passed: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  warnings: string[];
  blocked: string[];
}

interface CodeAnalysisResult {
  safe: boolean;
  issues: Array<{
    type: 'dangerous_import' | 'dangerous_function' | 'sensitive_data' | 'resource_abuse';
    severity: 'warning' | 'error' | 'critical';
    message: string;
    line?: number;
  }>;
}

// ==========================================
// Static Code Analyzer
// ==========================================
export class StaticAnalyzer {
  private blockedImports = [
    'os', 'subprocess', 'sys', 'shutil', 'ctypes',
    'socket', 'http.server', 'multiprocessing', 'threading',
    'importlib', '__import__', 'builtins', 'eval', 'exec',
  ];
  
  private blockedFunctions = [
    'eval', 'exec', 'compile', '__import__', 'globals', 'locals',
    'getattr', 'setattr', 'delattr', 'open', 'input', 'breakpoint',
    'memoryview', 'type', 'vars', 'dir',
  ];
  
  private sensitivePatterns = [
    /(api[_-]?key|secret|password|token|credential)/i,
    /(aws|azure|gcp)[_-]?(key|secret|token)/i,
    /\b[A-Za-z0-9]{32,}\b/, // Potential API keys
    /sk-[A-Za-z0-9]{48}/, // OpenAI keys
    /sk-ant-[A-Za-z0-9]{80}/, // Anthropic keys
  ];
  
  analyzePythonCode(code: string): CodeAnalysisResult {
    const issues: CodeAnalysisResult['issues'] = [];
    
    // Check for blocked imports
    const importRegex = /(?:import|from)\s+(\w+)/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      if (this.blockedImports.includes(match[1])) {
        issues.push({
          type: 'dangerous_import',
          severity: 'critical',
          message: `Blocked import: ${match[1]}`,
        });
      }
    }
    
    // Check for blocked functions
    for (const func of this.blockedFunctions) {
      const funcRegex = new RegExp(`\\b${func}\\s*\\(`, 'g');
      if (funcRegex.test(code)) {
        issues.push({
          type: 'dangerous_function',
          severity: 'critical',
          message: `Blocked function: ${func}()`,
        });
      }
    }
    
    // Check for sensitive data patterns
    for (const pattern of this.sensitivePatterns) {
      if (pattern.test(code)) {
        issues.push({
          type: 'sensitive_data',
          severity: 'warning',
          message: 'Potential sensitive data detected',
        });
      }
    }
    
    // Check for infinite loops (basic heuristic)
    if (code.includes('while True:') && !code.includes('break')) {
      issues.push({
        type: 'resource_abuse',
        severity: 'warning',
        message: 'Potential infinite loop detected',
      });
    }
    
    return {
      safe: !issues.some((i) => i.severity === 'critical'),
      issues,
    };
  }
  
  analyzeJavaScriptCode(code: string): CodeAnalysisResult {
    const issues: CodeAnalysisResult['issues'] = [];
    
    // Check for dangerous functions
    const dangerousFunctions = ['eval', 'Function', 'setTimeout', 'setInterval', 'exec'];
    for (const func of dangerousFunctions) {
      if (new RegExp(`\\b${func}\\s*\\(`).test(code)) {
        issues.push({
          type: 'dangerous_function',
          severity: 'critical',
          message: `Blocked function: ${func}()`,
        });
      }
    }
    
    // Check for dangerous globals
    const dangerousGlobals = ['process', 'require', 'global', 'module', 'exports'];
    for (const global of dangerousGlobals) {
      if (new RegExp(`\\b${global}\\b`).test(code)) {
        issues.push({
          type: 'dangerous_function',
          severity: 'critical',
          message: `Blocked global: ${global}`,
        });
      }
    }
    
    return {
      safe: !issues.some((i) => i.severity === 'critical'),
      issues,
    };
  }
}

// ==========================================
// Prompt Injection Detector
// ==========================================
export class PromptInjectionDetector {
  private injectionPatterns = [
    /ignore\s+(all\s+)?previous\s+instructions?/i,
    /system:\s*you\s+are/i,
    /disregard\s+(all\s+)?(previous\s+)?(instructions?|rules)/i,
    /override\s+(all\s+)?(previous\s+)?(instructions?|rules)/i,
    /pretend\s+(to\s+be|you\s+are)/i,
    /act\s+as\s+(if|a|an)/i,
    /<\|.*?\|>/,
    /\[SYSTEM\]/i,
    /\[INST\]/i,
    /###\s*instruction/i,
    /```system/i,
  ];
  
  detect(input: string): { isInjection: boolean; patterns: string[] } {
    const detectedPatterns: string[] = [];
    
    for (const pattern of this.injectionPatterns) {
      if (pattern.test(input)) {
        detectedPatterns.push(pattern.source);
      }
    }
    
    return {
      isInjection: detectedPatterns.length > 0,
      patterns: detectedPatterns,
    };
  }
  
  sanitize(input: string): string {
    // Remove detected injection patterns
    let sanitized = input;
    
    for (const pattern of this.injectionPatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    // Escape special characters
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    return sanitized;
  }
}

// ==========================================
// Data Loss Prevention (DLP)
// ==========================================
export class DLPEngine {
  private patterns = {
    email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    phone: /\b(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
    ssn: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
    creditCard: /\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/g,
    apiKey: /\b[A-Za-z0-9]{32,}\b/g,
  };
  
  detect(data: string): { type: string; matches: string[] }[] {
    const results: { type: string; matches: string[] }[] = [];
    
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = data.match(pattern);
      if (matches && matches.length > 0) {
        results.push({ type, matches: [...new Set(matches)] });
      }
    }
    
    return results;
  }
  
  mask(data: string, maskChar = '*'): string {
    let masked = data;
    
    // Mask emails
    masked = masked.replace(this.patterns.email, (match) => {
      const [local, domain] = match.split('@');
      return `${local.charAt(0)}${maskChar.repeat(local.length - 2)}${local.charAt(local.length - 1)}@${domain}`;
    });
    
    // Mask phone numbers
    masked = masked.replace(this.patterns.phone, (match) => {
      const digits = match.replace(/\D/g, '');
      return `${maskChar.repeat(digits.length - 4)}${digits.slice(-4)}`;
    });
    
    // Mask SSN
    masked = masked.replace(this.patterns.ssn, `${maskChar.repeat(3)}-${maskChar.repeat(2)}-${maskChar.repeat(4)}`);
    
    // Mask credit cards
    masked = masked.replace(this.patterns.creditCard, (match) => {
      const last4 = match.replace(/\D/g, '').slice(-4);
      return `${maskChar.repeat(12)}-${last4}`;
    });
    
    // Mask API keys
    masked = masked.replace(this.patterns.apiKey, (match) => {
      if (match.length < 8) return match;
      return `${match.slice(0, 4)}${maskChar.repeat(match.length - 8)}${match.slice(-4)}`;
    });
    
    return masked;
  }
  
  classify(data: string): 'public' | 'internal' | 'confidential' | 'restricted' {
    const detected = this.detect(data);
    
    if (detected.some((d) => ['ssn', 'creditCard'].includes(d.type))) {
      return 'restricted';
    }
    
    if (detected.some((d) => ['email', 'phone', 'apiKey'].includes(d.type))) {
      return 'confidential';
    }
    
    return 'public';
  }
}

// ==========================================
// Execution Guardrails
// ==========================================
export class Guardrails {
  private limits = {
    maxIterations: 10,
    maxExecutionTime: 300, // seconds
    maxTokens: 50000,
    maxCost: 1.00, // USD
    maxCodeGenAttempts: 3,
    maxSelfHealAttempts: 3,
    maxFileSize: 50, // MB
    maxApiCallsPerMinute: 100,
  };
  
  private state = {
    iterations: 0,
    startTime: Date.now(),
    tokens: 0,
    cost: 0,
    apiCalls: [] as number[],
  };
  
  checkIteration(): { allowed: boolean; reason?: string } {
    this.state.iterations++;
    
    if (this.state.iterations > this.limits.maxIterations) {
      return { allowed: false, reason: `Max iterations (${this.limits.maxIterations}) exceeded` };
    }
    
    return { allowed: true };
  }
  
  checkExecutionTime(): { allowed: boolean; reason?: string } {
    const elapsed = (Date.now() - this.state.startTime) / 1000;
    
    if (elapsed > this.limits.maxExecutionTime) {
      return { allowed: false, reason: `Max execution time (${this.limits.maxExecutionTime}s) exceeded` };
    }
    
    return { allowed: true };
  }
  
  checkTokens(tokens: number): { allowed: boolean; reason?: string } {
    this.state.tokens += tokens;
    
    if (this.state.tokens > this.limits.maxTokens) {
      return { allowed: false, reason: `Max tokens (${this.limits.maxTokens}) exceeded` };
    }
    
    return { allowed: true };
  }
  
  checkCost(cost: number): { allowed: boolean; reason?: string } {
    this.state.cost += cost;
    
    if (this.state.cost > this.limits.maxCost) {
      return { allowed: false, reason: `Max cost ($${this.limits.maxCost}) exceeded` };
    }
    
    return { allowed: true };
  }
  
  checkApiRate(): { allowed: boolean; reason?: string; waitTime?: number } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old calls
    this.state.apiCalls = this.state.apiCalls.filter((t) => t > oneMinuteAgo);
    
    if (this.state.apiCalls.length >= this.limits.maxApiCallsPerMinute) {
      const oldestCall = Math.min(...this.state.apiCalls);
      const waitTime = oldestCall + 60000 - now;
      return { allowed: false, reason: 'Rate limit exceeded', waitTime };
    }
    
    this.state.apiCalls.push(now);
    return { allowed: true };
  }
  
  checkStagnation(states: string[]): { stagnant: boolean; count: number } {
    const lastStates = states.slice(-3);
    const uniqueStates = new Set(lastStates);
    
    if (lastStates.length === 3 && uniqueStates.size === 1) {
      return { stagnant: true, count: 3 };
    }
    
    return { stagnant: false, count: lastStates.length };
  }
  
  shouldPauseForHumanReview(riskScore: number): boolean {
    return riskScore >= 0.7;
  }
  
  reset(): void {
    this.state = {
      iterations: 0,
      startTime: Date.now(),
      tokens: 0,
      cost: 0,
      apiCalls: [],
    };
  }
  
  getState() {
    return {
      ...this.state,
      elapsedSeconds: (Date.now() - this.state.startTime) / 1000,
    };
  }
}

// ==========================================
// Security Manager
// ==========================================
export class SecurityManager {
  private staticAnalyzer: StaticAnalyzer;
  private injectionDetector: PromptInjectionDetector;
  private dlpEngine: DLPEngine;
  private guardrails: Guardrails;
  
  constructor() {
    this.staticAnalyzer = new StaticAnalyzer();
    this.injectionDetector = new PromptInjectionDetector();
    this.dlpEngine = new DLPEngine();
    this.guardrails = new Guardrails();
  }
  
  analyzeCode(code: string, language: 'python' | 'javascript'): CodeAnalysisResult {
    if (language === 'python') {
      return this.staticAnalyzer.analyzePythonCode(code);
    }
    return this.staticAnalyzer.analyzeJavaScriptCode(code);
  }
  
  checkPromptInjection(prompt: string): { isInjection: boolean; patterns: string[]; sanitized: string } {
    const result = this.injectionDetector.detect(prompt);
    return {
      isInjection: result.isInjection,
      patterns: result.patterns,
      sanitized: this.injectionDetector.sanitize(prompt),
    };
  }
  
  checkDataLeak(data: string): { detected: { type: string; matches: string[] }[]; classification: string } {
    const detected = this.dlpEngine.detect(data);
    const classification = this.dlpEngine.classify(data);
    
    return { detected, classification };
  }
  
  maskSensitiveData(data: string): string {
    return this.dlpEngine.mask(data);
  }
  
  getGuardrails(): Guardrails {
    return this.guardrails;
  }
  
  performSecurityCheck(context: {
    code?: string;
    language?: 'python' | 'javascript';
    prompt?: string;
    output?: string;
  }): SecurityCheckResult {
    const warnings: string[] = [];
    const blocked: string[] = [];
    let riskLevel: SecurityCheckResult['riskLevel'] = 'low';
    
    // Check code
    if (context.code && context.language) {
      const codeResult = this.analyzeCode(context.code, context.language);
      
      if (!codeResult.safe) {
        blocked.push(...codeResult.issues.filter((i) => i.severity === 'critical').map((i) => i.message));
        riskLevel = 'critical';
      }
      
      warnings.push(...codeResult.issues.filter((i) => i.severity === 'warning').map((i) => i.message));
    }
    
    // Check prompt for injection
    if (context.prompt) {
      const injectionResult = this.checkPromptInjection(context.prompt);
      
      if (injectionResult.isInjection) {
        warnings.push('Potential prompt injection detected');
        riskLevel = riskLevel === 'critical' ? 'critical' : 'high';
      }
    }
    
    // Check output for sensitive data
    if (context.output) {
      const leakResult = this.checkDataLeak(context.output);
      
      if (leakResult.detected.length > 0) {
        warnings.push(`Sensitive data detected: ${leakResult.detected.map((d) => d.type).join(', ')}`);
        
        if (leakResult.classification === 'restricted') {
          riskLevel = 'critical';
        } else if (leakResult.classification === 'confidential' && riskLevel !== 'critical') {
          riskLevel = 'high';
        }
      }
    }
    
    return {
      passed: blocked.length === 0,
      riskLevel,
      warnings,
      blocked,
    };
  }
}

// Export singleton instance
export const securityManager = new SecurityManager();
