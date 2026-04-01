"""
CortexOps AI Engine - Main FastAPI Application

The Python microservice that handles all AI-related operations:
- Agent orchestration (LangGraph)
- Natural language processing
- Security analysis
- Self-healing connectors
- Metrics collection
"""

import structlog
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from app.config import settings
from app.api.router import api_router
from app.metrics.collector import setup_metrics

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting CortexOps AI Engine", version=settings.app_version)
    
    # Initialize metrics
    if settings.metrics_enabled:
        setup_metrics()
        logger.info("Metrics initialized")
    
    # Initialize vector store connection
    # await init_vector_store()
    
    yield
    
    logger.info("Shutting down CortexOps AI Engine")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="""
    CortexOps AI Engine provides intelligent workflow automation capabilities:
    
    ## Agents
    - **Planner**: Decomposes tasks into atomic steps
    - **Reasoner**: ReAct reasoning loop for strategy selection
    - **Executor**: Executes actions with chosen strategy
    - **Validator**: Validates execution results
    
    ## Security
    - Static code analysis (SAST)
    - Prompt injection detection
    - Data loss prevention (DLP)
    - Sandboxed code execution
    
    ## Self-Healing
    - Automatic connector repair
    - API schema adaptation
    - Token refresh and retry
    """,
    openapi_url="/ai/openapi.json",
    docs_url="/ai/docs",
    redoc_url="/ai/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    logger.exception(
        "Unhandled exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "details": str(exc) if settings.debug else None,
            }
        },
    )


# Include API routes
app.include_router(api_router, prefix="/ai")

# Mount Prometheus metrics
if settings.metrics_enabled:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)


# Health check endpoint
@app.get("/ai/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "services": {
            "api": "up",
            "vector_store": "up",  # Would check actual status
            "sandbox": "up" if settings.sandbox_enabled else "disabled",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
