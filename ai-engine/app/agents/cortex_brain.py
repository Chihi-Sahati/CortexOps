"""
CortexOps Cortex Brain - Main Orchestrator

The central brain that coordinates all agents using LangGraph.

State Machine Flow:
    START → plan → reason → execute → validate ─→ END
                ↑         │          │
                │    [on_error]  [on_invalid]
                │         ↓          ↓
                ├── self_heal    re_reason
                │         │          │
                │    [if_healed]     │
                ←─────────┘          │
                ↑                    │
                └────────────────────┘
                ↑
           [if_max_retries]
                ↓
           human_review → END (with HITL flag)
"""

import time
import uuid
from typing import Any
from dataclasses import dataclass

from app.agents.state import (
    CortexState,
    create_initial_state,
    AgentStatus,
    Strategy,
)
from app.agents.planner_agent import PlannerAgent
from app.agents.reasoner_agent import ReasonerAgent
from app.agents.executor_agent import ExecutorAgent
from app.agents.validator_agent import ValidatorAgent
from app.guardrails.engine import GuardrailsEngine
from app.metrics.collector import (
    agent_invocations,
    agent_latency,
    workflow_executions,
    workflow_duration,
)


@dataclass
class OrchestrationResult:
    """Result of orchestrating a task."""
    success: bool
    plan_id: str
    steps_executed: int
    total_tokens: int
    total_cost: float
    strategies_used: list[str]
    reasoning_iterations: int
    self_heal_attempts: int
    security_alerts: int
    guardrail_triggers: list[str]
    confidence: float
    final_output: dict[str, Any]
    traces: list[dict[str, Any]]


class CortexBrain:
    """
    The central brain orchestrating all agents.
    
    Uses a state machine pattern with fallback strategies:
    1. Plan the task
    2. For each step:
       a. Reason about best strategy
       b. Execute with chosen strategy
       c. Validate result
       d. If invalid, try alternative strategy
    3. If all strategies fail, escalate to human
    """
    
    def __init__(self):
        self.planner = PlannerAgent()
        self.reasoner = ReasonerAgent()
        self.executor = ExecutorAgent()
        self.validator = ValidatorAgent()
        self.guardrails = GuardrailsEngine()
        
        # Track executions
        self._executions: dict[str, CortexState] = {}
    
    async def orchestrate(
        self,
        task: str,
        connectors: list[str] | None = None,
        context: dict[str, Any] | None = None,
        max_iterations: int = 10,
    ) -> OrchestrationResult:
        """
        Execute full agent pipeline: Plan → Reason → Execute → Validate.
        
        This is the main entry point for intelligent workflow execution.
        
        Args:
            task: The task description
            connectors: Available connectors for execution
            context: Additional context (credentials, previous outputs, etc.)
            max_iterations: Maximum reasoning iterations per step
            
        Returns:
            OrchestrationResult with all execution details
        """
        start_time = time.time()
        plan_id = str(uuid.uuid4())[:8]
        
        # Initialize state
        state = create_initial_state(task, connectors, context)
        state["status"] = AgentStatus.PLANNING.value
        
        # Track metrics
        strategies_used = []
        guardrail_triggers = []
        self_heal_attempts = 0
        security_alerts = 0
        
        try:
            # ═══════════════════════════════════════════════════════
            # Phase 1: Planning
            # ═══════════════════════════════════════════════════════
            plan_result = await self.planner.plan(
                task=task,
                connectors=connectors or [],
                tools=[],  # Would load available tools
                context=context or {},
            )
            state["plan"] = plan_result["steps"]
            state["status"] = AgentStatus.EXECUTING.value
            
            # ═══════════════════════════════════════════════════════
            # Phase 2: Execute each step
            # ═══════════════════════════════════════════════════════
            for step_index, step in enumerate(state["plan"]):
                state["current_step_index"] = step_index
                step_success = False
                attempt = 0
                
                while not step_success and attempt < 3:
                    attempt += 1
                    state["iteration_count"] += 1
                    
                    # Check guardrails
                    guardrail_result = self.guardrails.check_all(state)
                    if guardrail_result.should_stop:
                        guardrail_triggers.append(guardrail_result.reason)
                        if guardrail_result.requires_human:
                            state["hitl_required"] = True
                            state["hitl_reason"] = guardrail_result.reason
                            state["status"] = AgentStatus.HITL.value
                        break
                    
                    # ───────────────────────────────────────────────────
                    # Phase 2a: Reason about strategy
                    # ───────────────────────────────────────────────────
                    state["status"] = AgentStatus.REASONING.value
                    reason_result = await self.reasoner.reason(
                        step=step,
                        context=state["context"],
                        error_history=state["error_history"],
                        connectors=state["connectors"],
                    )
                    
                    # Record reasoning trace
                    state["reasoning_trace"].append({
                        "step_number": state["iteration_count"],
                        "thought": reason_result["thought"],
                        "strategy": reason_result["strategy"],
                        "action": reason_result["action"],
                        "confidence": reason_result["confidence"],
                    })
                    
                    strategy = reason_result["strategy"]
                    if strategy not in strategies_used:
                        strategies_used.append(strategy)
                    
                    state["strategy"] = strategy
                    state["confidence"] = reason_result["confidence"]
                    
                    # ───────────────────────────────────────────────────
                    # Phase 2b: Execute with strategy
                    # ───────────────────────────────────────────────────
                    state["status"] = AgentStatus.EXECUTING.value
                    exec_result = await self.executor.execute(
                        action=reason_result["action"],
                        strategy=strategy,
                        context=state["context"],
                    )
                    
                    # Update metrics
                    state["total_tokens"] += exec_result.get("tokens_used", 0)
                    state["total_cost"] += exec_result.get("cost", 0)
                    
                    # Track self-healing
                    if strategy == Strategy.SELF_HEAL.value:
                        self_heal_attempts += 1
                    
                    # Track security issues
                    if exec_result.get("security_issues"):
                        security_alerts += len(exec_result["security_issues"])
                    
                    # ───────────────────────────────────────────────────
                    # Phase 2c: Validate result
                    # ───────────────────────────────────────────────────
                    state["status"] = AgentStatus.VALIDATING.value
                    valid_result = await self.validator.validate(
                        expected=step.get("expected_output", {}),
                        actual=exec_result.get("result", {}),
                        step=step,
                    )
                    
                    if valid_result["valid"]:
                        step_success = True
                        state["execution_results"].append({
                            "step_id": step.get("step_id"),
                            "success": True,
                            "output": exec_result.get("result", {}),
                            "strategy_used": strategy,
                            "tokens_used": exec_result.get("tokens_used", 0),
                            "cost": exec_result.get("cost", 0),
                        })
                        state["context"]["previous_output"] = exec_result.get("result", {})
                    else:
                        # Record error and try alternative strategy
                        state["error_count"] += 1
                        state["error_history"].append({
                            "step": step.get("step_id"),
                            "strategy": strategy,
                            "error": valid_result.get("issues", []),
                            "suggestion": valid_result.get("suggestion"),
                        })
                        
                        # Check for stagnation
                        if self._check_stagnation(state):
                            state["stagnation_count"] += 1
                            guardrail_triggers.append("stagnation_detected")
                            break
                
                # If step failed after all attempts
                if not step_success:
                    state["status"] = AgentStatus.FAILED.value
                    break
            
            # ═══════════════════════════════════════════════════════
            # Finalize
            # ═══════════════════════════════════════════════════════
            if state["status"] not in [AgentStatus.FAILED.value, AgentStatus.HITL.value]:
                state["status"] = AgentStatus.COMPLETED.value
            
            # Compile final output
            final_output = {}
            for result in state["execution_results"]:
                if result.get("success"):
                    final_output.update(result.get("output", {}))
            
            state["final_output"] = final_output
            
            # Record metrics
            total_time = time.time() - start_time
            status = "success" if state["status"] == AgentStatus.COMPLETED.value else "failure"
            workflow_executions.labels(status=status, trigger_type="manual").inc()
            workflow_duration.observe(total_time)
            
            return OrchestrationResult(
                success=state["status"] == AgentStatus.COMPLETED.value,
                plan_id=plan_id,
                steps_executed=len(state["execution_results"]),
                total_tokens=state["total_tokens"],
                total_cost=state["total_cost"],
                strategies_used=strategies_used,
                reasoning_iterations=state["iteration_count"],
                self_heal_attempts=self_heal_attempts,
                security_alerts=security_alerts,
                guardrail_triggers=guardrail_triggers,
                confidence=state["confidence"],
                final_output=final_output,
                traces=state["reasoning_trace"],
            )
            
        except Exception as e:
            workflow_executions.labels(status="failure", trigger_type="manual").inc()
            return OrchestrationResult(
                success=False,
                plan_id=plan_id,
                steps_executed=len(state["execution_results"]),
                total_tokens=state["total_tokens"],
                total_cost=state["total_cost"],
                strategies_used=strategies_used,
                reasoning_iterations=state["iteration_count"],
                self_heal_attempts=self_heal_attempts,
                security_alerts=security_alerts,
                guardrail_triggers=guardrail_triggers + [f"exception: {str(e)}"],
                confidence=0.0,
                final_output={},
                traces=state["reasoning_trace"],
            )
    
    def _check_stagnation(self, state: CortexState) -> bool:
        """Check if execution is stagnating (same state repeated)."""
        if len(state["reasoning_trace"]) < 3:
            return False
        
        last_three = state["reasoning_trace"][-3:]
        thoughts = [t.get("thought", "")[:50] for t in last_three]
        
        return len(set(thoughts)) == 1
    
    async def plan_only(self, task: str, **kwargs) -> dict[str, Any]:
        """Execute only the planning phase."""
        return await self.planner.plan(task=task, **kwargs)
    
    async def reason_only(self, step: dict, **kwargs) -> dict[str, Any]:
        """Execute only the reasoning phase."""
        return await self.reasoner.reason(step=step, **kwargs)
    
    async def execute_only(self, action: dict, strategy: str, **kwargs) -> dict[str, Any]:
        """Execute only the execution phase."""
        return await self.executor.execute(action=action, strategy=strategy, **kwargs)
    
    async def validate_only(self, expected: dict, actual: dict, **kwargs) -> dict[str, Any]:
        """Execute only the validation phase."""
        return await self.validator.validate(expected=expected, actual=actual, **kwargs)
