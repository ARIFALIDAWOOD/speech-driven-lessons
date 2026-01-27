"""
Agent-Driven Tutoring System

Provides a proactive tutor agent that guides students through lessons
using a state machine architecture.
"""

from .machine import TutorStateMachine
from .tutor import ProactiveTutor
from .prompts import get_system_prompt

# Re-export models for backward compatibility
from models import (
    TutorState,
    SessionContext,
    StudentLevel,
    StateTransition,
    TutorEvent,
    AssessmentQuestion,
    AssessmentResponse,
    AssessmentDifficulty,
    TopicProgress,
)

__all__ = [
    # Agent classes
    "TutorStateMachine",
    "ProactiveTutor",
    "get_system_prompt",
    # Models (re-exported for backward compatibility)
    "TutorState",
    "SessionContext",
    "StudentLevel",
    "StateTransition",
    "TutorEvent",
    "AssessmentQuestion",
    "AssessmentResponse",
    "AssessmentDifficulty",
    "TopicProgress",
]
