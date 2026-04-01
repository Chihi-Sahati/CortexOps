"""
Self-Healing Connector API Endpoints

Diagnose, heal, and generate connectors.
"""

from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()


class DiagnoseRequest(BaseModel):
    """Request model for connector diagnosis."""
    connector_id: str
    connector_type: str
    error: dict[str, Any] = Field(..., description="Error details")
    base_url: str | None = None


class DiagnoseResponse(BaseModel):
    """Response model for diagnosis."""
    error_category: str
    error_description: str
    auto_recoverable: bool
    suggested_strategy: str
    estimated_recovery_time: int


class HealRequest(BaseModel):
    """Request model for healing."""
    connector_id: str
    diagnosis: dict[str, Any]
    auto_confirm: bool = Field(default=False, description="Auto-confirm risky fixes")


class HealResponse(BaseModel):
    """Response model for healing."""
    success: bool
    strategy_used: str
    attempts: int
    fixed_config: dict[str, Any] | None = None
    generated_code: str | None = None
    error: str | None = None


class GenerateRequest(BaseModel):
    """Request model for connector generation."""
    service_name: str
    api_doc_url: str | None = None
    api_doc_content: str | None = None
    auth_type: str = "api_key"
    endpoints: list[dict[str, Any]] | None = None


class GenerateResponse(BaseModel):
    """Response model for connector generation."""
    connector_id: str
    connector_code: str
    config_schema: dict[str, Any]
    test_results: dict[str, Any]
    verified: bool


@router.post("/diagnose", response_model=DiagnoseResponse)
async def diagnose_connector(request: DiagnoseRequest):
    """
    Diagnose a connector error and categorize it.
    
    Error categories:
    - AUTH_EXPIRED (401/403): Token refresh possible
    - RATE_LIMITED (429): Backoff and retry
    - ENDPOINT_CHANGED (404): New endpoint discovery
    - SCHEMA_CHANGED (422): Schema adaptation
    - SERVICE_DOWN (503): Fallback endpoints
    - TIMEOUT: Timeout adjustment
    - UNKNOWN: Manual intervention required
    """
    from app.security.self_healing import SelfHealingEngine
    
    engine = SelfHealingEngine()
    diagnosis = engine.diagnose(
        connector_type=request.connector_type,
        error=request.error,
        base_url=request.base_url,
    )
    
    return DiagnoseResponse(
        error_category=diagnosis.category,
        error_description=diagnosis.description,
        auto_recoverable=diagnosis.auto_recoverable,
        suggested_strategy=diagnosis.strategy,
        estimated_recovery_time=diagnosis.estimated_time,
    )


@router.post("/heal", response_model=HealResponse)
async def heal_connector(request: HealRequest):
    """
    Attempt to heal a broken connector.
    
    Healing strategies:
    1. Re-authenticate (for AUTH_EXPIRED)
    2. Discover new endpoint (for ENDPOINT_CHANGED)
    3. Adapt schema (for SCHEMA_CHANGED)
    4. Generate new connector code (if needed)
    
    Returns:
    - success: Whether healing succeeded
    - strategy_used: Which strategy was applied
    - fixed_config: New configuration if applicable
    - generated_code: New connector code if generated
    """
    from app.security.self_healing import SelfHealingEngine
    from app.metrics.collector import self_heal_attempts, self_heal_rate
    
    engine = SelfHealingEngine()
    result = await engine.heal(
        connector_id=request.connector_id,
        diagnosis=request.diagnosis,
        auto_confirm=request.auto_confirm,
    )
    
    # Record metrics
    self_heal_attempts.labels(
        connector_type=request.diagnosis.get("connector_type", "unknown"),
        error_category=request.diagnosis.get("category", "unknown"),
        result="success" if result.success else "failure",
    ).inc()
    
    return HealResponse(
        success=result.success,
        strategy_used=result.strategy,
        attempts=result.attempts,
        fixed_config=result.fixed_config,
        generated_code=result.generated_code,
        error=result.error,
    )


@router.post("/generate", response_model=GenerateResponse)
async def generate_connector(request: GenerateRequest):
    """
    Generate a new connector from API documentation.
    
    Can generate connectors from:
    - OpenAPI/Swagger specification URL
    - Raw API documentation content
    - Manual endpoint definitions
    
    The generated connector includes:
    - Python class with all methods
    - Configuration schema
    - Authentication handling
    - Error handling
    """
    import uuid
    from app.agents.executor_agent import ExecutorAgent
    
    executor = ExecutorAgent()
    
    try:
        result = await executor.generate_connector(
            service_name=request.service_name,
            api_doc_url=request.api_doc_url,
            api_doc_content=request.api_doc_content,
            auth_type=request.auth_type,
            endpoints=request.endpoints,
        )
        
        return GenerateResponse(
            connector_id=str(uuid.uuid4())[:8],
            connector_code=result["code"],
            config_schema=result["config_schema"],
            test_results=result["test_results"],
            verified=result["verified"],
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{connector_id}/health")
async def get_connector_health(connector_id: str):
    """Get health status of a connector."""
    # Placeholder - would check actual connector health
    return {
        "connector_id": connector_id,
        "status": "healthy",
        "last_check": "2024-01-01T00:00:00Z",
        "consecutive_failures": 0,
        "self_heal_count": 0,
    }
