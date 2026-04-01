"""
CortexOps Agent State Definitions

Mathematical Model:
The workflow is modeled as a Directed Acyclic Graph (DAG):
    W = (V, E, Σ, T, δ)

Where:
    V = {v₁, v₂, ..., vₙ}     - Set of nodes/tasks
    E ⊆ V × V                   - Dependencies between tasks
    Σ = {s₀, s₁, ..., sₘ}     - State space
    T: V → P(Tools)             - Tool assignment function
    δ: Σ × V → Σ               - State transition function

The agent decision process is modeled as an MDP:
    M = (S, A, P, R, γ)

Where:
    S = state space (current inputs, partial outputs, errors)
    A = action space {call_api, generate_code, self_heal, escalate}
    P(s'|s,a) = transition probability
    R(s,a) = reward (success=1, partial=0.5, fail=-1)
    γ ∈ [0,1] = discount factor

Optimal policy:
    π* = argmax_π E[Σ γᵗR(sₜ,aₜ) | π]
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any
from typing_extensions import TypedDict


class AgentStatus(str, Enum):
    """Status of agent execution."""
    IDLE = "idle"
    PLANNING = "planning"
    REASONING = "reasoning"
    EXECUTING = "executing"
    VALIDATING = "validating"
    HEALING = "healing"
    HITL = "hitl"  # Human-in-the-loop
    COMPLETED = "completed"
    FAILED = "failed"


class Strategy(str, Enum):
    """Execution strategies for tasks."""
    STATIC_API = "static_api"
    SELF_HEAL = "self_heal"
    CODE_GEN = "code_gen"
    FALLBACK = "fallback"


@dataclass
class PlanStep:
    """A single step in the execution plan."""
    step_id: str
    description: str
    type: str  # "api_call" | "code_gen" | "transform" | "condition"
    dependencies: list[str] = field(default_factory=list)
    estimated_complexity: str = "medium"  # "simple" | "medium" | "complex"
    security_risk: str = "low"  # "low" | "medium" | "high"
    can_parallel: bool = False
    config: dict[str, Any] = field(default_factory=dict)


@dataclass
class ReasoningEntry:
    """A single reasoning step in ReAct loop."""
    step_number: int
    thought: str
    strategy: Strategy
    action: dict[str, Any]
    observation: str | None = None
    confidence: float = 0.0
    tokens_used: int = 0
    model_used: str = ""


@dataclass
class StepResult:
    """Result of executing a step."""
    step_id: str
    success: bool
    output: dict[str, Any]
    error: str | None = None
    tokens_used: int = 0
    cost: float = 0.0
    latency_ms: int = 0
    strategy_used: Strategy = Strategy.STATIC_API
    security_issues: list[str] = field(default_factory=list)


class CortexState(TypedDict):
    """
    State for the Cortex Brain LangGraph.
    
    This state flows through all agents:
    plan → reason → execute → validate
    """
    # Input
    task: str
    connectors: list[str]
    context: dict[str, Any]
    
    # Planning
    plan: list[dict[str, Any]]  # List of PlanStep dicts
    current_step_index: int
    
    # Reasoning
    reasoning_trace: list[dict[str, Any]]  # List of ReasoningEntry dicts
    
    # Execution
    execution_results: list[dict[str, Any]]  # List of StepResult dicts
    strategy: str  # Strategy enum value
    
    # Error handling
    error_count: int
    error_history: list[dict[str, Any]]
    
    # Metrics
    total_tokens: int
    total_cost: float
    start_time: float
    
    # Confidence & Security
    confidence: float
    security_score: float
    
    # Control
    status: str  # AgentStatus enum value
    iteration_count: int
    stagnation_count: int
    
    # Human-in-the-loop
    hitl_required: bool
    hitl_reason: str | None
    
    # Final output
    final_output: dict[str, Any]
    

def create_initial_state(
    task: str,
    connectors: list[str] | None = None,
    context: dict[str, Any] | None = None,
) -> CortexState:
    """Create initial state for a new execution."""
    import time
    
    return CortexState(
        task=task,
        connectors=connectors or [],
        context=context or {},
        plan=[],
        current_step_index=0,
        reasoning_trace=[],
        execution_results=[],
        strategy=Strategy.STATIC_API.value,
        error_count=0,
        error_history=[],
        total_tokens=0,
        total_cost=0.0,
        start_time=time.time(),
        confidence=0.0,
        security_score=1.0,
        status=AgentStatus.IDLE.value,
        iteration_count=0,
        stagnation_count=0,
        hitl_required=False,
        hitl_reason=None,
        final_output={},
    )
