"""
CortexOps AI Engine Configuration

All settings are loaded from environment variables.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "CortexOps AI Engine"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # Server
    host: str = "0.0.0.0"
    port: int = 8100

    # LLM APIs
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    
    # Default models for each complexity level
    model_simple: str = "gpt-4o-mini"
    model_medium: str = "gpt-4o-mini"
    model_complex: str = "gpt-4o"
    model_critical: str = "gpt-4o"

    # ChromaDB
    chromadb_url: str = "http://localhost:8000"
    chromadb_persist_dir: str = "./data/chroma"

    # Metrics
    metrics_enabled: bool = True
    prometheus_port: int = 9090

    # Sandbox
    sandbox_enabled: bool = True
    sandbox_image: str = "cortexops-sandbox:latest"
    sandbox_memory_limit: str = "256m"
    sandbox_cpu_limit: float = 0.5
    sandbox_timeout: int = 30
    sandbox_network: bool = False

    # Guardrails
    guardrails_max_iterations: int = 10
    guardrails_max_time: int = 300
    guardrails_max_tokens: int = 50000
    guardrails_max_cost: float = 1.0
    guardrails_max_code_attempts: int = 3
    guardrails_max_heal_attempts: int = 3
    guardrails_stagnation_threshold: int = 3
    guardrails_hitl_threshold: float = 0.7
    guardrails_max_file_size_mb: int = 50
    guardrails_max_api_calls_per_min: int = 100

    # Security
    jwt_secret: str = "change-me-in-production-min-32-chars"
    jwt_algorithm: str = "HS256"
    encryption_key: str = "change-me-32-bytes-encryption-k"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return not self.debug


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Export for convenience
settings = get_settings()
