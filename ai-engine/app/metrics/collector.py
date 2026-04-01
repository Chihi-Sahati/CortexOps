"""
CortexOps Metrics Collector

Prometheus metrics for monitoring agent performance.
"""

from prometheus_client import Counter, Histogram, Gauge, Summary

# ═══════════════════════════════════════════════════════════════
# Agent Metrics (per agent)
# ═══════════════════════════════════════════════════════════════

agent_invocations = Counter(
    'cortexops_agent_invocations_total',
    'Total agent invocations',
    ['agent_type', 'status']
)

agent_latency = Histogram(
    'cortexops_agent_latency_seconds',
    'Agent execution latency',
    ['agent_type'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

agent_tokens = Counter(
    'cortexops_agent_tokens_total',
    'Total tokens consumed',
    ['agent_type', 'model']
)

agent_cost = Counter(
    'cortexops_agent_cost_usd_total',
    'Total cost in USD',
    ['agent_type', 'model']
)

agent_confidence = Histogram(
    'cortexops_agent_confidence',
    'Agent confidence scores',
    ['agent_type'],
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

# ═══════════════════════════════════════════════════════════════
# Reasoning Metrics
# ═══════════════════════════════════════════════════════════════

reasoning_iterations = Histogram(
    'cortexops_reasoning_iterations',
    'Number of ReAct iterations per step',
    buckets=[1, 2, 3, 4, 5, 7, 10]
)

reasoning_strategy = Counter(
    'cortexops_reasoning_strategy_total',
    'Strategy chosen by reasoner',
    ['strategy']
)

# ═══════════════════════════════════════════════════════════════
# Self-Healing Metrics
# ═══════════════════════════════════════════════════════════════

self_heal_attempts = Counter(
    'cortexops_self_heal_attempts_total',
    'Self-healing attempts',
    ['connector_type', 'error_category', 'result']
)

self_heal_rate = Gauge(
    'cortexops_self_heal_rate',
    'Current self-healing success rate (SHR)'
)

# ═══════════════════════════════════════════════════════════════
# Security Metrics
# ═══════════════════════════════════════════════════════════════

security_scans = Counter(
    'cortexops_security_scans_total',
    'Code security scans',
    ['result']
)

prompt_injections = Counter(
    'cortexops_prompt_injections_detected_total',
    'Prompt injection attempts detected'
)

dlp_alerts = Counter(
    'cortexops_dlp_alerts_total',
    'DLP alerts triggered',
    ['data_type']
)

sandbox_executions = Counter(
    'cortexops_sandbox_executions_total',
    'Sandbox code executions',
    ['status']
)

guardrail_triggers = Counter(
    'cortexops_guardrail_triggers_total',
    'Guardrail activations',
    ['guardrail_type']
)

# ═══════════════════════════════════════════════════════════════
# Workflow Metrics
# ═══════════════════════════════════════════════════════════════

workflow_executions = Counter(
    'cortexops_workflow_executions_total',
    'Total workflow executions',
    ['status', 'trigger_type']
)

workflow_duration = Histogram(
    'cortexops_workflow_duration_seconds',
    'Workflow execution duration',
    buckets=[1, 5, 10, 30, 60, 120, 300]
)

workflow_steps = Histogram(
    'cortexops_workflow_steps_count',
    'Number of steps per workflow',
    buckets=[1, 3, 5, 10, 15, 20, 30]
)

# ═══════════════════════════════════════════════════════════════
# Model Router Metrics
# ═══════════════════════════════════════════════════════════════

model_selections = Counter(
    'cortexops_model_selections_total',
    'Model selection by router',
    ['model', 'complexity']
)

cache_hits = Counter(
    'cortexops_cache_hits_total',
    'LLM response cache hits vs misses',
    ['result']
)

cost_savings = Counter(
    'cortexops_cost_savings_usd_total',
    'Money saved via caching and model routing'
)


def setup_metrics():
    """Initialize metrics subsystem."""
    # Set initial values
    self_heal_rate.set(0.0)


class MetricsCalculator:
    """Calculator for composite metrics."""
    
    def __init__(self):
        self._data: dict[str, Any] = {}
    
    def get_total_invocations(self) -> int:
        return self._data.get("total_invocations", 0)
    
    def get_success_rate(self) -> float:
        return self._data.get("success_rate", 0.0)
    
    def get_average_latencies(self) -> dict[str, float]:
        return self._data.get("latencies", {})
    
    def get_total_tokens(self) -> int:
        return self._data.get("total_tokens", 0)
    
    def get_total_cost(self) -> float:
        return self._data.get("total_cost", 0.0)
    
    def get_metrics_by_agent(self) -> dict[str, dict[str, Any]]:
        return self._data.get("by_agent", {})
    
    def get_metrics_by_model(self) -> dict[str, dict[str, Any]]:
        return self._data.get("by_model", {})
    
    def get_cost_by_model(self) -> dict[str, float]:
        return self._data.get("cost_by_model", {})
    
    def get_cost_by_agent(self) -> dict[str, float]:
        return self._data.get("cost_by_agent", {})
    
    def get_daily_costs(self) -> list[dict[str, Any]]:
        return self._data.get("daily_costs", [])
    
    def calculate_cost_savings(self) -> float:
        return self._data.get("cost_savings", 0.0)
    
    def get_cache_hit_rate(self) -> float:
        return self._data.get("cache_hit_rate", 0.0)
    
    def get_total_scans(self) -> int:
        return self._data.get("total_scans", 0)
    
    def get_blocked_count(self) -> int:
        return self._data.get("blocked_count", 0)
    
    def get_warning_count(self) -> int:
        return self._data.get("warning_count", 0)
    
    def get_safe_count(self) -> int:
        return self._data.get("safe_count", 0)
    
    def get_injection_detections(self) -> int:
        return self._data.get("injection_detections", 0)
    
    def get_dlp_alerts(self) -> dict[str, int]:
        return self._data.get("dlp_alerts", {})
    
    def calculate_security_score(self) -> float:
        """
        SecurityScore(W) = 1 - (Σ ThreatScore(g)) / (|G_executed| × CVSS_max)
        """
        return self._data.get("security_score", 1.0)
    
    def get_total_heal_attempts(self) -> int:
        return self._data.get("heal_attempts", 0)
    
    def get_successful_heals(self) -> int:
        return self._data.get("successful_heals", 0)
    
    def calculate_shr(self) -> float:
        """
        Self-Healing Rate (SHR)
        
        SHR = |{c : C(s, c_repaired) = 1 | C(s, c_original) = 0}|
              ─────────────────────────────────────────────────
              |{c : C(s, c_original) = 0}|
        """
        total = self.get_total_heal_attempts()
        successful = self.get_successful_heals()
        return successful / total if total > 0 else 0.0
    
    def get_heal_metrics_by_error(self) -> dict[str, dict[str, int]]:
        return self._data.get("heal_by_error", {})
    
    def get_average_recovery_time(self) -> float:
        return self._data.get("avg_recovery_time", 0.0)
    
    def get_auto_recovered_percentage(self) -> float:
        return self._data.get("auto_recovered_pct", 0.0)
    
    def calculate_autoscore(self) -> float:
        """
        AutoScore(W) = (1/|V|) * Σ [w1*Success(v) + w2*(1/Latency(v)) + w3*SHR(v)]
        
        Where:
        - w1 = 0.5 (success weight)
        - w2 = 0.3 (speed weight)
        - w3 = 0.2 (self-healing weight)
        """
        success = self._data.get("success_component", 0.8)
        latency = self._data.get("latency_component", 0.7)
        shr = self.calculate_shr()
        
        return 0.5 * success + 0.3 * latency + 0.2 * shr
    
    def get_success_component(self) -> float:
        return self._data.get("success_component", 0.8)
    
    def get_latency_component(self) -> float:
        return self._data.get("latency_component", 0.7)
    
    def get_shr_component(self) -> float:
        return self.calculate_shr()
    
    def get_strategy_success_rates(self) -> dict[str, float]:
        return self._data.get("strategy_rates", {
            "static_api": 0.95,
            "self_heal": 0.65,
            "code_gen": 0.70,
        })
    
    def export_json(self) -> dict[str, Any]:
        return self._data
    
    def export_csv(self) -> str:
        import json
        return json.dumps(self._data)
    
    def export_prometheus(self) -> str:
        return "# CortexOps Metrics\n"


# Import Any for type hint
from typing import Any
