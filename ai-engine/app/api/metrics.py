"""
Metrics API Endpoints

Expose metrics for monitoring and analysis.
"""

from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.metrics.calculator import MetricsCalculator

router = APIRouter()
calculator = MetricsCalculator()


class AgentMetricsResponse(BaseModel):
    """Response model for agent metrics."""
    total_invocations: int
    success_rate: float
    average_latency: dict[str, float]
    total_tokens: int
    total_cost: float
    by_agent: dict[str, dict[str, Any]]
    by_model: dict[str, dict[str, Any]]


class CostMetricsResponse(BaseModel):
    """Response model for cost metrics."""
    total_cost: float
    by_model: dict[str, float]
    by_agent: dict[str, float]
    by_day: list[dict[str, Any]]
    cost_savings: float
    cache_hit_rate: float


class SecurityMetricsResponse(BaseModel):
    """Response model for security metrics."""
    total_scans: int
    blocked_count: int
    warning_count: int
    safe_count: int
    prompt_injections_detected: int
    dlp_alerts: dict[str, int]
    security_score: float


class SHRMetricsResponse(BaseModel):
    """Response model for self-healing metrics."""
    total_attempts: int
    successful_heals: int
    shr: float  # Self-Healing Rate
    by_error_type: dict[str, dict[str, int]]
    average_recovery_time: float
    auto_recovered_percentage: float


@router.get("/agents", response_model=AgentMetricsResponse)
async def get_agent_metrics():
    """
    Get agent performance metrics.
    
    Returns:
    - Total invocations across all agents
    - Success rate
    - Average latency by agent type
    - Token usage totals
    - Cost totals
    - Breakdown by agent and model
    """
    return AgentMetricsResponse(
        total_invocations=calculator.get_total_invocations(),
        success_rate=calculator.get_success_rate(),
        average_latency=calculator.get_average_latencies(),
        total_tokens=calculator.get_total_tokens(),
        total_cost=calculator.get_total_cost(),
        by_agent=calculator.get_metrics_by_agent(),
        by_model=calculator.get_metrics_by_model(),
    )


@router.get("/costs", response_model=CostMetricsResponse)
async def get_cost_metrics():
    """
    Get cost-related metrics.
    
    Returns:
    - Total cost in USD
    - Cost breakdown by model
    - Cost breakdown by agent
    - Daily cost trend
    - Cost savings from caching and optimization
    - Cache hit rate
    """
    return CostMetricsResponse(
        total_cost=calculator.get_total_cost(),
        by_model=calculator.get_cost_by_model(),
        by_agent=calculator.get_cost_by_agent(),
        by_day=calculator.get_daily_costs(),
        cost_savings=calculator.calculate_cost_savings(),
        cache_hit_rate=calculator.get_cache_hit_rate(),
    )


@router.get("/security", response_model=SecurityMetricsResponse)
async def get_security_metrics():
    """
    Get security-related metrics.
    
    Returns:
    - Total code scans
    - Blocked code count
    - Warning count
    - Safe code count
    - Prompt injection detections
    - DLP alerts by type
    - Overall security score
    """
    return SecurityMetricsResponse(
        total_scans=calculator.get_total_scans(),
        blocked_count=calculator.get_blocked_count(),
        warning_count=calculator.get_warning_count(),
        safe_count=calculator.get_safe_count(),
        prompt_injections_detected=calculator.get_injection_detections(),
        dlp_alerts=calculator.get_dlp_alerts(),
        security_score=calculator.calculate_security_score(),
    )


@router.get("/self-healing", response_model=SHRMetricsResponse)
async def get_self_healing_metrics():
    """
    Get self-healing metrics.
    
    The Self-Healing Rate (SHR) is defined as:
    
    SHR = |{c : C(s, c_repaired) = 1 | C(s, c_original) = 0}|
          ─────────────────────────────────────────────────
          |{c : C(s, c_original) = 0}|
    
    Where:
    - C(s, c) is the connection function (1 = connected, 0 = failed)
    - c_original is the original configuration
    - c_repaired is the AI-repaired configuration
    
    Returns:
    - Total heal attempts
    - Successful heals
    - SHR (Self-Healing Rate)
    - Breakdown by error type
    - Average recovery time
    - Percentage auto-recovered (no human intervention)
    """
    return SHRMetricsResponse(
        total_attempts=calculator.get_total_heal_attempts(),
        successful_heals=calculator.get_successful_heals(),
        shr=calculator.calculate_shr(),
        by_error_type=calculator.get_heal_metrics_by_error(),
        average_recovery_time=calculator.get_average_recovery_time(),
        auto_recovered_percentage=calculator.get_auto_recovered_percentage(),
    )


@router.get("/autoscore")
async def get_autoscore():
    """
    Calculate and return AutoScore for all workflows.
    
    AutoScore(W) = (1/|V|) * Σ [w1*Success(v) + w2*(1/Latency(v)) + w3*SHR(v)]
    
    Where:
    - V = set of nodes/tasks
    - w1 + w2 + w3 = 1
    - w1 = 0.5 (success weight)
    - w2 = 0.3 (speed weight)
    - w3 = 0.2 (self-healing weight)
    """
    return {
        "autoscore": calculator.calculate_autoscore(),
        "components": {
            "success_component": calculator.get_success_component(),
            "latency_component": calculator.get_latency_component(),
            "shr_component": calculator.get_shr_component(),
        },
        "weights": {
            "success": 0.5,
            "latency": 0.3,
            "shr": 0.2,
        },
    }


@router.get("/success-probability")
async def get_success_probability():
    """
    Calculate success probability based on completeness bound.
    
    Theorem 1: P(Success(t)) >= 1 - Π(1 - p_i(t))
    
    Where K strategies:
    - p1 = P(Static API success)
    - p2 = P(Self-Healing success)
    - p3 = P(Code Generation success)
    """
    rates = calculator.get_strategy_success_rates()
    
    # Calculate probability
    p_api = rates.get("static_api", 0.7)
    p_heal = rates.get("self_heal", 0.6)
    p_code = rates.get("code_gen", 0.5)
    
    # 1 - (1-p_api)(1-p_heal)(1-p_code)
    probability = 1 - (1 - p_api) * (1 - p_heal) * (1 - p_code)
    
    return {
        "probability": probability,
        "strategy_rates": rates,
        "formula": "P(Success) >= 1 - (1-p_api)(1-p_heal)(1-p_code)",
        "calculation": {
            "p_api": p_api,
            "p_heal": p_heal,
            "p_code": p_code,
            "complement_product": (1 - p_api) * (1 - p_heal) * (1 - p_code),
        },
    }


@router.get("/export")
async def export_metrics(format: str = "json"):
    """
    Export all metrics in the specified format.
    
    Formats:
    - json: Full JSON export
    - csv: Comma-separated values
    - prometheus: Prometheus text format
    """
    if format == "json":
        return calculator.export_json()
    elif format == "csv":
        return {"data": calculator.export_csv()}
    elif format == "prometheus":
        return {"data": calculator.export_prometheus()}
    else:
        return {"error": f"Unknown format: {format}"}
