"""
Orchestration State Schema - Phase 1

Defines the shared state TypedDict for all agents in the multi-agent orchestration system.
"""

from datetime import datetime
from enum import Enum
from typing import Annotated, Any, Dict, List, Optional, TypedDict

from langgraph.graph import add_messages


class AgentType(str, Enum):
    """Types of agents in the orchestration system."""

    ORCHESTRATOR = "orchestrator"
    COURSE_CREATOR = "course_creator"
    CURRICULUM_DESIGNER = "curriculum_designer"
    TUTOR = "tutor"
    ASSESSOR = "assessor"
    PROGRESS_TRACKER = "progress_tracker"


class SessionPhase(str, Enum):
    """Phases of a learning session."""

    INITIALIZATION = "initialization"
    COURSE_CREATION = "course_creation"
    CURRICULUM_DESIGN = "curriculum_design"
    ACTIVE_TUTORING = "active_tutoring"
    ASSESSMENT = "assessment"
    REVIEW = "review"
    COMPLETE = "complete"


class ProgressHealth(str, Enum):
    """Health status of student progress."""

    EXCELLENT = "excellent"
    GOOD = "good"
    MODERATE = "moderate"
    STRUGGLING = "struggling"
    CRITICAL = "critical"


class OrchestratorState(TypedDict):
    """
    Shared state schema for the multi-agent orchestration system.

    This state is passed between all agents and contains all context
    needed for coordinated tutoring, assessment, and progress tracking.
    """

    # Session identification
    session_id: str
    user_id: str

    # Agent routing
    active_agent: AgentType
    previous_agent: Optional[AgentType]
    current_phase: SessionPhase

    # Message history (uses LangGraph's add_messages reducer)
    messages: Annotated[list, add_messages]

    # User input for current turn
    user_input: Optional[str]

    # Course context
    course_id: Optional[str]
    curriculum: Optional[Dict[str, Any]]
    course_outline: Optional[Dict[str, Any]]

    # Student profile and progress
    student_profile: Dict[str, Any]
    progress_health: ProgressHealth
    health_score: float  # 0.0 to 1.0
    consecutive_struggles: int
    knowledge_gaps: List[str]
    completed_topics: List[str]

    # Assessment tracking
    assessment_results: List[Dict[str, Any]]
    pending_assessment: Optional[Dict[str, Any]]
    confusion_events: int

    # Tutor state integration
    tutor_state: Optional[str]
    tutor_context: Optional[Dict[str, Any]]

    # Visual feedback for UI
    visual_feedback_signal: Optional[Dict[str, Any]]
    is_checking: bool  # True when orchestrator is doing progress check rounds

    # Error tracking
    error_count: int
    last_error: Optional[str]


def create_initial_state(
    session_id: str,
    user_id: str,
    course_id: Optional[str] = None,
    course_outline: Optional[Dict[str, Any]] = None,
) -> OrchestratorState:
    """Create initial state for a new orchestration session."""
    return OrchestratorState(
        session_id=session_id,
        user_id=user_id,
        active_agent=AgentType.ORCHESTRATOR,
        previous_agent=None,
        current_phase=SessionPhase.INITIALIZATION,
        messages=[],
        user_input=None,
        course_id=course_id,
        curriculum=None,
        course_outline=course_outline,
        student_profile={},
        progress_health=ProgressHealth.GOOD,
        health_score=1.0,
        consecutive_struggles=0,
        knowledge_gaps=[],
        completed_topics=[],
        assessment_results=[],
        pending_assessment=None,
        confusion_events=0,
        tutor_state=None,
        tutor_context=None,
        visual_feedback_signal=None,
        is_checking=False,
        error_count=0,
        last_error=None,
    )
