"""
P1-3: LangGraph workflow compiles.
P1-5: Orchestrator routes to tutor for ACTIVE_TUTORING.
"""

from __future__ import annotations

import uuid

import pytest

from orchestration import (
    create_orchestration_graph,
    create_initial_state,
    AgentType,
    SessionPhase,
)


@pytest.mark.unit
def test_create_orchestration_graph_with_checkpointer_succeeds():
    """P1-3: create_orchestration_graph(with_checkpointer=True) compiles."""
    graph = create_orchestration_graph(redis_url=None, with_checkpointer=True)
    assert graph is not None
    assert hasattr(graph, "invoke")
    assert hasattr(graph, "ainvoke")


@pytest.mark.unit
def test_create_orchestration_graph_without_checkpointer_succeeds():
    """P1-3: create_orchestration_graph(with_checkpointer=False) compiles."""
    graph = create_orchestration_graph(with_checkpointer=False)
    assert graph is not None
    assert hasattr(graph, "invoke")
    assert hasattr(graph, "ainvoke")


@pytest.mark.integration
def test_orchestrator_routes_to_tutor_for_active_tutoring(
    orchestration_graph, thread_id, mock_llm
):
    """P1-5: ACTIVE_TUTORING phase → tutor node runs; active_agent is TUTOR."""
    state = create_initial_state(
        session_id=f"sess-{uuid.uuid4()}",
        user_id="u@ex.com",
        course_id="c1",
        course_outline={"metadata": {"title": "T"}, "sections": []},
    )
    state["current_phase"] = SessionPhase.ACTIVE_TUTORING
    state["active_agent"] = AgentType.TUTOR

    config = {
        "configurable": {"thread_id": thread_id},
        "recursion_limit": 20,
    }
    result = None
    for chunk in orchestration_graph.stream(state, config, stream_mode="values"):
        result = chunk
        if result.get("tutor_state") is not None:
            break

    assert result is not None
    assert result["active_agent"] == AgentType.TUTOR
    assert result.get("tutor_state") is not None
    assert "messages" in result
