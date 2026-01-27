"""
Phase 0 acceptance: Create session → orchestrator routes to tutor.

Summary acceptance matrix for Phase 1.
"""

from __future__ import annotations

import pytest

from orchestration import AgentType, create_initial_state, create_orchestration_graph


@pytest.mark.integration
def test_create_session_routes_to_tutor(
    initial_state, orchestration_graph, thread_id, mock_llm
):
    """P0-1: Create session → orchestrator routes to tutor.

    Create orchestration session with course_outline, run graph via stream.
    Assert active_agent is TUTOR and tutor node ran (messages or tutor_state updated).
    Graph loops tutor<->orchestrator; we stop after seeing tutor output.
    """
    config = {
        "configurable": {"thread_id": thread_id},
        "recursion_limit": 20,
    }
    result = None
    for chunk in orchestration_graph.stream(
        initial_state, config, stream_mode="values"
    ):
        result = chunk
        if result.get("tutor_state") is not None:
            break

    assert result is not None
    assert result["active_agent"] == AgentType.TUTOR
    assert result.get("tutor_state") is not None
    assert "messages" in result
    assert isinstance(result["messages"], list)
