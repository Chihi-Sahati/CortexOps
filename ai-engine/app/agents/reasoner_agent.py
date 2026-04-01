"""
CortexOps Reasoner Agent

Implements the ReAct (Reasoning + Acting) loop.

Mathematical Model:
At each step t:
    oₜ₊₁ = f_LLM(Task, o₁, a₁, o₂, a₂, ..., oₜ, aₜ)

Where:
    oₜ = observation at step t
    aₜ = action taken at step t
    f_LLM = language model function

Termination Conditions:
    STOP when:
        (1) Confidence(oₜ) ≥ θ (threshold = 0.85)   OR
        (2) t ≥ T_max (max iterations = 10)           OR
        (3) Cost_accumulated ≥ B_max                   OR
        (4) Δ(Stateₜ, Stateₜ₋ₖ) < ε (stagnation)
"""

import time
from typing import Any

from app.agents.state import Strategy
from app.metrics.collector import (
    agent_invocations,
    agent_latency,
    reasoning_iterations,
    reasoning_strategy,
)


class ReasonerAgent:
    """
    Agent that reasons about the best execution strategy.
    
    Uses ReAct pattern:
    1. Thought: Analyze the current step
    2. Strategy: Choose best approach (static_api, self_heal, code_gen)
    3. Action: Specify the action to take
    4. Confidence: Estimate success probability
    """
    
    SYSTEM_PROMPT = """You are the Reasoner Agent for CortexOps.

Your role is to think through the best strategy for executing a step.

AVAILABLE STRATEGIES:
1. STATIC_API: Use existing connector (fastest, most reliable)
   - Best for: standard API calls, known endpoints
   - Success rate: ~95%
   
2. SELF_HEAL: Fix broken connector automatically
   - Best for: auth expired, endpoint changed, rate limited
   - Success rate: ~65%
   
3. CODE_GEN: Generate custom Python code
   - Best for: data transformation, complex logic
   - Success rate: ~70%
   
4. FALLBACK: Try alternative approach
   - Best for: last resort, known failure patterns
   - Success rate: ~50%

OUTPUT FORMAT (JSON):
{
    "thought": "Your reasoning process...",
    "strategy": "static_api|self_heal|code_gen|fallback",
    "action": {
        "type": "api_call|code_execution|transform",
        "config": {}
    },
    "confidence": 0.85,
    "fallback_plan": "What to try if this fails"
}"""

    async def reason(
        self,
        step: dict[str, Any],
        context: dict[str, Any],
        error_history: list[dict[str, Any]],
        connectors: list[str],
    ) -> dict[str, Any]:
        """
        Reason about the best strategy for a step.
        
        Args:
            step: The step to reason about
            context: Current execution context
            error_history: Previous errors for this step
            connectors: Available connectors
            
        Returns:
            Dictionary with thought, strategy, action, confidence
        """
        start_time = time.time()
        
        # Analyze step type and context
        step_type = step.get("type", "unknown")
        step_config = step.get("config", {})
        
        # Determine best strategy based on step and error history
        strategy = self._select_strategy(step, error_history, connectors)
        
        # Build the action
        action = self._build_action(step, strategy)
        
        # Calculate confidence
        confidence = self._calculate_confidence(strategy, error_history, connectors)
        
        # Build thought process
        thought = self._generate_thought(step, strategy, error_history)
        
        # Record metrics
        latency = time.time() - start_time
        agent_invocations.labels(agent_type="reasoner", status="success").inc()
        agent_latency.labels(agent_type="reasoner").observe(latency)
        reasoning_strategy.labels(strategy=strategy).inc()
        
        return {
            "thought": thought,
            "strategy": strategy,
            "action": action,
            "confidence": confidence,
            "fallback_plan": self._get_fallback(strategy),
        }
    
    def _select_strategy(
        self,
        step: dict[str, Any],
        error_history: list[dict[str, Any]],
        connectors: list[str],
    ) -> str:
        """Select the best strategy based on context."""
        step_type = step.get("type", "")
        step_config = step.get("config", {})
        
        # Check for previous errors
        if error_history:
            last_error = error_history[-1] if error_history else {}
            error_strategy = last_error.get("strategy")
            
            # If static_api failed, try self_heal
            if error_strategy == Strategy.STATIC_API.value:
                return Strategy.SELF_HEAL.value
            # If self_heal failed, try code_gen
            elif error_strategy == Strategy.SELF_HEAL.value:
                return Strategy.CODE_GEN.value
            # If code_gen failed, try fallback
            elif error_strategy == Strategy.CODE_GEN.value:
                return Strategy.FALLBACK.value
        
        # Default strategy selection based on step type
        if step_type in ["trigger", "api_call"]:
            return Strategy.STATIC_API.value
        elif step_type == "code_gen":
            return Strategy.CODE_GEN.value
        elif step_type == "transform":
            return Strategy.STATIC_API.value
        elif step_type == "condition":
            return Strategy.STATIC_API.value
        else:
            return Strategy.STATIC_API.value
    
    def _build_action(self, step: dict[str, Any], strategy: str) -> dict[str, Any]:
        """Build the action to execute."""
        step_config = step.get("config", {})
        
        if strategy == Strategy.STATIC_API.value:
            return {
                "type": "api_call",
                "config": {
                    "method": step_config.get("method", "GET"),
                    "url": step_config.get("url", ""),
                    "headers": step_config.get("headers", {}),
                    "body": step_config.get("body"),
                },
            }
        elif strategy == Strategy.SELF_HEAL.value:
            return {
                "type": "self_heal",
                "config": {
                    "connector_id": step.get("step_id"),
                    "error_type": "unknown",
                    "original_config": step_config,
                },
            }
        elif strategy == Strategy.CODE_GEN.value:
            return {
                "type": "code_execution",
                "config": {
                    "language": step_config.get("language", "python"),
                    "code": step_config.get("code", ""),
                    "timeout": 30,
                },
            }
        else:  # fallback
            return {
                "type": "fallback",
                "config": {
                    "alternative": "retry_with_delay",
                    "delay_ms": 1000,
                },
            }
    
    def _calculate_confidence(
        self,
        strategy: str,
        error_history: list[dict[str, Any]],
        connectors: list[str],
    ) -> float:
        """Calculate confidence score for the strategy."""
        base_confidence = {
            Strategy.STATIC_API.value: 0.95,
            Strategy.SELF_HEAL.value: 0.65,
            Strategy.CODE_GEN.value: 0.70,
            Strategy.FALLBACK.value: 0.50,
        }
        
        confidence = base_confidence.get(strategy, 0.5)
        
        # Reduce confidence for each previous error
        error_penalty = len(error_history) * 0.1
        confidence = max(0.1, confidence - error_penalty)
        
        return round(confidence, 2)
    
    def _generate_thought(
        self,
        step: dict[str, Any],
        strategy: str,
        error_history: list[dict[str, Any]],
    ) -> str:
        """Generate the reasoning thought."""
        step_desc = step.get("description", "unknown step")
        
        if error_history:
            last_error = error_history[-1] if error_history else {}
            return (
                f"Previous attempt with {last_error.get('strategy', 'unknown')} failed. "
                f"Switching to {strategy} strategy for step: {step_desc}"
            )
        else:
            return (
                f"Analyzing step: {step_desc}. "
                f"Selected {strategy} strategy based on step type and available connectors."
            )
    
    def _get_fallback(self, strategy: str) -> str:
        """Get the fallback plan for a strategy."""
        fallbacks = {
            Strategy.STATIC_API.value: "Try self_heal to fix potential connector issues",
            Strategy.SELF_HEAL.value: "Try code_gen to implement custom logic",
            Strategy.CODE_GEN.value: "Try fallback with alternative approach or request human review",
            Strategy.FALLBACK.value: "Escalate to human review",
        }
        return fallbacks.get(strategy, "Request human review")
