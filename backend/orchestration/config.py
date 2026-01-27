"""
Orchestration Configuration - Phase 1

Configuration settings for the multi-agent orchestration system.
"""

from dataclasses import dataclass
import os


@dataclass
class OrchestrationConfig:
    """Configuration for the orchestration system."""

    # Redis connection for LangGraph checkpointing
    redis_url: str = os.getenv("LANGGRAPH_REDIS_URL", "redis://localhost:6379/1")

    # Checkpoint time-to-live in seconds (default: 24 hours)
    checkpoint_ttl: int = int(os.getenv("ORCHESTRATION_CHECKPOINT_TTL", "86400"))

    # Health score thresholds
    health_warning_threshold: float = 0.45  # Below this = struggling
    health_critical_threshold: float = 0.25  # Below this = critical

    # Intervention triggers
    max_consecutive_struggles: int = 3  # Trigger progress tracker after this many

    # Progress check intervals (in interactions)
    routine_check_interval: int = 5  # Check every N interactions

    # Visual feedback settings
    enable_visual_feedback: bool = True


# Singleton config instance
_config: OrchestrationConfig | None = None


def get_config() -> OrchestrationConfig:
    """Get the orchestration configuration singleton."""
    global _config
    if _config is None:
        _config = OrchestrationConfig()
    return _config
