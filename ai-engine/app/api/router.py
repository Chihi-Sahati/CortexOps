"""
CortexOps AI Engine API Router

Aggregates all API routes for the AI Engine.
"""

from fastapi import APIRouter

from app.api import agents, nl_processor, security, connectors, metrics

api_router = APIRouter()

# Include all sub-routers
api_router.include_router(agents.router, prefix="/agents", tags=["Agents"])
api_router.include_router(nl_processor.router, prefix="/nl", tags=["Natural Language"])
api_router.include_router(security.router, prefix="/security", tags=["Security"])
api_router.include_router(connectors.router, prefix="/connectors", tags=["Connectors"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["Metrics"])
