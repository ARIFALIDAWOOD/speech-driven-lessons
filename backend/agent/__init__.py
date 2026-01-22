"""
Agent-Driven Tutoring System

Provides a proactive tutor agent that guides students through lessons
using a state machine architecture.
"""

from .states import TutorState, SessionContext, StudentLevel
from .machine import TutorStateMachine, StateTransition
from .tutor import ProactiveTutor
from .prompts import get_system_prompt

__all__ = [
    "TutorState",
    "SessionContext",
    "StudentLevel",
    "TutorStateMachine",
    "StateTransition",
    "ProactiveTutor",
    "get_system_prompt",
]
