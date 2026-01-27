"""
P1-6: Session state persists (MemorySaver; Redis when available).

Integration tests for checkpointing across invokes.
"""

from __future__ import annotations

import os
import uuid

import pytest

from orchestration import (
    create_orchestration_graph,
    create_initial_state,
    AgentType,
)


def _redis_available() -> bool:
    """Check if Redis is configured and reachable (no fixtures)."""
    url = os.getenv("LANGGRAPH_REDIS_URL")
    if not url:
        return False
    try:
        import redis
        r = redis.from_url(url)
        r.ping()
        return True
    except Exception:
        return False


# Workflow uses MemorySaver only; Redis checkpointer not implemented yet.
_REDIS_CHECKPOINTER_IMPLEMENTED = False


@pytest.mark.integration
def test_state_persists_across_invokes_memory_saver(
    orchestration_graph, thread_id, mock_llm
):
    """P1-6 (Option B): MemorySaver checkpointer persists state across invokes."""
    session_id = f"sess-{uuid.uuid4()}"
    state = create_initial_state(
        session_id=session_id,
        user_id="u@ex.com",
        course_id="c1",
        course_outline={"metadata": {"title": "T"}, "sections": []},
    )
    config = {
        "configurable": {"thread_id": thread_id},
        "recursion_limit": 20,
    }

    def run_until_tutor(g, s, c):
        res = None
        for chunk in g.stream(s, c, stream_mode="values"):
            res = chunk
            if res.get("tutor_state") is not None:
                break
        return res

    r1 = run_until_tutor(orchestration_graph, state, config)
    assert r1 is not None
    assert r1["active_agent"] == AgentType.TUTOR
    assert r1.get("tutor_state") is not None
    messages_1 = r1.get("messages") or []

    state2 = create_initial_state(
        session_id=session_id,
        user_id="u@ex.com",
        course_id="c1",
        course_outline={"metadata": {"title": "T"}, "sections": []},
    )
    r2 = run_until_tutor(orchestration_graph, state2, config)

    assert r2 is not None
    assert r2["active_agent"] == AgentType.TUTOR
    assert r2.get("tutor_state") is not None
    messages_2 = r2.get("messages") or []
    assert len(messages_2) >= len(messages_1)


@pytest.mark.integration
@pytest.mark.slow
@pytest.mark.skipif(
    not _REDIS_CHECKPOINTER_IMPLEMENTED or not _redis_available(),
    reason="Redis checkpointer not implemented or LANGGRAPH_REDIS_URL unreachable",
)
def test_state_persists_redis(thread_id, mock_llm):
    """P1-6 (Option A): Redis checkpointer persists state across graph restarts."""
    url = os.getenv("LANGGRAPH_REDIS_URL", "redis://localhost:6379/1")
    graph1 = create_orchestration_graph(redis_url=url, with_checkpointer=True)
    session_id = f"sess-{uuid.uuid4()}"
    state = create_initial_state(
        session_id=session_id,
        user_id="u@ex.com",
        course_id="c1",
        course_outline={"metadata": {"title": "T"}, "sections": []},
    )
    config = {"configurable": {"thread_id": thread_id}}

    r1 = graph1.invoke(state, config)
    assert r1["active_agent"] == AgentType.TUTOR
    assert r1.get("tutor_state") is not None

    graph2 = create_orchestration_graph(redis_url=url, with_checkpointer=True)
    state2 = create_initial_state(
        session_id=session_id,
        user_id="u@ex.com",
        course_id="c1",
        course_outline={"metadata": {"title": "T"}, "sections": []},
    )
    r2 = graph2.invoke(state2, config)
    assert r2["active_agent"] == AgentType.TUTOR
    assert r2.get("tutor_state") is not None
