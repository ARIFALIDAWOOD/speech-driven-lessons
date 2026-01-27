"""
Tutor Agent Adapter - Phase 1

Wraps the existing ProactiveTutor for integration with the LangGraph orchestration system.
"""

from typing import Dict, Any, Optional
import logging
from agent import ProactiveTutor
from models import SessionContext, TutorState
from ..state import OrchestratorState, ProgressHealth, SessionPhase

logger = logging.getLogger(__name__)


class TutorAgentAdapter:
    """
    Adapter that wraps ProactiveTutor for LangGraph integration.

    Manages tutor instances per session and translates between
    orchestration state and tutor context.
    """

    # Class-level cache of active tutors
    _active_tutors: Dict[str, ProactiveTutor] = {}

    @classmethod
    def get_or_create_tutor(cls, state: OrchestratorState) -> ProactiveTutor:
        """
        Get existing tutor for session or create new one.

        Args:
            state: Current orchestration state

        Returns:
            ProactiveTutor instance for this session
        """
        session_id = state["session_id"]

        if session_id not in cls._active_tutors:
            # Create new tutor with context from state
            context = SessionContext(
                session_id=session_id,
                user_id=state["user_id"],
                outline=state.get("course_outline"),
                course_title=state.get("course_outline", {}).get("metadata", {}).get("title", ""),
            )

            # Set course_id if available
            if state.get("course_id"):
                context.course_id = state["course_id"]

            tutor = ProactiveTutor(context=context)
            cls._active_tutors[session_id] = tutor

            logger.info(f"Created new tutor for session {session_id}")

        return cls._active_tutors[session_id]

    @classmethod
    def remove_tutor(cls, session_id: str) -> None:
        """Remove tutor instance for session."""
        if session_id in cls._active_tutors:
            del cls._active_tutors[session_id]
            logger.info(f"Removed tutor for session {session_id}")

    @classmethod
    def get_tutor_count(cls) -> int:
        """Get count of active tutors."""
        return len(cls._active_tutors)


def tutor_node(state: OrchestratorState) -> Dict[str, Any]:
    """
    LangGraph node that processes tutor interactions.

    This node:
    1. Gets or creates a tutor for the session
    2. Processes user input through the tutor
    3. Extracts messages and state updates
    4. Returns updates for the orchestration state
    """
    adapter = TutorAgentAdapter()
    tutor = adapter.get_or_create_tutor(state)

    new_messages = []
    tutor_state_value = None

    # Check if this is a new session start
    if not state.get("tutor_state"):
        # Start new session
        try:
            for event in tutor.start_session():
                if event.event_type == "agent_speak":
                    new_messages.append({
                        "role": "assistant",
                        "content": event.content
                    })
                tutor_state_value = event.state.value if event.state else None
        except Exception as e:
            logger.error(f"Error starting tutor session: {e}")
            return {
                "error_count": state.get("error_count", 0) + 1,
                "last_error": str(e),
            }

    # Process user input if available
    user_input = state.get("user_input")
    if user_input:
        try:
            for event in tutor.process_input(user_input):
                if event.event_type == "agent_speak":
                    new_messages.append({
                        "role": "assistant",
                        "content": event.content
                    })
                if event.state:
                    tutor_state_value = event.state.value
        except Exception as e:
            logger.error(f"Error processing tutor input: {e}")
            return {
                "error_count": state.get("error_count", 0) + 1,
                "last_error": str(e),
            }

    # Get current tutor state if not set from events
    if tutor_state_value is None:
        tutor_state_value = tutor.context.current_state.value

    # Extract tutor context for orchestration
    tutor_context = {
        "current_state": tutor_state_value,
        "topic_index": tutor.context.current_topic_index,
        "subtopic_index": tutor.context.current_subtopic_index,
        "messages_in_state": tutor.context.messages_in_current_state,
    }

    # Build state updates
    updates: Dict[str, Any] = {
        "tutor_state": tutor_state_value,
        "tutor_context": tutor_context,
        "user_input": None,  # Clear user input after processing
    }

    # Add messages if any
    if new_messages:
        updates["messages"] = new_messages

    # Check if tutor is doing understanding check
    if tutor_state_value == TutorState.CHECKING_UNDERSTANDING.value:
        updates["current_phase"] = SessionPhase.ASSESSMENT

    return updates


def should_continue_tutoring(state: OrchestratorState) -> str:
    """
    Conditional edge function after tutor node.

    Determines if tutoring should continue or if another agent should take over.
    """
    tutor_state = state.get("tutor_state", "")

    # Check for assessment trigger
    if tutor_state == TutorState.CHECKING_UNDERSTANDING.value:
        return "assessor"

    # Check for progress intervention
    health = state.get("progress_health", ProgressHealth.GOOD)
    struggles = state.get("consecutive_struggles", 0)

    if health in [ProgressHealth.STRUGGLING, ProgressHealth.CRITICAL]:
        return "progress_tracker"

    if struggles >= 3:
        return "progress_tracker"

    # Continue with orchestrator for routing
    return "orchestrator"
