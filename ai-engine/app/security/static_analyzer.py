"""
CortexOps Static Code Analyzer

Performs static analysis (SAST) on generated code before execution.

Mathematical Model - Attack Surface Metric:
    ASM(W) = Σ_{v ∈ V} [α·ExtAPI(v) + β·CodeGen(v) + γ·DataAccess(v)]

Residual Risk:
    RR(W) = ASM(W) × (1 - MitigationCoverage) / SecurityControls

Code Security Score:
    CodeScore(g) = α·Exec(g) + β·Correct(g) + (1-α-β)·Secure(g)

Where:
    Exec(g) ∈ {0, 1}              (executed without errors?)
    Correct(g) = |TestsPassed| / |TotalTests|
    Secure(g) = 1 - |Vulnerabilities| / |LOC|
"""

import ast
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Severity(str, Enum):
    """Severity levels for security issues."""
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class SecurityIssue:
    """A security issue found in code."""
    type: str
    severity: Severity
    message: str
    line: int | None = None
    suggestion: str | None = None


@dataclass
class AnalysisResult:
    """Result of static code analysis."""
    safe: bool
    risk_level: str  # "safe" | "warning" | "dangerous"
    issues: list[SecurityIssue] = field(default_factory=list)
    blocked_items: list[str] = field(default_factory=list)
    suggestion: str | None = None
    complexity_score: int = 0


class StaticAnalyzer:
    """
    Static code analyzer for Python and JavaScript.
    
    Checks for:
    - Dangerous imports (os, subprocess, sys, etc.)
    - Dangerous functions (eval, exec, compile, etc.)
    - Sensitive data patterns
    - Resource abuse indicators
    """
    
    # ═══════════════════════════════════════════════════════════
    # Blocked Imports - Cannot be imported in sandboxed code
    # ═══════════════════════════════════════════════════════════
    BLOCKED_IMPORTS = [
        'os', 'subprocess', 'sys', 'shutil', 'ctypes',
        'socket', 'http.server', 'multiprocessing', 'threading',
        'importlib', 'pickle', 'marshal', 'shelve',
        'telnetlib', 'ftplib', 'poplib', 'imaplib',
        'smtplib', 'nntplib', 'xmlrpc', 'pwd',
        'spwd', 'grp', 'crypt', 'pty', 'fcntl',
        'pipes', 'posix', 'posixpath', 'signal',
    ]
    
    # ═══════════════════════════════════════════════════════════
    # Blocked Functions - Cannot be called in sandboxed code
    # ═══════════════════════════════════════════════════════════
    BLOCKED_FUNCTIONS = [
        'eval', 'exec', 'compile', '__import__',
        'globals', 'locals', 'getattr', 'setattr',
        'delattr', 'breakpoint', 'exit', 'quit',
        'open', 'input', 'memoryview', 'type',
        'vars', 'dir', 'help', 'license',
        'credits', 'copyright',
    ]
    
    # ═══════════════════════════════════════════════════════════
    # Blocked Patterns - Regex patterns for dangerous code
    # ═══════════════════════════════════════════════════════════
    BLOCKED_PATTERNS = [
        (r'__\w+__', 'Dunder method access'),
        (r'open\s*\(', 'File system access'),
        (r'\.system\s*\(', 'OS system call'),
        (r'Popen', 'Subprocess execution'),
        (r'\.env', 'Environment variable access'),
        (r'PRIVATE.*KEY', 'Private key exposure'),
        (r'password\s*=', 'Password assignment'),
        (r'secret\s*=', 'Secret assignment'),
        (r'api[_-]?key\s*=', 'API key assignment'),
        (r'token\s*=', 'Token assignment'),
        (r'while\s+True\s*:', 'Potential infinite loop'),
        (r'for\s+.*\s+in\s+range\s*\(\s*10\s*\*\s*\*', 'Large loop range'),
    ]
    
    def analyze_python(self, code: str) -> AnalysisResult:
        """
        Analyze Python code for security issues.
        
        Args:
            code: Python code to analyze
            
        Returns:
            AnalysisResult with safe status, issues, and blocked items
        """
        issues: list[SecurityIssue] = []
        blocked_items: list[str] = []
        
        # Parse AST
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return AnalysisResult(
                safe=False,
                risk_level="dangerous",
                issues=[SecurityIssue(
                    type="syntax_error",
                    severity=Severity.ERROR,
                    message=f"Syntax error: {e}",
                    line=e.lineno,
                )],
                blocked_items=[],
                suggestion="Fix syntax errors before execution",
            )
        
        # Check imports
        import_issues, import_blocked = self._check_imports(tree)
        issues.extend(import_issues)
        blocked_items.extend(import_blocked)
        
        # Check function calls
        func_issues, func_blocked = self._check_function_calls(tree)
        issues.extend(func_issues)
        blocked_items.extend(func_blocked)
        
        # Check patterns
        pattern_issues = self._check_patterns(code)
        issues.extend(pattern_issues)
        
        # Calculate complexity
        complexity = self._calculate_complexity(tree)
        
        # Determine safety
        critical_issues = [i for i in issues if i.severity == Severity.CRITICAL]
        warning_issues = [i for i in issues if i.severity == Severity.WARNING]
        
        if critical_issues:
            safe = False
            risk_level = "dangerous"
        elif warning_issues:
            safe = True  # Warnings don't block execution
            risk_level = "warning"
        else:
            safe = True
            risk_level = "safe"
        
        suggestion = None
        if not safe:
            suggestion = self._generate_suggestion(issues)
        
        return AnalysisResult(
            safe=safe,
            risk_level=risk_level,
            issues=issues,
            blocked_items=blocked_items,
            suggestion=suggestion,
            complexity_score=complexity,
        )
    
    def analyze_javascript(self, code: str) -> AnalysisResult:
        """
        Analyze JavaScript code for security issues.
        
        Args:
            code: JavaScript code to analyze
            
        Returns:
            AnalysisResult with safe status and issues
        """
        issues: list[SecurityIssue] = []
        blocked_items: list[str] = []
        
        # Check for dangerous functions
        dangerous_funcs = ['eval', 'Function', 'setTimeout', 'setInterval', 'exec']
        for func in dangerous_funcs:
            pattern = rf'\b{func}\s*\('
            if re.search(pattern, code):
                issues.append(SecurityIssue(
                    type="dangerous_function",
                    severity=Severity.CRITICAL,
                    message=f"Blocked function: {func}()",
                ))
                blocked_items.append(func)
        
        # Check for dangerous globals
        dangerous_globals = ['process', 'require', 'global', 'module', 'exports', '__dirname', '__filename']
        for glob in dangerous_globals:
            if re.search(rf'\b{glob}\b', code):
                issues.append(SecurityIssue(
                    type="dangerous_global",
                    severity=Severity.CRITICAL,
                    message=f"Blocked global: {glob}",
                ))
                blocked_items.append(glob)
        
        # Check patterns
        for pattern, message in self.BLOCKED_PATTERNS:
            if re.search(pattern, code, re.IGNORECASE):
                issues.append(SecurityIssue(
                    type="dangerous_pattern",
                    severity=Severity.WARNING,
                    message=message,
                ))
        
        critical_issues = [i for i in issues if i.severity == Severity.CRITICAL]
        
        return AnalysisResult(
            safe=len(critical_issues) == 0,
            risk_level="dangerous" if critical_issues else "safe",
            issues=issues,
            blocked_items=blocked_items,
            suggestion="Remove blocked functions and globals" if blocked_items else None,
            complexity_score=0,
        )
    
    def _check_imports(self, tree: ast.Module) -> tuple[list[SecurityIssue], list[str]]:
        """Check for blocked imports."""
        issues = []
        blocked = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name in self.BLOCKED_IMPORTS:
                        issues.append(SecurityIssue(
                            type="blocked_import",
                            severity=Severity.CRITICAL,
                            message=f"Blocked import: {alias.name}",
                            line=node.lineno,
                            suggestion=f"Remove import of '{alias.name}'",
                        ))
                        blocked.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module and node.module.split('.')[0] in self.BLOCKED_IMPORTS:
                    issues.append(SecurityIssue(
                        type="blocked_import",
                        severity=Severity.CRITICAL,
                        message=f"Blocked import from: {node.module}",
                        line=node.lineno,
                    ))
                    blocked.append(node.module)
        
        return issues, blocked
    
    def _check_function_calls(self, tree: ast.Module) -> tuple[list[SecurityIssue], list[str]]:
        """Check for blocked function calls."""
        issues = []
        blocked = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func_name = self._get_func_name(node)
                if func_name in self.BLOCKED_FUNCTIONS:
                    issues.append(SecurityIssue(
                        type="blocked_function",
                        severity=Severity.CRITICAL,
                        message=f"Blocked function: {func_name}()",
                        line=node.lineno,
                        suggestion=f"Remove call to '{func_name}'",
                    ))
                    blocked.append(func_name)
        
        return issues, blocked
    
    def _get_func_name(self, node: ast.Call) -> str:
        """Extract function name from call node."""
        if isinstance(node.func, ast.Name):
            return node.func.id
        elif isinstance(node.func, ast.Attribute):
            return node.func.attr
        return ""
    
    def _check_patterns(self, code: str) -> list[SecurityIssue]:
        """Check for dangerous patterns."""
        issues = []
        
        for pattern, message in self.BLOCKED_PATTERNS:
            matches = list(re.finditer(pattern, code, re.IGNORECASE))
            for match in matches:
                # Calculate approximate line number
                line = code[:match.start()].count('\n') + 1
                issues.append(SecurityIssue(
                    type="dangerous_pattern",
                    severity=Severity.WARNING,
                    message=message,
                    line=line,
                ))
        
        return issues
    
    def _calculate_complexity(self, tree: ast.Module) -> int:
        """Calculate cyclomatic complexity of the code."""
        complexity = 1  # Base complexity
        
        for node in ast.walk(tree):
            if isinstance(node, (ast.If, ast.For, ast.While, ast.ExceptHandler)):
                complexity += 1
            elif isinstance(node, ast.BoolOp):
                complexity += len(node.values) - 1
            elif isinstance(node, (ast.And, ast.Or)):
                complexity += 1
        
        return complexity
    
    def _generate_suggestion(self, issues: list[SecurityIssue]) -> str:
        """Generate suggestion for fixing issues."""
        suggestions = []
        for issue in issues:
            if issue.suggestion:
                suggestions.append(issue.suggestion)
        
        if suggestions:
            return "; ".join(suggestions[:3])  # Top 3 suggestions
        return "Review and fix the identified security issues"
