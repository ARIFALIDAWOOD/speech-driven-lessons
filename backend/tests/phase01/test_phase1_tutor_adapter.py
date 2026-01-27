"""
P1-4: Tutor adapter wraps ProactiveTutor.

Unit tests: adapter creates tutor, caches by session, processes input.
"""

from __future__ import annotations

import uuid
from unittest.mock import MagicMock, patch

import pytest

from models import TutorEvent, TutorState
from orchestration import create_initial_state
from orchestration.agents.tutor_adapter import TutorAgentAdapter, tutor_node


def _make_fake_tutor(*, tutor_state_value: str = "course_setup"):
    """Build a fake ProactiveTutor-like object for testing."""
    context = MagicMock()
    context.current_state = MagicMock()
    context.current_state.value = tutor_state_value
    context.current_topic_index = 0
    context.current_subtopic_index = 0
    context.messages_in_current_state = 0

    def start_session():
        yield TutorEvent("agent_speak", content="Welcome.", state=TutorState.COURSE_SETUP)

    def process_input(_):
        yield TutorEvent("agent_speak", content="Got it.", state=TutorState.COURSE_SETUP)

    tutor = MagicMock()
    tutor.context = context
    tutor.start_session = start_session
    tutor.process_input = process_input
    return tutor


@pytest.fixture(autouse=True)
def clear_adapter_cache():
    """Clear tutor cache before and after each test."""
    before = set(TutorAgentAdapter._active_tutors.keys())
    yield
    for k in list(TutorAgentAdapter._active_tutors.keys()):
        if k not in before:
            TutorAgentAdapter.remove_tutor(k)


@pytest.mark.unit
def test_adapter_get_or_create_returns_tutor(mocker):
    """Adapter get_or_create_tutor returns a ProactiveTutor-like instance."""
    fake = _make_fake_tutor()
    mocker.patch(
        "orchestration.agents.tutor_adapter.ProactiveTutor",
        return_value=fake,
    )
    mocker.patch(
        "orchestration.agents.tutor_adapter.SessionContext",
        return_value=MagicMock(),
    )

    state = create_initial_state(
        session_id=f"sess-{uuid.uuid4()}",
        user_id="u@ex.com",
        course_outline={"metadata": {"title": "T"}, "sections": []},
    )
    adapter = TutorAgentAdapter()
    tutor = adapter.get_or_create_tutor(state)

    assert tutor is fake
    assert tutor.context.current_state.value == "course_setup"


@pytest.mark.unit
def test_adapter_caches_tutor_by_session(mocker):
    """Same session_id returns same tutor instance (caching)."""
    fake = _make_fake_tutor()
    mocker.patch(
        "orchestration.agents.tutor_adapter.ProactiveTutor",
        return_value=fake,
    )
    mocker.patch(
        "orchestration.agents.tutor_adapter.SessionContext",
        return_value=MagicMock(),
    )

    sid = f"sess-{uuid.uuid4()}"
    state = create_initial_state(session_id=sid, user_id="u@ex.com")
    adapter = TutorAgentAdapter()

    t1 = adapter.get_or_create_tutor(state)
    t2 = adapter.get_or_create_tutor(state)
    assert t1 is t2


@pytest.mark.unit
def test_tutor_node_returns_tutor_state_and_messages(mocker):
    """tutor_node returns dict with tutor_state and/or messages."""
    fake = _make_fake_tutor(tutor_state_value="course_setup")
    mocker.patch(
        "orchestration.agents.tutor_adapter.ProactiveTutor",
        return_value=fake,
    )
    mocker.patch(
        "orchestration.agents.tutor_adapter.SessionContext",
        return_value=MagicMock(),
    )

    state = create_initial_state(
        session_id=f"sess-{uuid.uuid4()}",
        user_id="u@ex.com",
        course_outline={"metadata": {"title": "T"}, "sections": []},
    )
    state["user_input"] = "Hello"

    out = tutor_node(state)

    assert "tutor_state" in out
    assert out["tutor_state"] is not None
    assert "user_input" in out
    assert out["user_input"] is None
    assert "messages" in out
    assert isinstance(out["messages"], list)
    assert len(out["messages"]) >= 1
