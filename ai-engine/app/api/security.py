"""
Security Analysis API Endpoints

Static code analysis, prompt injection detection, DLP scanning.
"""

from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.security.static_analyzer import StaticAnalyzer
from app.security.prompt_guard import PromptGuard
from app.security.dlp_engine import DLPEngine
from app.metrics.collector import security_scans, prompt_injections, dlp_alerts

router = APIRouter()

# Initialize security components
static_analyzer = StaticAnalyzer()
prompt_guard = PromptGuard()
dlp_engine = DLPEngine()


# ═══════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════

class AnalyzeCodeRequest(BaseModel):
    """Request model for code analysis."""
    code: str = Field(..., description="Code to analyze")
    language: str = Field(default="python", description="Programming language")
    context: dict[str, Any] = Field(default={}, description="Additional context")


class AnalyzeCodeResponse(BaseModel):
    """Response model for code analysis."""
    safe: bool
    risk_level: str
    issues: list[dict[str, Any]]
    blocked_items: list[str]
    suggestion: str | None = None
    complexity_score: int


class CheckPromptRequest(BaseModel):
    """Request model for prompt checking."""
    prompt: str = Field(..., description="Prompt to check")
    context: dict[str, Any] = Field(default={}, description="Additional context")


class CheckPromptResponse(BaseModel):
    """Response model for prompt checking."""
    safe: bool
    injection_detected: bool
    patterns_found: list[str]
    sanitized_prompt: str
    confidence: float


class ScanOutputRequest(BaseModel):
    """Request model for output scanning."""
    output: str = Field(..., description="Output to scan")
    destination: str = Field(default="external", description="Data destination")


class ScanOutputResponse(BaseModel):
    """Response model for output scanning."""
    safe: bool
    detected_types: list[str]
    masked_output: str
    classification: str
    policy_compliant: bool


# ═══════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════

@router.post("/analyze-code", response_model=AnalyzeCodeResponse)
async def analyze_code(request: AnalyzeCodeRequest):
    """
    Perform static analysis on code.
    
    Checks for:
    - Dangerous imports (os, subprocess, sys, etc.)
    - Dangerous functions (eval, exec, compile, etc.)
    - Sensitive data patterns
    - Resource abuse indicators
    - Infinite loop heuristics
    
    Returns:
    - safe: bool - Whether code is safe to execute
    - risk_level: "safe" | "warning" | "dangerous"
    - issues: List of detected issues
    - blocked_items: List of blocked imports/functions
    """
    try:
        if request.language == "python":
            result = static_analyzer.analyze_python(request.code)
        elif request.language == "javascript":
            result = static_analyzer.analyze_javascript(request.code)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported language: {request.language}"
            )
        
        # Record metrics
        status = "safe" if result.safe else ("warning" if result.risk_level == "warning" else "blocked")
        security_scans.labels(result=status).inc()
        
        return AnalyzeCodeResponse(
            safe=result.safe,
            risk_level=result.risk_level,
            issues=[issue.__dict__ for issue in result.issues],
            blocked_items=result.blocked_items,
            suggestion=result.suggestion,
            complexity_score=result.complexity_score,
        )
        
    except Exception as e:
        security_scans.labels(result="error").inc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check-prompt", response_model=CheckPromptResponse)
async def check_prompt(request: CheckPromptRequest):
    """
    Check a prompt for injection attempts.
    
    Detects patterns like:
    - "Ignore previous instructions"
    - "You are now a different AI"
    - "Enter DAN mode"
    - System prompt injection attempts
    - Jailbreak attempts
    
    Returns:
    - safe: bool - Whether prompt is safe
    - injection_detected: bool - Whether injection was detected
    - patterns_found: List of detected injection patterns
    - sanitized_prompt: Prompt with injections removed/redacted
    """
    try:
        result = prompt_guard.check_injection(request.prompt)
        sanitized = prompt_guard.sanitize(request.prompt)
        
        # Record metrics
        if result.detected:
            prompt_injections.inc()
        
        return CheckPromptResponse(
            safe=not result.detected,
            injection_detected=result.detected,
            patterns_found=result.patterns,
            sanitized_prompt=sanitized,
            confidence=result.confidence,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan-output", response_model=ScanOutputResponse)
async def scan_output(request: ScanOutputRequest):
    """
    Scan output for sensitive data.
    
    Detects:
    - Email addresses
    - Phone numbers
    - SSN
    - Credit card numbers
    - API keys
    - IP addresses
    - JWT tokens
    
    Returns:
    - safe: bool - Whether output is safe to transmit
    - detected_types: List of sensitive data types found
    - masked_output: Output with sensitive data masked
    - classification: "public" | "internal" | "confidential" | "restricted"
    """
    try:
        scan_result = dlp_engine.scan(request.output)
        masked = dlp_engine.mask(request.output)
        classification = dlp_engine.classify(request.output)
        policy_compliant = dlp_engine.enforce_policy(
            {"data": request.output, "classification": classification},
            request.destination,
        )
        
        # Record metrics
        for data_type in scan_result.detected_types:
            dlp_alerts.labels(data_type=data_type).inc()
        
        return ScanOutputResponse(
            safe=len(scan_result.detected_types) == 0,
            detected_types=scan_result.detected_types,
            masked_output=masked,
            classification=classification,
            policy_compliant=policy_compliant,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/blocked-items")
async def get_blocked_items():
    """Get list of all blocked imports and functions."""
    return {
        "blocked_imports": static_analyzer.BLOCKED_IMPORTS,
        "blocked_functions": static_analyzer.BLOCKED_FUNCTIONS,
        "injection_patterns": prompt_guard.INJECTION_PATTERNS,
        "pii_patterns": list(dlp_engine.PII_PATTERNS.keys()),
    }
