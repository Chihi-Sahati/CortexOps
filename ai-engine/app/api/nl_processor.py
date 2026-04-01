"""
Natural Language Processing API Endpoints

Parse natural language commands to workflows.
"""

from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class ParseRequest(BaseModel):
    """Request model for NL parsing."""
    command: str = Field(..., description="Natural language command")
    context: dict[str, Any] = Field(default={}, description="Additional context")


class ParseResponse(BaseModel):
    """Response model for NL parsing."""
    plan: list[dict[str, Any]]
    estimated_duration: float
    estimated_cost: float
    risk_level: str
    confidence: float
    original_command: str


class SuggestRequest(BaseModel):
    """Request model for suggestions."""
    partial: str = Field(..., description="Partial input")
    cursor_position: int = Field(default=0, description="Cursor position")


class SuggestResponse(BaseModel):
    """Response model for suggestions."""
    suggestions: list[dict[str, Any]]
    completions: list[str]


class ExplainRequest(BaseModel):
    """Request model for explanation."""
    workflow: dict[str, Any] = Field(..., description="Workflow definition")
    detail_level: str = Field(default="medium", description="Detail level: brief, medium, detailed")


class ExplainResponse(BaseModel):
    """Response model for explanation."""
    explanation: str
    step_breakdown: list[dict[str, str]]
    warnings: list[str]


@router.post("/parse", response_model=ParseResponse)
async def parse_nl_command(request: ParseRequest):
    """
    Parse a natural language command into a workflow plan.
    
    Examples:
    - "Every day at 9 AM, send sales report to Slack"
    - "When a new GitHub issue is created, analyze it and create a Jira ticket"
    - "Monitor API health every 5 minutes and alert on Slack if down"
    """
    from app.agents.planner_agent import PlannerAgent
    
    planner = PlannerAgent()
    
    try:
        result = await planner.parse_natural_language(request.command)
        
        return ParseResponse(
            plan=result["plan"],
            estimated_duration=result["estimated_duration"],
            estimated_cost=result["estimated_cost"],
            risk_level=result["risk_level"],
            confidence=result["confidence"],
            original_command=request.command,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest", response_model=SuggestResponse)
async def get_suggestions(request: SuggestRequest):
    """
    Get auto-complete suggestions for partial input.
    
    Uses context and patterns to suggest:
    - Node types
    - Connector names
    - Common patterns
    """
    # Placeholder implementation
    suggestions = [
        {"type": "node", "text": "Send to Slack", "node_type": "output.notification"},
        {"type": "node", "text": "HTTP Request", "node_type": "action.http"},
        {"type": "pattern", "text": "Daily report to Slack", "pattern": "daily_report"},
    ]
    
    completions = [
        "Send a message to Slack channel",
        "Schedule a daily report",
        "Monitor API endpoint",
    ]
    
    return SuggestResponse(suggestions=suggestions, completions=completions)


@router.post("/explain", response_model=ExplainResponse)
async def explain_workflow(request: ExplainRequest):
    """
    Explain a workflow in natural language.
    
    Generates a human-readable description of what the workflow does.
    """
    steps = request.workflow.get("nodes", [])
    
    explanation_parts = []
    step_breakdown = []
    warnings = []
    
    # Simple explanation generation
    for i, step in enumerate(steps, 1):
        step_type = step.get("type", "unknown")
        step_name = step.get("name", f"Step {i}")
        
        description = _describe_node(step_type, step.get("config", {}))
        step_breakdown.append({
            "step": str(i),
            "name": step_name,
            "type": step_type,
            "description": description,
        })
        explanation_parts.append(f"Step {i}: {description}")
    
    explanation = ". ".join(explanation_parts)
    
    # Check for potential issues
    if not any(s.get("type", "").startswith("trigger.") for s in steps):
        warnings.append("No trigger node found - workflow may not execute")
    
    if not any(s.get("type", "").startswith("output.") for s in steps):
        warnings.append("No output node found - workflow produces no visible result")
    
    return ExplainResponse(
        explanation=explanation,
        step_breakdown=step_breakdown,
        warnings=warnings,
    )


def _describe_node(node_type: str, config: dict[str, Any]) -> str:
    """Generate a description for a node."""
    descriptions = {
        "trigger.webhook": f"Receive webhook request via {config.get('method', 'POST')}",
        "trigger.cron": f"Execute on schedule: {config.get('cronExpression', 'not set')}",
        "trigger.manual": "Manually triggered",
        "action.http": f"Make {config.get('method', 'GET')} request to {config.get('url', 'endpoint')}",
        "action.code": f"Execute custom {config.get('language', 'Python')} code",
        "action.ai": f"Process with {config.get('model', 'AI')} model",
        "logic.if_else": f"Check condition: {config.get('condition', 'not set')}",
        "logic.switch": "Route to different paths based on value",
        "logic.loop": "Iterate over items",
        "output.notification": f"Send notification via {config.get('channel', 'service')}",
        "output.response": "Return HTTP response",
    }
    
    return descriptions.get(node_type, f"Execute {node_type}")
