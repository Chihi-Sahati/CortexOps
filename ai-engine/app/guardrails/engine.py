"""
CortexOps Guardrails Engine

Enforces safety limits on agent execution.

Mathematical Model - Human-in-the-Loop Decision:
    HITL(aₜ) = {
        AutoExecute(aₜ)    if Risk(aₜ) < λ_low   (0.3)
        LogAndExecute(aₜ)  if λ_low ≤ Risk(aₜ) < λ_high
        HumanApprove(aₜ)   if Risk(aₜ) ≥ λ_high  (0.7)
    }

Termination Conditions (Guardrails):
    G = {g₁, g₂, g₃, g₄}
    g₁: t ≥ T_max           (max iterations)
    g₂: Confidence(oₜ) ≥ θ  (confidence threshold)
    g₃: Cost ≥ B_max        (budget limit)
    g₄: Δ(Sₜ, Sₜ₋ₖ) < ε    (stagnation detection)

    STOP = g₁ ∨ g₂ ∨ g₃ ∨ g₄
"""

from dataclasses import dataclass, field
from typing import Any
from app.config import settings
from app.metrics.collector import guardrail_triggers


@dataclass
class GuardrailResult:
    """Result of guardrails check."""
    should_stop: bool
    reason: str | None = None
    requires_human: bool = False
    violations: list[str] = field(default_factory=list)


@dataclass
class HITLDecision:
    """Decision for Human-in-the-Loop."""
    requires_human: bool
    risk_score: float
    reason: str
    auto_approvable: bool


class GuardrailsEngine:
    """
    Enforces 10 safety rules on agent execution.
    
    Rules:
    1. max_iterations_per_loop = 10
    2. max_execution_time = 300 seconds
    3. max_tokens_per_execution = 50,000
    4. max_cost_per_execution = $1.00
    5. max_code_gen_attempts = 3
    6. max_self_heal_attempts = 3
    7. stagnation_detection (same state 3 times)
    8. hitl_risk_threshold = 0.7
    9. max_file_size = 50MB
    10. max_api_calls_per_minute = 100
    """
    
    def __init__(self):
        self.max_iterations = settings.guardrails_max_iterations
        self.max_time = settings.guardrails_max_time
        self.max_tokens = settings.guardrails_max_tokens
        self.max_cost = settings.guardrails_max_cost
        self.max_code_attempts = settings.guardrails_max_code_attempts
        self.max_heal_attempts = settings.guardrails_max_heal_attempts
        self.stagnation_threshold = settings.guardrails_stagnation_threshold
        self.hitl_threshold = settings.guardrails_hitl_threshold
        self.max_file_size_mb = settings.guardrails_max_file_size_mb
        self.max_api_calls_per_min = settings.guardrails_max_api_calls_per_min
        
        # Internal state tracking
        self._iteration_counts: dict[str, int] = {}
        self._api_calls: dict[str, list[float]] = {}
    
    def check_all(self, state: dict[str, Any]) -> GuardrailResult:
        """
        Check all guardrails against current state.
        
        Args:
            state: Current execution state
            
        Returns:
            GuardrailResult with stop status and violations
        """
        violations = []
        
        # Rule 1: Max iterations
        if state.get("iteration_count", 0) >= self.max_iterations:
            violations.append("max_iterations")
            guardrail_triggers.labels(guardrail_type="max_iterations").inc()
        
        # Rule 2: Max execution time
        import time
        elapsed = time.time() - state.get("start_time", time.time())
        if elapsed >= self.max_time:
            violations.append("max_time")
            guardrail_triggers.labels(guardrail_type="max_time").inc()
        
        # Rule 3: Max tokens
        if state.get("total_tokens", 0) >= self.max_tokens:
            violations.append("max_tokens")
            guardrail_triggers.labels(guardrail_type="max_tokens").inc()
        
        # Rule 4: Max cost
        if state.get("total_cost", 0) >= self.max_cost:
            violations.append("max_cost")
            guardrail_triggers.labels(guardrail_type="max_cost").inc()
        
        # Rule 7: Stagnation detection
        if state.get("stagnation_count", 0) >= self.stagnation_threshold:
            violations.append("stagnation")
            guardrail_triggers.labels(guardrail_type="stagnation").inc()
        
        # Rule 8: HITL threshold
        requires_human = False
        if state.get("confidence", 1.0) < 0.3:  # Low confidence
            violations.append("low_confidence")
            requires_human = True
            guardrail_triggers.labels(guardrail_type="hitl_threshold").inc()
        
        should_stop = len(violations) > 0
        reason = violations[0] if violations else None
        
        return GuardrailResult(
            should_stop=should_stop,
            reason=reason,
            requires_human=requires_human,
            violations=violations,
        )
    
    def check_iteration(self, count: int) -> bool:
        """Check if iteration count is within limits."""
        return count < self.max_iterations
    
    def check_time(self, elapsed: float) -> bool:
        """Check if execution time is within limits."""
        return elapsed < self.max_time
    
    def check_tokens(self, used: int) -> bool:
        """Check if token usage is within limits."""
        return used < self.max_tokens
    
    def check_cost(self, spent: float) -> bool:
        """Check if cost is within limits."""
        return spent < self.max_cost
    
    def check_stagnation(self, history: list[dict[str, Any]]) -> bool:
        """
        Check for stagnation in reasoning.
        
        Stagnation is detected when the same thought/action
        repeats multiple times consecutively.
        """
        if len(history) < self.stagnation_threshold:
            return False
        
        # Get last N thoughts
        last_n = history[-self.stagnation_threshold:]
        
        # Check if all are identical (based on thought key)
        thoughts = [h.get("thought", "")[:100] for h in last_n]
        
        return len(set(thoughts)) == 1
    
    def check_risk(self, risk_score: float) -> HITLDecision:
        """
        Determine if human review is needed based on risk score.
        
        Args:
            risk_score: Risk score (0.0 to 1.0)
            
        Returns:
            HITLDecision with human review requirement
        """
        if risk_score >= self.hitl_threshold:
            return HITLDecision(
                requires_human=True,
                risk_score=risk_score,
                reason=f"Risk score {risk_score:.2f} exceeds threshold {self.hitl_threshold}",
                auto_approvable=False,
            )
        elif risk_score >= 0.3:
            return HITLDecision(
                requires_human=False,
                risk_score=risk_score,
                reason="Medium risk - log and execute",
                auto_approvable=True,
            )
        else:
            return HITLDecision(
                requires_human=False,
                risk_score=risk_score,
                reason="Low risk - auto execute",
                auto_approvable=True,
            )
    
    def check_code_attempts(self, attempts: int) -> bool:
        """Check if code generation attempts are within limits."""
        return attempts < self.max_code_attempts
    
    def check_heal_attempts(self, attempts: int) -> bool:
        """Check if self-healing attempts are within limits."""
        return attempts < self.max_heal_attempts
    
    def check_file_size(self, size_bytes: int) -> bool:
        """Check if file size is within limits."""
        max_bytes = self.max_file_size_mb * 1024 * 1024
        return size_bytes <= max_bytes
    
    def check_api_rate(self, key: str = "default") -> bool:
        """
        Check if API call rate is within limits.
        
        Uses sliding window to track calls per minute.
        """
        import time
        now = time.time()
        minute_ago = now - 60
        
        # Get call history for this key
        calls = self._api_calls.get(key, [])
        
        # Filter to calls within last minute
        recent_calls = [c for c in calls if c > minute_ago]
        
        # Check rate
        if len(recent_calls) >= self.max_api_calls_per_min:
            guardrail_triggers.labels(guardrail_type="rate_limit").inc()
            return False
        
        # Record this call
        recent_calls.append(now)
        self._api_calls[key] = recent_calls
        
        return True
    
    def reset(self):
        """Reset internal state."""
        self._iteration_counts = {}
        self._api_calls = {}
    
    def get_config(self) -> dict[str, Any]:
        """Get current guardrail configuration."""
        return {
            "max_iterations": self.max_iterations,
            "max_time_seconds": self.max_time,
            "max_tokens": self.max_tokens,
            "max_cost_usd": self.max_cost,
            "max_code_attempts": self.max_code_attempts,
            "max_heal_attempts": self.max_heal_attempts,
            "stagnation_threshold": self.stagnation_threshold,
            "hitl_threshold": self.hitl_threshold,
            "max_file_size_mb": self.max_file_size_mb,
            "max_api_calls_per_min": self.max_api_calls_per_min,
        }
