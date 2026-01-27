"""
Agent-Driven Tutoring System

Provides a proactive tutor agent that guides students through lessons
using a state machine architecture.
"""

# Re-export models for backward compatibility
from models import (
    AssessmentDifficulty,
    AssessmentQuestion,
    AssessmentResponse,
    SessionContext,
    StateTransition,
    StudentLevel,
    TopicProgress,
    TutorEvent,
    TutorState,
)

from .machine import TutorStateMachine
from .prompts import get_system_prompt
from .tutor import ProactiveTutor

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
