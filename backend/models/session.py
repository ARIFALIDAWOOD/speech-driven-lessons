"""
Session-related Data Transfer Objects.

These dataclasses define the contracts for tutor session operations.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from .enums import StudentLevel, TutorState


@dataclass
class CreateSessionRequest:
    """Request to create a new tutor session."""

    board: str
    subject: str
    chapter: str
    topic: Optional[str] = None
    course_id: Optional[str] = None  # Optional uploaded course to use for materials


@dataclass
class SessionInfo:
    """Information about a tutor session."""

    session_id: str
    user_id: str
    board: str
    subject: str
    chapter: str
    topic: Optional[str] = None
    state: str = "idle"
    is_paused: bool = False
    created_at: str = ""
    progress: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "board": self.board,
            "subject": self.subject,
            "chapter": self.chapter,
            "topic": self.topic,
            "state": self.state,
            "is_paused": self.is_paused,
            "created_at": self.created_at,
            "progress": self.progress,
        }


@dataclass
class SessionResponse:
    """Standard response for session operations."""

    success: bool
    message: str
    session: Optional[SessionInfo] = None
    outline: Optional[dict] = None
    history: Optional[list[dict]] = None
    summary: Optional[dict] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        result = {"success": self.success, "message": self.message}
        if self.session:
            result["session"] = self.session.to_dict()
        if self.outline:
            result["outline"] = self.outline
        if self.history:
            result["history"] = self.history
        if self.summary:
            result["summary"] = self.summary
        if self.error:
            result["error"] = self.error
        return result


@dataclass
class SessionStatusResponse:
    """Response containing session status."""

    session_id: str
    state: str
    is_paused: bool
    progress: dict
    assessment_score: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "state": self.state,
            "is_paused": self.is_paused,
            "progress": self.progress,
            "assessment_score": self.assessment_score,
        }


@dataclass
class ProcessResponseRequest:
    """Request to process a student response."""

    session_id: str
    message: str


@dataclass
class TopicProgress:
    """Tracks progress through a single topic."""

    topic_index: int
    topic_title: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    concepts_covered: list[str] = field(default_factory=list)
    examples_shown: int = 0
    practice_problems_attempted: int = 0
    practice_problems_correct: int = 0
    understanding_checks: int = 0
    understanding_passed: int = 0


@dataclass
class SessionContext:
    """
    Context for a tutoring session.

    Maintains all state needed for the tutor to operate effectively.
    """

    # Session identification
    session_id: str
    user_id: str

    # Curriculum selection
    board: str
    subject: str
    chapter: str
    topic: Optional[str] = None

    # Display names (for UI)
    board_name: str = ""
    subject_name: str = ""
    chapter_name: str = ""

    # Current state
    current_state: TutorState = TutorState.IDLE
    previous_state: Optional[TutorState] = None

    # Course outline
    outline: Optional[dict] = None
    current_section_index: int = 0
    current_subtopic_index: int = 0

    # Assessment data
    student_level: StudentLevel = StudentLevel.INTERMEDIATE
    assessment_questions: list = field(default_factory=list)
    assessment_responses: list = field(default_factory=list)
    assessment_score: float = 0.0

    # Progress tracking
    topic_progress: list[TopicProgress] = field(default_factory=list)
    concepts_covered: list[str] = field(default_factory=list)
    total_time_spent_minutes: float = 0.0

    # Timing
    session_started_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    current_phase_started_at: Optional[datetime] = None

    # Break management
    time_since_last_break_minutes: float = 0.0
    break_threshold_minutes: float = 25.0  # Suggest break after 25 minutes
    breaks_taken: int = 0

    # Conversation history (for LLM context)
    conversation_history: list[dict] = field(default_factory=list)
    pending_student_question: Optional[str] = None

    # Flags
    is_paused: bool = False
    student_requested_end: bool = False
    needs_clarification: bool = False

    # Phase 1: Orchestration integration
    course_id: Optional[str] = None
    embeddings_ready: bool = False
    orchestrator_session_id: Optional[str] = None
    course_title: str = ""

    def add_message(self, role: str, content: str):
        """Add a message to conversation history."""
        self.conversation_history.append(
            {
                "role": role,
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                "state": self.current_state.value,
            }
        )
        self.last_activity_at = datetime.utcnow()

    def get_recent_history(self, max_messages: int = 10) -> list[dict]:
        """Get recent conversation history for LLM context."""
        return self.conversation_history[-max_messages:]

    def get_current_topic(self) -> Optional[dict]:
        """Get the current topic from the outline."""
        if not self.outline or "sections" not in self.outline:
            return None

        sections = self.outline["sections"]
        if self.current_section_index >= len(sections):
            return None

        section = sections[self.current_section_index]
        subtopics = section.get("subtopics", [])

        if self.current_subtopic_index >= len(subtopics):
            return None

        return {
            "section": section,
            "subtopic": subtopics[self.current_subtopic_index],
            "section_index": self.current_section_index,
            "subtopic_index": self.current_subtopic_index,
        }

    def advance_to_next_topic(self) -> bool:
        """
        Advance to the next topic in the outline.

        Returns:
            True if advanced successfully, False if no more topics
        """
        if not self.outline or "sections" not in self.outline:
            return False

        sections = self.outline["sections"]
        if self.current_section_index >= len(sections):
            return False

        section = sections[self.current_section_index]
        subtopics = section.get("subtopics", [])

        # Try to advance within current section
        if self.current_subtopic_index < len(subtopics) - 1:
            self.current_subtopic_index += 1
            return True

        # Try to advance to next section
        if self.current_section_index < len(sections) - 1:
            self.current_section_index += 1
            self.current_subtopic_index = 0
            return True

        return False

    def is_lesson_complete(self) -> bool:
        """Check if all topics in the outline have been covered."""
        if not self.outline or "sections" not in self.outline:
            return True

        sections = self.outline["sections"]
        if self.current_section_index >= len(sections):
            return True

        # At last section
        if self.current_section_index == len(sections) - 1:
            section = sections[self.current_section_index]
            subtopics = section.get("subtopics", [])
            return self.current_subtopic_index >= len(subtopics) - 1

        return False

    def should_suggest_break(self) -> bool:
        """Check if a break should be suggested."""
        return self.time_since_last_break_minutes >= self.break_threshold_minutes

    def update_time_tracking(self):
        """Update time tracking based on current timestamp."""
        now = datetime.utcnow()

        if self.session_started_at:
            delta = now - self.session_started_at
            self.total_time_spent_minutes = delta.total_seconds() / 60

        if self.current_phase_started_at:
            delta = now - self.current_phase_started_at
            self.time_since_last_break_minutes = delta.total_seconds() / 60

    def record_break(self):
        """Record that a break was taken."""
        self.breaks_taken += 1
        self.time_since_last_break_minutes = 0
        self.current_phase_started_at = datetime.utcnow()

    def to_dict(self) -> dict:
        """Convert context to dictionary for storage/API."""
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "board": self.board,
            "subject": self.subject,
            "chapter": self.chapter,
            "topic": self.topic,
            "board_name": self.board_name,
            "subject_name": self.subject_name,
            "chapter_name": self.chapter_name,
            "current_state": self.current_state.value,
            "student_level": self.student_level.value,
            "assessment_score": self.assessment_score,
            "current_section_index": self.current_section_index,
            "current_subtopic_index": self.current_subtopic_index,
            "concepts_covered": self.concepts_covered,
            "total_time_spent_minutes": self.total_time_spent_minutes,
            "breaks_taken": self.breaks_taken,
            "is_paused": self.is_paused,
            "session_started_at": (
                self.session_started_at.isoformat() if self.session_started_at else None
            ),
            "last_activity_at": (
                self.last_activity_at.isoformat() if self.last_activity_at else None
            ),
        }

    @classmethod
    def from_dict(cls, data: dict) -> "SessionContext":
        """Create context from dictionary."""
        context = cls(
            session_id=data["session_id"],
            user_id=data["user_id"],
            board=data["board"],
            subject=data["subject"],
            chapter=data["chapter"],
            topic=data.get("topic"),
            board_name=data.get("board_name", ""),
            subject_name=data.get("subject_name", ""),
            chapter_name=data.get("chapter_name", ""),
        )

        if "current_state" in data:
            context.current_state = TutorState(data["current_state"])
        if "student_level" in data:
            context.student_level = StudentLevel(data["student_level"])
        if "assessment_score" in data:
            context.assessment_score = data["assessment_score"]
        if "current_section_index" in data:
            context.current_section_index = data["current_section_index"]
        if "current_subtopic_index" in data:
            context.current_subtopic_index = data["current_subtopic_index"]
        if "concepts_covered" in data:
            context.concepts_covered = data["concepts_covered"]
        if "is_paused" in data:
            context.is_paused = data["is_paused"]

        return context
