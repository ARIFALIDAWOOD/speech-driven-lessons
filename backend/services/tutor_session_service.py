"""
Tutor session management service layer.

This module provides a clean interface for tutor session operations,
separating business logic from HTTP handling and SSE streaming.
"""

import logging
import uuid
from datetime import datetime
from typing import Dict, Iterator

from agent import ProactiveTutor, SessionContext, TutorState
from services import OutlineGenerator

from .dtos import (
    CreateSessionRequest,
    ProcessResponseRequest,
    SessionInfo,
    SessionResponse,
    SessionStatusResponse,
)
from .exceptions import SessionNotFoundError, ValidationError

logger = logging.getLogger(__name__)


class TutorSessionService:
    """
    Service class for tutor session management.

    This class encapsulates all session-related business logic, managing
    the lifecycle of tutoring sessions and interactions with the ProactiveTutor.

    Note: The active_sessions dict is a class-level store. In production,
    this should be replaced with Redis or another distributed store.
    """

    # Class-level session store (shared across all instances)
    _active_sessions: Dict[str, ProactiveTutor] = {}

    def __init__(self, user_id: str):
        """
        Initialize TutorSessionService.

        Args:
            user_id: The user's ID (email or UUID).
        """
        if not user_id:
            raise ValidationError("User ID cannot be empty", field="user_id")

        self.user_id = user_id

    # =========================================================================
    # Session Lifecycle
    # =========================================================================

    def create_session(self, request: CreateSessionRequest) -> SessionResponse:
        """
        Create a new tutoring session.

        Args:
            request: CreateSessionRequest with board/subject/chapter details.

        Returns:
            SessionResponse with the created session info and outline.
        """
        # Validate required fields
        if not request.board:
            raise ValidationError("Missing required field: board", field="board")
        if not request.subject:
            raise ValidationError("Missing required field: subject", field="subject")
        if not request.chapter:
            raise ValidationError("Missing required field: chapter", field="chapter")

        # Generate session ID
        session_id = str(uuid.uuid4())

        # Create session context
        context = SessionContext(
            session_id=session_id,
            user_id=self.user_id,
            board=request.board,
            subject=request.subject,
            chapter=request.chapter,
            topic=request.topic,
            board_name=request.board,
            subject_name=request.subject,
            chapter_name=request.chapter,
        )

        # If course_id is provided, load course info and set embeddings status
        if request.course_id:
            try:
                from services import CourseService

                course_service = CourseService(user_email=self.user_id)
                course_response = course_service.get_course(request.course_id)

                if course_response.course:
                    context.course_id = request.course_id
                    context.course_title = course_response.course.title

                    # Check embeddings status
                    embeddings_status = course_service.get_embeddings_status(request.course_id)
                    context.embeddings_ready = embeddings_status.get("status") in (
                        "ready",
                        "unknown",
                    )

                    logger.info(
                        f"Session {session_id} linked to course {request.course_id}, "
                        f"embeddings_ready={context.embeddings_ready}"
                    )
            except Exception as e:
                logger.warning(f"Failed to load course {request.course_id}: {e}")
                # Continue without course - don't fail the session creation

        # Generate course outline
        outline_dict = None
        try:
            generator = OutlineGenerator()
            outline = generator.generate_outline(
                board=context.board,
                subject=context.subject,
                chapter=context.chapter,
                topic=context.topic,
            )
            context.outline = outline.to_dict()
            outline_dict = context.outline
        except Exception as e:
            logger.warning(f"Failed to generate outline: {e}")

        # Create tutor instance and store
        tutor = ProactiveTutor(context)
        self._active_sessions[session_id] = tutor

        logger.info(
            f"Created session {session_id} for user {self.user_id}: "
            f"{request.board}/{request.subject}/{request.chapter}"
        )

        session_info = SessionInfo(
            session_id=session_id,
            user_id=self.user_id,
            board=request.board,
            subject=request.subject,
            chapter=request.chapter,
            topic=request.topic,
            state=context.current_state.value,
            is_paused=context.is_paused,
            created_at=datetime.now().isoformat(),
        )

        return SessionResponse(
            success=True,
            message="Session created successfully",
            session=session_info,
            outline=outline_dict,
        )

    def end_session(self, session_id: str) -> SessionResponse:
        """
        End a tutoring session and return summary.

        Args:
            session_id: The session ID to end.

        Returns:
            SessionResponse with session summary.
        """
        tutor = self._get_tutor(session_id)
        context = tutor.context
        context.update_time_tracking()

        summary = {
            "session_id": session_id,
            "duration_minutes": context.total_time_spent_minutes,
            "topics_covered": len(context.topic_progress),
            "concepts_learned": context.concepts_covered,
            "assessment_score": context.assessment_score,
            "student_level": context.student_level.value,
            "breaks_taken": context.breaks_taken,
        }

        # Remove from active sessions
        del self._active_sessions[session_id]
        logger.info(f"Ended session {session_id}")

        return SessionResponse(
            success=True,
            message="Session ended successfully",
            summary=summary,
        )

    # =========================================================================
    # Session Control
    # =========================================================================

    def pause_session(self, session_id: str) -> SessionResponse:
        """
        Pause a tutoring session.

        Args:
            session_id: The session ID to pause.

        Returns:
            SessionResponse indicating pause status.
        """
        tutor = self._get_tutor(session_id)
        tutor.context.is_paused = True
        tutor.context.record_break()

        logger.info(f"Paused session {session_id}")

        return SessionResponse(
            success=True,
            message="Session paused",
            session=self._get_session_info(tutor, session_id),
        )

    def resume_session(self, session_id: str) -> Iterator[str]:
        """
        Resume a paused session with SSE events.

        Args:
            session_id: The session ID to resume.

        Yields:
            JSON-encoded event strings for SSE.
        """
        tutor = self._get_tutor(session_id)
        tutor.context.is_paused = False

        logger.info(f"Resuming session {session_id}")

        # Process "resume" as input and yield events
        for event in tutor.process_input("resume"):
            yield event.to_json()

    # =========================================================================
    # Session Interaction
    # =========================================================================

    def stream_session(self, session_id: str) -> Iterator[str]:
        """
        Start/stream a session with SSE events.

        Args:
            session_id: The session ID to stream.

        Yields:
            JSON-encoded event strings for SSE.
        """
        import json

        tutor = self._get_tutor(session_id)

        # Start the session if in IDLE state
        if tutor.context.current_state == TutorState.IDLE:
            for event in tutor.start_session():
                yield event.to_json()

        # Yield ready event
        ready_data = json.dumps(
            {
                "event": "ready",
                "state": tutor.context.current_state.value,
            }
        )
        yield ready_data

    def process_response(self, request: ProcessResponseRequest) -> Iterator[str]:
        """
        Process a student response and stream tutor reaction.

        Args:
            request: ProcessResponseRequest with session_id and message.

        Yields:
            JSON-encoded event strings for SSE.
        """
        import json

        if not request.message:
            raise ValidationError("Message is required", field="message")

        tutor = self._get_tutor(request.session_id)

        # Process input and yield events
        for event in tutor.process_input(request.message):
            yield event.to_json()

        # Yield complete event
        complete_data = json.dumps(
            {
                "event": "complete",
                "state": tutor.context.current_state.value,
            }
        )
        yield complete_data

    # =========================================================================
    # Session Status
    # =========================================================================

    def get_status(self, session_id: str) -> SessionStatusResponse:
        """
        Get the current status of a session.

        Args:
            session_id: The session ID.

        Returns:
            SessionStatusResponse with current state.
        """
        tutor = self._get_tutor(session_id)
        context = tutor.context

        return SessionStatusResponse(
            session_id=session_id,
            state=context.current_state.value,
            is_paused=context.is_paused,
            progress={
                "section_index": context.current_section_index,
                "subtopic_index": context.current_subtopic_index,
                "time_spent_minutes": context.total_time_spent_minutes,
                "current_topic": context.get_current_topic(),
                "concepts_covered": context.concepts_covered,
            },
            assessment_score=context.assessment_score,
        )

    def get_history(self, session_id: str) -> SessionResponse:
        """
        Get conversation history for a session.

        Args:
            session_id: The session ID.

        Returns:
            SessionResponse with conversation history.
        """
        tutor = self._get_tutor(session_id)

        return SessionResponse(
            success=True,
            message="History retrieved successfully",
            history=tutor.context.conversation_history,
        )

    # =========================================================================
    # User-Level Queries
    # =========================================================================

    def get_user_sessions(self) -> list[dict]:
        """
        Get all active sessions for the current user.

        Returns:
            List of session info dicts.
        """
        sessions = []

        for session_id, tutor in self._active_sessions.items():
            if tutor.context.user_id == self.user_id:
                ctx = tutor.context
                sessions.append(
                    {
                        "id": session_id,
                        "title": f"{ctx.subject_name} - {ctx.chapter_name}",
                        "tutor": "AI Tutor",
                        "email": "tutor@anantra.ai",
                        "zoomLink": "",
                        "date": datetime.now().strftime("%Y-%m-%d"),
                        "startTime": "08:00",
                        "endTime": "09:00",
                        "description": (
                            f"Learning session for {ctx.chapter_name} in "
                            f"{ctx.subject_name} ({ctx.board_name})"
                        ),
                        "board": ctx.board,
                        "subject": ctx.subject,
                        "chapter": ctx.chapter,
                        "currentState": ctx.current_state.value,
                        "isPaused": ctx.is_paused,
                    }
                )

        return sessions

    def get_user_progress(self) -> dict:
        """
        Get overall progress for the current user.

        Returns:
            Dict with user progress data.

        Note: This is a stub - full implementation pending.
        """
        return {
            "user_id": self.user_id,
            "progress": [],
        }

    def get_chapter_progress(
        self,
        board: str,
        subject: str,
        chapter: str,
    ) -> dict:
        """
        Get progress for a specific chapter.

        Args:
            board: The education board.
            subject: The subject.
            chapter: The chapter.

        Returns:
            Dict with chapter progress data.

        Note: This is a stub - full implementation pending.
        """
        return {
            "user_id": self.user_id,
            "board": board,
            "subject": subject,
            "chapter": chapter,
            "completion_percentage": 0,
            "mastery_level": "beginner",
            "sessions_completed": 0,
        }

    # =========================================================================
    # Private Helpers
    # =========================================================================

    def _get_tutor(self, session_id: str) -> ProactiveTutor:
        """
        Get a tutor instance by session ID.

        Args:
            session_id: The session ID.

        Returns:
            The ProactiveTutor instance.

        Raises:
            SessionNotFoundError: If session doesn't exist.
        """
        tutor = self._active_sessions.get(session_id)
        if not tutor:
            raise SessionNotFoundError(session_id)
        return tutor

    def _get_session_info(self, tutor: ProactiveTutor, session_id: str) -> SessionInfo:
        """Build SessionInfo from a tutor instance."""
        ctx = tutor.context
        return SessionInfo(
            session_id=session_id,
            user_id=ctx.user_id,
            board=ctx.board,
            subject=ctx.subject,
            chapter=ctx.chapter,
            topic=ctx.topic,
            state=ctx.current_state.value,
            is_paused=ctx.is_paused,
            progress={
                "section_index": ctx.current_section_index,
                "subtopic_index": ctx.current_subtopic_index,
            },
        )

    @classmethod
    def session_exists(cls, session_id: str) -> bool:
        """Check if a session exists."""
        return session_id in cls._active_sessions

    @classmethod
    def get_all_sessions(cls) -> Dict[str, ProactiveTutor]:
        """Get all active sessions (for admin/debugging)."""
        return cls._active_sessions.copy()
