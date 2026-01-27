"""
Phase 0–1 acceptance test fixtures.

Provides orchestration graph, initial state, and thread_id for phase01 tests.
"""

from __future__ import annotations

import os
import uuid

import pytest

from orchestration import (
    create_orchestration_graph,
    create_initial_state,
    OrchestratorState,
    AgentType,
    SessionPhase,
)


class _FakeLLM:
    """Minimal LLM mock for integration tests that invoke the graph."""

    def complete(self, messages, config=None):
        from models.llm import LLMResponse
        return LLMResponse(content="[mock] OK", model="mock", provider="mock")

    def stream(self, messages, config=None):
        from models.llm import StreamChunk
        yield StreamChunk(content="[mock] OK", is_finished=True)


@pytest.fixture
def mock_llm(mocker):
    """Mock get_llm_provider so the tutor uses FakeLLM (no external API calls)."""
    mocker.patch("agent.tutor.get_llm_provider", return_value=_FakeLLM())


@pytest.fixture
def orchestration_graph():
    """Orchestration graph with MemorySaver checkpointer."""
    return create_orchestration_graph(redis_url=None, with_checkpointer=True)


@pytest.fixture
def orchestration_graph_no_checkpoint():
    """Orchestration graph without checkpointer."""
    return create_orchestration_graph(with_checkpointer=False)


@pytest.fixture
def thread_id():
    """Unique thread ID for checkpointing."""
    return f"test-{uuid.uuid4()}"


@pytest.fixture
def initial_state():
    """Create initial orchestration state with minimal course outline.

    Uses course_outline so orchestrator transitions to ACTIVE_TUTORING.
    """
    session_id = f"sess-{uuid.uuid4()}"
    user_id = "user@example.com"
    course_id = "course-001"
    course_outline = {
        "metadata": {"title": "Test Course"},
        "sections": [
            {
                "title": "Section 1",
                "subtopics": [{"title": "Topic 1", "description": "Intro"}],
            }
        ],
    }
    return create_initial_state(
        session_id=session_id,
        user_id=user_id,
        course_id=course_id,
        course_outline=course_outline,
    )


@pytest.fixture
def initial_state_no_outline():
    """Initial state without course_outline (orchestrator routes to course_creator)."""
    return create_initial_state(
        session_id=f"sess-{uuid.uuid4()}",
        user_id="user@example.com",
    )


def make_initial_state(
    *,
    session_id: str | None = None,
    user_id: str = "user@example.com",
    course_id: str | None = None,
    course_outline: dict | None = None,
    current_phase: SessionPhase | None = None,
    active_agent: AgentType | None = None,
) -> OrchestratorState:
    """Build initial state with optional overrides."""
    state = create_initial_state(
        session_id=session_id or f"sess-{uuid.uuid4()}",
        user_id=user_id,
        course_id=course_id,
        course_outline=course_outline or {
            "metadata": {"title": "Test"},
            "sections": [],
        },
    )
    if current_phase is not None:
        state["current_phase"] = current_phase
    if active_agent is not None:
        state["active_agent"] = active_agent
    return state


@pytest.fixture
def redis_url():
    """Redis URL from env; None if not set."""
    return os.getenv("LANGGRAPH_REDIS_URL")


def redis_available(redis_url: str | None) -> bool:
    """Check if Redis is reachable."""
    if not redis_url:
        return False
    try:
        import redis
        r = redis.from_url(redis_url)
        r.ping()
        return True
    except Exception:
        return False
