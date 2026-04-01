from typing import Dict, Any


def plan_prompt(error: Dict[str, Any], context: Dict[str, Any] | None = None) -> str:
    # Lightweight plan prompt – could be extended with few-shot examples
    err = error.get("message", "Unknown error")
    return f"Plan a minimal, low-cost recovery for error: {err}. Include steps, inputs, outputs, and estimated cost."


def execution_prompt(plan: Dict[str, Any], context: Dict[str, Any] | None = None) -> str:
    return f"Execute the plan: {plan.get('id', '')} with steps: {plan.get('steps', [])}"
