"""
CortexOps Agent API Endpoints

Endpoints for agent operations:
- Plan: Decompose task into steps
- Reason: ReAct reasoning for a step
- Execute: Execute an action
- Validate: Validate execution result
- Orchestrate: Full pipeline execution
"""

from typing import Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from app.agents.cortex_brain import CortexBrain
from app.agents.planner_agent import PlannerAgent
from app.agents.reasoner_agent import ReasonerAgent
from app.agents.executor_agent import ExecutorAgent
from app.agents.validator_agent import ValidatorAgent
from app.metrics.collector import (
    agent_invocations,
    agent_latency,
    agent_tokens,
    agent_cost,
)
from app.config import settings

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════

class PlanRequest(BaseModel):
    """Request model for planning."""
    task: str = Field(..., description="The task to plan")
    connectors: list[str] = Field(default=[], description="Available connectors")
    tools: list[str] = Field(default=[], description="Available tools")
    context: dict[str, Any] = Field(default={}, description="Additional context")


class PlanResponse(BaseModel):
    """Response model for planning."""
    plan_id: str
    steps: list[dict[str, Any]]
    total_steps: int
    estimated_tokens: int
    estimated_cost: float
    complexity: str


class ReasonRequest(BaseModel):
    """Request model for reasoning."""
    step: dict[str, Any] = Field(..., description="The step to reason about")
    context: dict[str, Any] = Field(default={}, description="Execution context")
    error_history: list[dict[str, Any]] = Field(default=[], description="Past errors")
    connectors: list[str] = Field(default=[])


class ReasonResponse(BaseModel):
    """Response model for reasoning."""
    thought: str
    strategy: str
    action: dict[str, Any]
    confidence: float
    fallback_plan: str | None = None


class ExecuteRequest(BaseModel):
    """Request model for execution."""
    action: dict[str, Any] = Field(..., description="The action to execute")
    strategy: str = Field(..., description="Execution strategy")
    timeout: int = Field(default=30, description="Timeout in seconds")


class ExecuteResponse(BaseModel):
    """Response model for execution."""
    success: bool
    result: dict[str, Any]
    tokens_used: int
    cost: float
    latency_ms: int


class ValidateRequest(BaseModel):
    """Request model for validation."""
    expected: dict[str, Any] = Field(..., description="Expected outcome")
    actual: dict[str, Any] = Field(..., description="Actual result")
    step: dict[str, Any] = Field(..., description="The step being validated")


class ValidateResponse(BaseModel):
    """Response model for validation."""
    valid: bool
    confidence: float
    issues: list[str]
    suggestion: str | None = None


class OrchestrateRequest(BaseModel):
    """Request model for full orchestration."""
    task: str = Field(..., description="The task to execute")
    connectors: list[str] = Field(default=[], description="Available connectors")
    context: dict[str, Any] = Field(default={}, description="Additional context")
    max_iterations: int = Field(default=10, description="Max reasoning iterations")


class OrchestrateResponse(BaseModel):
    """Response model for orchestration."""
    success: bool
    plan_id: str
    execution_id: str
    steps_executed: int
    total_tokens: int
    total_cost: float
    total_time_seconds: float
    strategies_used: list[str]
    reasoning_iterations: int
    self_heal_attempts: int
    security_alerts: int
    guardrail_triggers: list[str]
    confidence: float
    final_output: dict[str, Any]
    traces: list[dict[str, Any]]


# ═══════════════════════════════════════════════════════════════
# Agent Instances
# ═══════════════════════════════════════════════════════════════

cortex_brain = CortexBrain()
planner = PlannerAgent()
reasoner = ReasonerAgent()
executor = ExecutorAgent()
validator = ValidatorAgent()


# ═══════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════

@router.post("/plan", response_model=PlanResponse)
async def plan_task(request: PlanRequest):
    """
    Decompose a task into atomic steps.
    
    The planner agent analyzes the task and creates:
    - Ordered list of steps
    - Dependencies between steps
    - Complexity estimation for each step
    - Security risk assessment
    """
    import time
    import uuid
    
    start_time = time.time()
    plan_id = str(uuid.uuid4())[:8]
    
    try:
        result = await planner.plan(
            task=request.task,
            connectors=request.connectors,
            tools=request.tools,
            context=request.context,
        )
        
        # Record metrics
        latency = time.time() - start_time
        agent_invocations.labels(agent_type="planner", status="success").inc()
        agent_latency.labels(agent_type="planner").observe(latency)
        
        return PlanResponse(
            plan_id=plan_id,
            steps=result["steps"],
            total_steps=len(result["steps"]),
            estimated_tokens=result.get("estimated_tokens", 0),
            estimated_cost=result.get("estimated_cost", 0.0),
            complexity=result.get("complexity", "medium"),
        )
        
    except Exception as e:
        agent_invocations.labels(agent_type="planner", status="failure").inc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reason", response_model=ReasonResponse)
async def reason_step(request: ReasonRequest):
    """
    Apply ReAct reasoning to determine best execution strategy.
    
    The reasoner agent thinks through:
    1. What is the best strategy? (static_api, self_heal, code_gen)
    2. What could go wrong?
    3. What is the fallback plan?
    """
    import time
    
    start_time = time.time()
    
    try:
        result = await reasoner.reason(
            step=request.step,
            context=request.context,
            error_history=request.error_history,
            connectors=request.connectors,
        )
        
        latency = time.time() - start_time
        agent_invocations.labels(agent_type="reasoner", status="success").inc()
        agent_latency.labels(agent_type="reasoner").observe(latency)
        
        return ReasonResponse(
            thought=result["thought"],
            strategy=result["strategy"],
            action=result["action"],
            confidence=result["confidence"],
            fallback_plan=result.get("fallback_plan"),
        )
        
    except Exception as e:
        agent_invocations.labels(agent_type="reasoner", status="failure").inc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute", response_model=ExecuteResponse)
async def execute_action(request: ExecuteRequest):
    """
    Execute an action with the chosen strategy.
    
    Strategies:
    - static_api: Use existing connector
    - self_heal: Fix broken connector
    - code_gen: Generate custom Python code
    - fallback: Use alternative approach
    """
    import time
    
    start_time = time.time()
    
    try:
        result = await executor.execute(
            action=request.action,
            strategy=request.strategy,
            timeout=request.timeout,
        )
        
        latency = time.time() - start_time
        agent_invocations.labels(agent_type="executor", status="success" if result["success"] else "failure").inc()
        agent_latency.labels(agent_type="executor").observe(latency)
        agent_tokens.labels(agent_type="executor", model=result.get("model", "unknown")).inc(result.get("tokens_used", 0))
        agent_cost.labels(agent_type="executor", model=result.get("model", "unknown")).inc(result.get("cost", 0))
        
        return ExecuteResponse(
            success=result["success"],
            result=result["result"],
            tokens_used=result.get("tokens_used", 0),
            cost=result.get("cost", 0.0),
            latency_ms=int((time.time() - start_time) * 1000),
        )
        
    except Exception as e:
        agent_invocations.labels(agent_type="executor", status="failure").inc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate", response_model=ValidateResponse)
async def validate_result(request: ValidateRequest):
    """
    Validate an execution result.
    
    Checks:
    1. Does the result match expectations?
    2. Is the data format correct?
    3. Are there any security concerns?
    4. Is the data complete?
    """
    import time
    
    start_time = time.time()
    
    try:
        result = await validator.validate(
            expected=request.expected,
            actual=request.actual,
            step=request.step,
        )
        
        latency = time.time() - start_time
        agent_invocations.labels(agent_type="validator", status="success").inc()
        agent_latency.labels(agent_type="validator").observe(latency)
        
        return ValidateResponse(
            valid=result["valid"],
            confidence=result["confidence"],
            issues=result.get("issues", []),
            suggestion=result.get("suggestion"),
        )
        
    except Exception as e:
        agent_invocations.labels(agent_type="validator", status="failure").inc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orchestrate", response_model=OrchestrateResponse)
async def orchestrate_task(request: OrchestrateRequest, background_tasks: BackgroundTasks):
    """
    Execute full agent pipeline: Plan → Reason → Execute → Validate.
    
    This is the main entry point for intelligent workflow execution.
    The cortex brain orchestrates all agents in a state machine.
    
    Flow:
    1. Planner decomposes task into steps
    2. For each step:
       a. Reasoner selects strategy
       b. Executor executes with strategy
       c. Validator checks result
       d. If invalid, retry with alternative strategy
    3. Return final output with all traces
    """
    import time
    import uuid
    
    start_time = time.time()
    execution_id = str(uuid.uuid4())[:8]
    
    try:
        result = await cortex_brain.orchestrate(
            task=request.task,
            connectors=request.connectors,
            context=request.context,
            max_iterations=request.max_iterations,
        )
        
        total_time = time.time() - start_time
        agent_invocations.labels(agent_type="orchestrator", status="success" if result["success"] else "failure").inc()
        
        return OrchestrateResponse(
            success=result["success"],
            plan_id=result["plan_id"],
            execution_id=execution_id,
            steps_executed=result["steps_executed"],
            total_tokens=result["total_tokens"],
            total_cost=result["total_cost"],
            total_time_seconds=total_time,
            strategies_used=result["strategies_used"],
            reasoning_iterations=result["reasoning_iterations"],
            self_heal_attempts=result["self_heal_attempts"],
            security_alerts=result["security_alerts"],
            guardrail_triggers=result["guardrail_triggers"],
            confidence=result["confidence"],
            final_output=result["final_output"],
            traces=result["traces"],
        )
        
    except Exception as e:
        agent_invocations.labels(agent_type="orchestrator", status="failure").inc()
        raise HTTPException(status_code=500, detail=str(e))
