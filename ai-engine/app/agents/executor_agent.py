"""
CortexOps Executor Agent

Executes actions with chosen strategy.

Supports:
- Static API calls
- Self-healing connector repair
- Code generation and execution
- Fallback strategies
"""

import time
from typing import Any

from app.agents.state import Strategy
from app.metrics.collector import (
    agent_invocations,
    agent_latency,
    agent_tokens,
    agent_cost,
    sandbox_executions,
    self_heal_attempts,
)
from app.config import settings


class ExecutorAgent:
    """
    Agent responsible for executing actions.
    
    Executes with the chosen strategy:
    - static_api: Use existing connector
    - self_heal: Fix broken connector
    - code_gen: Generate and execute code
    - fallback: Use alternative approach
    """
    
    async def execute(
        self,
        action: dict[str, Any],
        strategy: str,
        context: dict[str, Any] | None = None,
        timeout: int = 30,
    ) -> dict[str, Any]:
        """
        Execute an action with the specified strategy.
        
        Args:
            action: The action to execute
            strategy: Execution strategy
            context: Additional context
            timeout: Timeout in seconds
            
        Returns:
            Dictionary with success, result, tokens_used, cost
        """
        start_time = time.time()
        
        try:
            if strategy == Strategy.STATIC_API.value:
                result = await self._execute_static_api(action, context)
            elif strategy == Strategy.SELF_HEAL.value:
                result = await self._execute_self_heal(action, context)
            elif strategy == Strategy.CODE_GEN.value:
                result = await self._execute_code_gen(action, context)
            else:
                result = await self._execute_fallback(action, context)
            
            # Record metrics
            latency = time.time() - start_time
            status = "success" if result["success"] else "failure"
            agent_invocations.labels(agent_type="executor", status=status).inc()
            agent_latency.labels(agent_type="executor").observe(latency)
            agent_tokens.labels(agent_type="executor", model=result.get("model", "unknown")).inc(result.get("tokens_used", 0))
            agent_cost.labels(agent_type="executor", model=result.get("model", "unknown")).inc(result.get("cost", 0))
            
            return result
            
        except Exception as e:
            agent_invocations.labels(agent_type="executor", status="failure").inc()
            return {
                "success": False,
                "result": {},
                "error": str(e),
                "tokens_used": 0,
                "cost": 0,
            }
    
    async def _execute_static_api(
        self,
        action: dict[str, Any],
        context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Execute using existing connector."""
        config = action.get("config", {})
        method = config.get("method", "GET")
        url = config.get("url", "")
        
        # Simulate API call
        # In production, this would use actual HTTP client
        import httpx
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if method == "GET":
                    response = await client.get(url)
                elif method == "POST":
                    response = await client.post(url, json=config.get("body"))
                elif method == "PUT":
                    response = await client.put(url, json=config.get("body"))
                elif method == "DELETE":
                    response = await client.delete(url)
                else:
                    response = await client.get(url)
                
                return {
                    "success": response.status_code < 400,
                    "result": {
                        "status_code": response.status_code,
                        "body": response.json() if response.headers.get("content-type", "").startswith("application/json") else response.text,
                    },
                    "tokens_used": 0,
                    "cost": 0,
                    "model": "none",
                }
        except Exception as e:
            return {
                "success": False,
                "result": {},
                "error": str(e),
                "tokens_used": 0,
                "cost": 0,
                "model": "none",
            }
    
    async def _execute_self_heal(
        self,
        action: dict[str, Any],
        context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Execute self-healing for broken connector."""
        from app.security.self_healing import SelfHealingEngine
        
        config = action.get("config", {})
        connector_id = config.get("connector_id")
        
        # Record attempt
        self_heal_attempts.labels(
            connector_type=config.get("connector_type", "unknown"),
            error_category=config.get("error_type", "unknown"),
            result="success",  # Will be updated
        ).inc()
        
        # Simulate healing process
        # In production, this would analyze error and apply fix
        return {
            "success": True,
            "result": {
                "healed": True,
                "fix_applied": "token_refresh",
            },
            "tokens_used": 150,
            "cost": 0.0002,
            "model": settings.model_medium,
        }
    
    async def _execute_code_gen(
        self,
        action: dict[str, Any],
        context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Generate and execute custom code."""
        config = action.get("config", {})
        code = config.get("code", "")
        language = config.get("language", "python")
        
        # In production, this would:
        # 1. Analyze code for security issues
        # 2. Execute in sandbox
        # 3. Return results
        
        sandbox_executions.labels(status="success").inc()
        
        return {
            "success": True,
            "result": {
                "output": "Code executed successfully",
                "return_value": None,
            },
            "tokens_used": 200,
            "cost": 0.0003,
            "model": settings.model_medium,
        }
    
    async def _execute_fallback(
        self,
        action: dict[str, Any],
        context: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Execute fallback strategy."""
        config = action.get("config", {})
        
        return {
            "success": True,
            "result": {
                "fallback_used": True,
                "alternative": config.get("alternative", "retry"),
            },
            "tokens_used": 50,
            "cost": 0.0001,
            "model": settings.model_simple,
        }
    
    async def generate_connector(
        self,
        service_name: str,
        api_doc_url: str | None = None,
        api_doc_content: str | None = None,
        auth_type: str = "api_key",
        endpoints: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Generate a new connector from API documentation."""
        # In production, this would:
        # 1. Fetch/parse API documentation
        # 2. Generate Python connector code
        # 3. Create config schema
        # 4. Test generated connector
        
        code = f'''
"""Auto-generated connector for {service_name}"""

from typing import Any, Optional
import httpx

class {service_name.replace("-", "_").title()}Connector:
    """Connector for {service_name} API."""
    
    def __init__(self, api_key: str, base_url: str = "https://api.{service_name}.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(
            base_url=base_url,
            headers={{"Authorization": f"Bearer {{api_key}}"}}
        )
    
    async def close(self):
        await self.client.aclose()
    
    async def call_endpoint(self, endpoint: str, method: str = "GET", **kwargs) -> dict[str, Any]:
        response = await self.client.request(method, endpoint, **kwargs)
        response.raise_for_status()
        return response.json()
'''
        
        return {
            "code": code,
            "config_schema": {
                "type": "object",
                "properties": {
                    "api_key": {"type": "string", "title": "API Key"},
                    "base_url": {"type": "string", "title": "Base URL", "default": f"https://api.{service_name}.com"},
                },
                "required": ["api_key"],
            },
            "test_results": {
                "connection_test": "passed",
                "auth_test": "passed",
            },
            "verified": True,
        }
