"""
CortexOps Planner Agent

Decomposes complex tasks into atomic, executable steps.

Mathematical Model:
The planner outputs a DAG of tasks:
    Plan(T) = {s₁, s₂, ..., sₙ}
    
Where each step sᵢ has:
    - dependencies: {sⱼ : sⱼ must complete before sᵢ}
    - estimated_complexity: "simple" | "medium" | "complex"
    - security_risk: "low" | "medium" | "high"
    - can_parallel: boolean
"""

import time
from typing import Any
from dataclasses import dataclass

from app.metrics.collector import agent_invocations, agent_latency


@dataclass
class PlanStep:
    """A single step in the execution plan."""
    step_id: str
    description: str
    type: str  # "api_call" | "code_gen" | "transform" | "condition"
    dependencies: list[str]
    estimated_complexity: str  # "simple" | "medium" | "complex"
    security_risk: str  # "low" | "medium" | "high"
    can_parallel: bool
    config: dict[str, Any]


class PlannerAgent:
    """
    Agent responsible for task decomposition.
    
    Takes a natural language task and breaks it into:
    1. Ordered steps with dependencies
    2. Complexity estimates for each step
    3. Security risk assessment
    4. Parallelization opportunities
    """
    
    SYSTEM_PROMPT = """You are the Planner Agent for CortexOps, an intelligent workflow automation engine.

Your role is to decompose complex tasks into atomic, executable steps.

RULES:
1. Break down tasks into minimal atomic operations
2. Identify dependencies between steps
3. Assess complexity: simple (1 action), medium (2-3 actions), complex (4+ actions)
4. Assess security risk: low (read-only), medium (write operations), high (code execution)
5. Identify parallelization opportunities
6. Always start with a trigger step
7. Always end with an output step

OUTPUT FORMAT (JSON):
{
    "steps": [
        {
            "step_id": "step_1",
            "description": "Description of step",
            "type": "api_call|code_gen|transform|condition",
            "dependencies": [],
            "estimated_complexity": "simple|medium|complex",
            "security_risk": "low|medium|high",
            "can_parallel": true|false,
            "config": {}
        }
    ],
    "total_steps": 3,
    "estimated_tokens": 500,
    "estimated_cost": 0.01,
    "complexity": "simple|medium|complex"
}"""

    async def plan(
        self,
        task: str,
        connectors: list[str] | None = None,
        tools: list[str] | None = None,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Decompose a task into atomic steps.
        
        Args:
            task: Natural language task description
            connectors: Available connectors (Slack, GitHub, etc.)
            tools: Available tools (HTTP, Code, etc.)
            context: Additional context (previous outputs, etc.)
            
        Returns:
            Dictionary with steps, estimates, and complexity
        """
        start_time = time.time()
        
        # Build prompt
        prompt = f"""Decompose this task into atomic steps:

TASK: {task}

AVAILABLE CONNECTORS: {', '.join(connectors or ['http', 'slack', 'email', 'database'])}
AVAILABLE TOOLS: {', '.join(tools or ['http_request', 'code_executor', 'transform', 'filter'])}
CONTEXT: {context or {}}

Provide the plan in JSON format."""

        # In production, this would call an LLM
        # For now, we use intelligent pattern matching
        result = await self._generate_plan(task, connectors or [], tools or [])
        
        # Record metrics
        latency = time.time() - start_time
        agent_invocations.labels(agent_type="planner", status="success").inc()
        agent_latency.labels(agent_type="planner").observe(latency)
        
        return result
    
    async def _generate_plan(
        self,
        task: str,
        connectors: list[str],
        tools: list[str],
    ) -> dict[str, Any]:
        """Generate a plan based on task analysis."""
        task_lower = task.lower()
        steps = []
        
        # Detect trigger
        if "every" in task_lower or "daily" in task_lower or "schedule" in task_lower:
            steps.append({
                "step_id": "trigger",
                "description": "Scheduled trigger",
                "type": "trigger",
                "dependencies": [],
                "estimated_complexity": "simple",
                "security_risk": "low",
                "can_parallel": False,
                "config": {"type": "cron"},
            })
        elif "webhook" in task_lower or "when" in task_lower:
            steps.append({
                "step_id": "trigger",
                "description": "Webhook trigger",
                "type": "trigger",
                "dependencies": [],
                "estimated_complexity": "simple",
                "security_risk": "low",
                "can_parallel": False,
                "config": {"type": "webhook"},
            })
        else:
            steps.append({
                "step_id": "trigger",
                "description": "Manual trigger",
                "type": "trigger",
                "dependencies": [],
                "estimated_complexity": "simple",
                "security_risk": "low",
                "can_parallel": False,
                "config": {"type": "manual"},
            })
        
        # Detect data retrieval
        if "fetch" in task_lower or "get" in task_lower or "query" in task_lower:
            steps.append({
                "step_id": "fetch_data",
                "description": "Fetch data from source",
                "type": "api_call",
                "dependencies": ["trigger"],
                "estimated_complexity": "simple",
                "security_risk": "low",
                "can_parallel": False,
                "config": {"method": "GET"},
            })
        
        # Detect database operations
        if "database" in task_lower or "sql" in task_lower or "query" in task_lower:
            steps.append({
                "step_id": "db_query",
                "description": "Execute database query",
                "type": "code_gen",
                "dependencies": ["trigger"],
                "estimated_complexity": "medium",
                "security_risk": "medium",
                "can_parallel": False,
                "config": {"language": "python"},
            })
        
        # Detect AI processing
        if "ai" in task_lower or "analyze" in task_lower or "summarize" in task_lower or "process" in task_lower:
            steps.append({
                "step_id": "ai_process",
                "description": "AI processing and analysis",
                "type": "code_gen",
                "dependencies": [steps[-1]["step_id"]] if len(steps) > 1 else ["trigger"],
                "estimated_complexity": "medium",
                "security_risk": "medium",
                "can_parallel": False,
                "config": {"model": "gpt-4o-mini"},
            })
        
        # Detect transformations
        if "transform" in task_lower or "convert" in task_lower or "format" in task_lower:
            steps.append({
                "step_id": "transform",
                "description": "Transform data",
                "type": "transform",
                "dependencies": [steps[-1]["step_id"]],
                "estimated_complexity": "simple",
                "security_risk": "low",
                "can_parallel": True,
                "config": {},
            })
        
        # Detect conditions
        if "if" in task_lower or "when" in task_lower or "check" in task_lower:
            steps.append({
                "step_id": "condition",
                "description": "Check condition",
                "type": "condition",
                "dependencies": [steps[-1]["step_id"]],
                "estimated_complexity": "simple",
                "security_risk": "low",
                "can_parallel": False,
                "config": {},
            })
        
        # Detect output
        if "slack" in task_lower or "notify" in task_lower:
            steps.append({
                "step_id": "output",
                "description": "Send to Slack",
                "type": "api_call",
                "dependencies": [steps[-1]["step_id"]],
                "estimated_complexity": "simple",
                "security_risk": "low",
                "can_parallel": False,
                "config": {"channel": "slack"},
            })
        elif "email" in task_lower or "send" in task_lower:
            steps.append({
                "step_id": "output",
                "description": "Send email",
                "type": "api_call",
                "dependencies": [steps[-1]["step_id"]],
                "estimated_complexity": "simple",
                "security_risk": "low",
                "can_parallel": False,
                "config": {"channel": "email"},
            })
        else:
            steps.append({
                "step_id": "output",
                "description": "Return response",
                "type": "api_call",
                "dependencies": [steps[-1]["step_id"]] if steps else [],
                "estimated_complexity": "simple",
                "security_risk": "low",
                "can_parallel": False,
                "config": {"channel": "response"},
            })
        
        # Calculate estimates
        total_tokens = len(steps) * 200  # Rough estimate
        total_cost = total_tokens * 0.00001  # Rough estimate
        complexity = "simple" if len(steps) <= 3 else ("medium" if len(steps) <= 6 else "complex")
        
        return {
            "steps": steps,
            "total_steps": len(steps),
            "estimated_tokens": total_tokens,
            "estimated_cost": total_cost,
            "complexity": complexity,
        }
    
    async def parse_natural_language(self, command: str) -> dict[str, Any]:
        """Parse a natural language command into a workflow suggestion."""
        result = await self.plan(task=command)
        
        # Add additional metadata for NL parsing
        return {
            "plan": result["steps"],
            "estimated_duration": len(result["steps"]) * 2,  # seconds
            "estimated_cost": result["estimated_cost"],
            "risk_level": "low" if all(s["security_risk"] == "low" for s in result["steps"]) else "medium",
            "confidence": 0.85,
            "original_command": command,
        }
