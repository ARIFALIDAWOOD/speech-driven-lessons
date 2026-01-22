"""
Tutor State Machine

Handles state transitions and ensures valid state flow.
"""

import logging
from dataclasses import dataclass
from typing import Callable, Optional

from .states import TutorState, SessionContext


logger = logging.getLogger(__name__)


@dataclass
class StateTransition:
    """Represents a valid state transition."""
    from_state: TutorState
    to_state: TutorState
    condition: Optional[Callable[[SessionContext], bool]] = None
    trigger: str = "auto"  # "auto", "user_input", "timeout", "complete"


# Define valid state transitions
VALID_TRANSITIONS: list[StateTransition] = [
    # Initial setup flow
    StateTransition(TutorState.IDLE, TutorState.COURSE_SETUP, trigger="start"),
    StateTransition(TutorState.COURSE_SETUP, TutorState.INITIAL_ASSESSMENT, trigger="auto"),

    # Assessment flow
    StateTransition(TutorState.INITIAL_ASSESSMENT, TutorState.ASSESSMENT_REVIEW, trigger="complete"),
    StateTransition(TutorState.ASSESSMENT_REVIEW, TutorState.LESSON_INTRODUCTION, trigger="auto"),

    # Main teaching flow
    StateTransition(TutorState.LESSON_INTRODUCTION, TutorState.CONCEPT_EXPLANATION, trigger="auto"),
    StateTransition(TutorState.CONCEPT_EXPLANATION, TutorState.EXAMPLE_DEMONSTRATION, trigger="auto"),
    StateTransition(TutorState.EXAMPLE_DEMONSTRATION, TutorState.GUIDED_PRACTICE, trigger="auto"),
    StateTransition(TutorState.GUIDED_PRACTICE, TutorState.CHECK_UNDERSTANDING, trigger="complete"),
    StateTransition(TutorState.CHECK_UNDERSTANDING, TutorState.TOPIC_SUMMARY, trigger="auto"),

    # Topic completion flow
    StateTransition(
        TutorState.TOPIC_SUMMARY,
        TutorState.LESSON_INTRODUCTION,
        condition=lambda ctx: not ctx.is_lesson_complete() and not ctx.should_suggest_break(),
        trigger="auto"
    ),
    StateTransition(
        TutorState.TOPIC_SUMMARY,
        TutorState.BREAK_SUGGESTION,
        condition=lambda ctx: ctx.should_suggest_break() and not ctx.is_lesson_complete(),
        trigger="auto"
    ),
    StateTransition(
        TutorState.TOPIC_SUMMARY,
        TutorState.LESSON_COMPLETE,
        condition=lambda ctx: ctx.is_lesson_complete(),
        trigger="auto"
    ),

    # Break handling
    StateTransition(TutorState.BREAK_SUGGESTION, TutorState.SESSION_PAUSED, trigger="user_accept"),
    StateTransition(TutorState.BREAK_SUGGESTION, TutorState.LESSON_INTRODUCTION, trigger="user_decline"),
    StateTransition(TutorState.SESSION_PAUSED, TutorState.LESSON_INTRODUCTION, trigger="resume"),

    # Lesson completion
    StateTransition(TutorState.LESSON_COMPLETE, TutorState.SESSION_COMPLETE, trigger="auto"),

    # Interruption handling (from any teaching state)
    StateTransition(TutorState.CONCEPT_EXPLANATION, TutorState.ANSWERING_QUESTION, trigger="user_question"),
    StateTransition(TutorState.EXAMPLE_DEMONSTRATION, TutorState.ANSWERING_QUESTION, trigger="user_question"),
    StateTransition(TutorState.GUIDED_PRACTICE, TutorState.ANSWERING_QUESTION, trigger="user_question"),
    StateTransition(TutorState.CHECK_UNDERSTANDING, TutorState.HANDLING_CONFUSION, trigger="user_confused"),

    # Return from interruptions
    StateTransition(TutorState.ANSWERING_QUESTION, TutorState.CONCEPT_EXPLANATION, trigger="return"),
    StateTransition(TutorState.ANSWERING_QUESTION, TutorState.EXAMPLE_DEMONSTRATION, trigger="return"),
    StateTransition(TutorState.ANSWERING_QUESTION, TutorState.GUIDED_PRACTICE, trigger="return"),
    StateTransition(TutorState.HANDLING_CONFUSION, TutorState.CONCEPT_EXPLANATION, trigger="return"),

    # Early termination (from any state)
    StateTransition(TutorState.LESSON_INTRODUCTION, TutorState.SESSION_COMPLETE, trigger="user_end"),
    StateTransition(TutorState.CONCEPT_EXPLANATION, TutorState.SESSION_COMPLETE, trigger="user_end"),
    StateTransition(TutorState.EXAMPLE_DEMONSTRATION, TutorState.SESSION_COMPLETE, trigger="user_end"),
    StateTransition(TutorState.GUIDED_PRACTICE, TutorState.SESSION_COMPLETE, trigger="user_end"),
    StateTransition(TutorState.CHECK_UNDERSTANDING, TutorState.SESSION_COMPLETE, trigger="user_end"),
    StateTransition(TutorState.TOPIC_SUMMARY, TutorState.SESSION_COMPLETE, trigger="user_end"),
]


class TutorStateMachine:
    """
    State machine for the tutor agent.

    Manages state transitions and ensures valid state flow.
    """

    def __init__(self, context: SessionContext):
        """
        Initialize the state machine with a session context.

        Args:
            context: SessionContext instance
        """
        self.context = context
        self._build_transition_map()

    def _build_transition_map(self):
        """Build a map of valid transitions for quick lookup."""
        self.transition_map: dict[TutorState, list[StateTransition]] = {}

        for transition in VALID_TRANSITIONS:
            if transition.from_state not in self.transition_map:
                self.transition_map[transition.from_state] = []
            self.transition_map[transition.from_state].append(transition)

    @property
    def current_state(self) -> TutorState:
        """Get the current state."""
        return self.context.current_state

    def can_transition_to(self, target_state: TutorState) -> bool:
        """
        Check if a transition to the target state is valid.

        Args:
            target_state: The state to transition to

        Returns:
            True if the transition is valid
        """
        current = self.context.current_state
        transitions = self.transition_map.get(current, [])

        for transition in transitions:
            if transition.to_state == target_state:
                if transition.condition is None:
                    return True
                return transition.condition(self.context)

        return False

    def get_valid_transitions(self) -> list[TutorState]:
        """
        Get all valid transitions from the current state.

        Returns:
            List of valid target states
        """
        current = self.context.current_state
        transitions = self.transition_map.get(current, [])
        valid = []

        for transition in transitions:
            if transition.condition is None or transition.condition(self.context):
                valid.append(transition.to_state)

        return valid

    def transition_to(self, target_state: TutorState) -> bool:
        """
        Transition to the target state if valid.

        Args:
            target_state: The state to transition to

        Returns:
            True if transition was successful
        """
        if not self.can_transition_to(target_state):
            logger.warning(
                f"Invalid transition: {self.context.current_state} -> {target_state}"
            )
            return False

        self.context.previous_state = self.context.current_state
        self.context.current_state = target_state
        logger.info(f"State transition: {self.context.previous_state} -> {target_state}")

        return True

    def get_next_auto_state(self) -> Optional[TutorState]:
        """
        Get the next state for automatic transitions.

        Returns:
            Next state if an auto transition is available, None otherwise
        """
        current = self.context.current_state
        transitions = self.transition_map.get(current, [])

        for transition in transitions:
            if transition.trigger == "auto":
                if transition.condition is None or transition.condition(self.context):
                    return transition.to_state

        return None

    def process_trigger(self, trigger: str) -> Optional[TutorState]:
        """
        Process a trigger and transition to the appropriate state.

        Args:
            trigger: The trigger event (e.g., "user_question", "complete")

        Returns:
            New state if transition occurred, None otherwise
        """
        current = self.context.current_state
        transitions = self.transition_map.get(current, [])

        for transition in transitions:
            if transition.trigger == trigger:
                if transition.condition is None or transition.condition(self.context):
                    if self.transition_to(transition.to_state):
                        return transition.to_state

        return None

    def is_terminal_state(self) -> bool:
        """Check if the current state is a terminal state."""
        return self.context.current_state in [
            TutorState.SESSION_COMPLETE,
            TutorState.SESSION_PAUSED,
        ]

    def is_teaching_state(self) -> bool:
        """Check if the current state is a teaching state."""
        return self.context.current_state in [
            TutorState.LESSON_INTRODUCTION,
            TutorState.CONCEPT_EXPLANATION,
            TutorState.EXAMPLE_DEMONSTRATION,
            TutorState.GUIDED_PRACTICE,
            TutorState.CHECK_UNDERSTANDING,
            TutorState.TOPIC_SUMMARY,
        ]

    def is_assessment_state(self) -> bool:
        """Check if the current state is an assessment state."""
        return self.context.current_state in [
            TutorState.INITIAL_ASSESSMENT,
            TutorState.ASSESSMENT_REVIEW,
        ]

    def reset(self):
        """Reset the state machine to the initial state."""
        self.context.previous_state = self.context.current_state
        self.context.current_state = TutorState.IDLE

    def get_state_info(self) -> dict:
        """Get information about the current state."""
        return {
            "current_state": self.current_state.value,
            "previous_state": self.context.previous_state.value if self.context.previous_state else None,
            "valid_transitions": [s.value for s in self.get_valid_transitions()],
            "is_terminal": self.is_terminal_state(),
            "is_teaching": self.is_teaching_state(),
            "is_assessment": self.is_assessment_state(),
        }
