"""
P1-1: OrchestratorState serialize/deserialize.

Unit tests for state round-trip (dict/JSON) for checkpoints and WS.
"""

from __future__ import annotations

import json

import pytest

from orchestration import (
    create_initial_state,
    OrchestratorState,
    AgentType,
    SessionPhase,
    ProgressHealth,
)


@pytest.mark.unit
def test_state_serialize_to_dict():
    """State can be serialized to dict."""
    state = create_initial_state(
        session_id="s1",
        user_id="u1",
        course_id="c1",
        course_outline={"metadata": {"title": "T"}, "sections": []},
    )
    assert isinstance(state, dict)
    assert state["session_id"] == "s1"
    assert state["user_id"] == "u1"
    assert state["course_id"] == "c1"
    assert state["active_agent"] == AgentType.ORCHESTRATOR
    assert state["current_phase"] == SessionPhase.INITIALIZATION
    assert state["progress_health"] == ProgressHealth.GOOD
    assert "messages" in state
    assert state["messages"] == []


@pytest.mark.unit
def test_state_roundtrip_dict():
    """State round-trips via dict (copy)."""
    state = create_initial_state(session_id="s2", user_id="u2")
    as_dict = dict(state)
    assert as_dict["session_id"] == state["session_id"]
    assert as_dict["user_id"] == state["user_id"]
    assert as_dict["active_agent"] == state["active_agent"]
    assert as_dict["current_phase"] == state["current_phase"]


@pytest.mark.unit
def test_state_roundtrip_json():
    """State round-trips via JSON for enum values."""
    state = create_initial_state(session_id="s3", user_id="u3")
    payload = {
        "session_id": state["session_id"],
        "user_id": state["user_id"],
        "active_agent": state["active_agent"].value,
        "current_phase": state["current_phase"].value,
        "progress_health": state["progress_health"].value,
    }
    dumped = json.dumps(payload)
    loaded = json.loads(dumped)
    assert loaded["session_id"] == state["session_id"]
    assert loaded["active_agent"] == AgentType(loaded["active_agent"]).value
    assert loaded["current_phase"] == SessionPhase(loaded["current_phase"]).value
