"""
Tutor Session API Routes

Provides endpoints for managing tutoring sessions, including:
- Session creation
- Real-time streaming (SSE)
- User responses
- Session management
"""

import json
import logging
import uuid
from datetime import datetime
from typing import Generator

from flask import Blueprint, request, jsonify, Response, stream_with_context
from functools import wraps

from utils.supabase_auth import verify_supabase_token
from utils.user_utils import get_current_user
from agent import ProactiveTutor, SessionContext, TutorState
from services import OutlineGenerator


logger = logging.getLogger(__name__)

tutor_session_bp = Blueprint("tutor_session", __name__, url_prefix="/api/tutor-session")

# In-memory session store (for development - use Redis in production)
active_sessions: dict[str, ProactiveTutor] = {}


def require_auth(f):
    """Decorator to require authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            user_email = get_current_user(request)
            if not user_email:
                return jsonify({"error": "Authentication required"}), 401
            # Store user info as dict for consistency
            request.user = {"email": user_email}
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Auth error: {e}")
            return jsonify({"error": "Authentication failed"}), 401
    return decorated


@tutor_session_bp.route("/create", methods=["POST"])
@require_auth
def create_session():
    """
    Create a new tutoring session.

    Request body:
    {
        "selection_state": "MH",
        "selection_city": "MUM",
        "selection_board": "CBSE",
        "selection_subject": "MATH",
        "selection_chapter": "CH1",
        "selection_topic": "optional focus",
        "state_name": "Maharashtra",
        "city_name": "Mumbai",
        "board_name": "CBSE",
        "subject_name": "Mathematics",
        "chapter_name": "Real Numbers"
    }
    """
    try:
        data = request.get_json()
        user = request.user

        # Validate required fields
        required = ["selection_board", "selection_subject", "selection_chapter"]
        for field in required:
            if not data.get(field):
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Generate session ID
        session_id = str(uuid.uuid4())

        # Create session context
        context = SessionContext(
            session_id=session_id,
            user_id=user.get("email") or user.get("sub"),
            board=data.get("selection_board"),
            subject=data.get("selection_subject"),
            chapter=data.get("selection_chapter"),
            topic=data.get("selection_topic"),
            board_name=data.get("board_name", data.get("selection_board")),
            subject_name=data.get("subject_name", data.get("selection_subject")),
            chapter_name=data.get("chapter_name", data.get("selection_chapter")),
        )

        # Generate course outline
        try:
            generator = OutlineGenerator()
            outline = generator.generate_outline(
                board=context.board,
                subject=context.subject,
                chapter=context.chapter,
                topic=context.topic,
            )
            context.outline = outline.to_dict()
        except Exception as e:
            logger.warning(f"Failed to generate outline: {e}")
            # Continue without outline - tutor will work from LLM knowledge

        # Create tutor instance
        tutor = ProactiveTutor(context)
        active_sessions[session_id] = tutor

        # Store session in database (if using Supabase)
        # This would be done via supabase client

        return jsonify({
            "session_id": session_id,
            "context": context.to_dict(),
            "message": "Session created successfully",
        }), 201

    except Exception as e:
        logger.error(f"Error creating session: {e}")
        return jsonify({"error": str(e)}), 500


@tutor_session_bp.route("/<session_id>/stream", methods=["GET"])
@require_auth
def stream_session(session_id: str):
    """
    SSE endpoint for real-time tutor updates.

    Streams events like:
    - agent_speak: Tutor message
    - ask_question: Question for student
    - state_change: State transition
    - suggest_break: Break suggestion
    - session_complete: Session ended
    """
    try:
        tutor = active_sessions.get(session_id)

        if not tutor:
            return jsonify({"error": "Session not found"}), 404

        def generate() -> Generator[str, None, None]:
            """Generate SSE events."""
            try:
                # Start the session if not already started
                if tutor.context.current_state == TutorState.IDLE:
                    for event in tutor.start_session():
                        yield f"data: {event.to_json()}\n\n"

                yield f"data: {json.dumps({'event': 'ready', 'state': tutor.context.current_state.value})}\n\n"

            except Exception as e:
                logger.error(f"Stream error: {e}")
                yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            },
        )

    except Exception as e:
        logger.error(f"Stream error: {e}")
        return jsonify({"error": str(e)}), 500


@tutor_session_bp.route("/<session_id>/respond", methods=["POST"])
@require_auth
def respond_to_tutor(session_id: str):
    """
    Send a response to the tutor.

    Request body:
    {
        "message": "User's message or answer"
    }

    Returns SSE stream of tutor's response.
    """
    try:
        tutor = active_sessions.get(session_id)

        if not tutor:
            return jsonify({"error": "Session not found"}), 404

        data = request.get_json()
        user_input = data.get("message", "")

        if not user_input:
            return jsonify({"error": "Message is required"}), 400

        def generate() -> Generator[str, None, None]:
            """Generate SSE events for tutor response."""
            try:
                for event in tutor.process_input(user_input):
                    yield f"data: {event.to_json()}\n\n"

                yield f"data: {json.dumps({'event': 'complete', 'state': tutor.context.current_state.value})}\n\n"

            except Exception as e:
                logger.error(f"Response error: {e}")
                yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            },
        )

    except Exception as e:
        logger.error(f"Respond error: {e}")
        return jsonify({"error": str(e)}), 500


@tutor_session_bp.route("/<session_id>/status", methods=["GET"])
@require_auth
def get_session_status(session_id: str):
    """Get the current status of a tutoring session."""
    try:
        tutor = active_sessions.get(session_id)

        if not tutor:
            return jsonify({"error": "Session not found"}), 404

        context = tutor.context

        return jsonify({
            "session_id": session_id,
            "current_state": context.current_state.value,
            "student_level": context.student_level.value,
            "assessment_score": context.assessment_score,
            "concepts_covered": context.concepts_covered,
            "current_topic": context.get_current_topic(),
            "progress": {
                "section_index": context.current_section_index,
                "subtopic_index": context.current_subtopic_index,
                "time_spent_minutes": context.total_time_spent_minutes,
            },
            "is_paused": context.is_paused,
        })

    except Exception as e:
        logger.error(f"Status error: {e}")
        return jsonify({"error": str(e)}), 500


@tutor_session_bp.route("/<session_id>/pause", methods=["POST"])
@require_auth
def pause_session(session_id: str):
    """Pause a tutoring session."""
    try:
        tutor = active_sessions.get(session_id)

        if not tutor:
            return jsonify({"error": "Session not found"}), 404

        tutor.context.is_paused = True
        tutor.context.record_break()

        return jsonify({
            "message": "Session paused",
            "state": tutor.context.current_state.value,
        })

    except Exception as e:
        logger.error(f"Pause error: {e}")
        return jsonify({"error": str(e)}), 500


@tutor_session_bp.route("/<session_id>/resume", methods=["POST"])
@require_auth
def resume_session(session_id: str):
    """Resume a paused tutoring session."""
    try:
        tutor = active_sessions.get(session_id)

        if not tutor:
            return jsonify({"error": "Session not found"}), 404

        tutor.context.is_paused = False

        def generate() -> Generator[str, None, None]:
            """Generate SSE events for resume."""
            try:
                for event in tutor.process_input("resume"):
                    yield f"data: {event.to_json()}\n\n"

            except Exception as e:
                logger.error(f"Resume error: {e}")
                yield f"data: {json.dumps({'event': 'error', 'message': str(e)})}\n\n"

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )

    except Exception as e:
        logger.error(f"Resume error: {e}")
        return jsonify({"error": str(e)}), 500


@tutor_session_bp.route("/<session_id>/end", methods=["POST"])
@require_auth
def end_session(session_id: str):
    """End a tutoring session and save progress."""
    try:
        tutor = active_sessions.get(session_id)

        if not tutor:
            return jsonify({"error": "Session not found"}), 404

        context = tutor.context

        # Update time tracking
        context.update_time_tracking()

        # Build final summary
        summary = {
            "session_id": session_id,
            "duration_minutes": context.total_time_spent_minutes,
            "topics_covered": len(context.topic_progress),
            "concepts_learned": context.concepts_covered,
            "assessment_score": context.assessment_score,
            "student_level": context.student_level.value,
            "breaks_taken": context.breaks_taken,
        }

        # Save to database (if using Supabase)
        # This would update the tutor_sessions table and user_progress

        # Remove from active sessions
        del active_sessions[session_id]

        return jsonify({
            "message": "Session ended successfully",
            "summary": summary,
        })

    except Exception as e:
        logger.error(f"End session error: {e}")
        return jsonify({"error": str(e)}), 500


@tutor_session_bp.route("/<session_id>/history", methods=["GET"])
@require_auth
def get_session_history(session_id: str):
    """Get the conversation history for a session."""
    try:
        tutor = active_sessions.get(session_id)

        if not tutor:
            return jsonify({"error": "Session not found"}), 404

        return jsonify({
            "session_id": session_id,
            "history": tutor.context.conversation_history,
        })

    except Exception as e:
        logger.error(f"History error: {e}")
        return jsonify({"error": str(e)}), 500


# User Progress endpoints

@tutor_session_bp.route("/progress", methods=["GET"])
@require_auth
def get_user_progress():
    """Get all progress for the current user."""
    try:
        user = request.user
        # This would query the user_progress table
        # For now, return empty list
        return jsonify({
            "user_id": user.get("email") or user.get("sub"),
            "progress": [],
        })

    except Exception as e:
        logger.error(f"Progress error: {e}")
        return jsonify({"error": str(e)}), 500


@tutor_session_bp.route("/progress/<board>/<subject>/<chapter>", methods=["GET"])
@require_auth
def get_chapter_progress(board: str, subject: str, chapter: str):
    """Get progress for a specific chapter."""
    try:
        user = request.user
        # This would query the user_progress table
        # For now, return default progress
        return jsonify({
            "user_id": user.get("email") or user.get("sub"),
            "board": board,
            "subject": subject,
            "chapter": chapter,
            "completion_percentage": 0,
            "mastery_level": "beginner",
            "sessions_completed": 0,
        })

    except Exception as e:
        logger.error(f"Chapter progress error: {e}")
        return jsonify({"error": str(e)}), 500


@tutor_session_bp.route("/scheduled", methods=["GET"])
@require_auth
def get_scheduled_sessions():
    """Get scheduled/upcoming tutoring sessions for the current user.

    In the future, this will query a database for scheduled sessions.
    Currently returns active in-memory sessions as appointments.
    """
    try:
        user = request.user
        user_id = user.get("email") or user.get("sub")

        # Build list of sessions from active sessions that belong to this user
        scheduled = []
        for session_id, tutor in active_sessions.items():
            if tutor.context.user_id == user_id:
                ctx = tutor.context
                scheduled.append({
                    "id": session_id,
                    "title": f"{ctx.subject_name} - {ctx.chapter_name}",
                    "tutor": "AI Tutor",
                    "email": "tutor@anantra.ai",
                    "zoomLink": "",  # Not applicable for AI tutor
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "startTime": "08:00",
                    "endTime": "09:00",
                    "description": f"Learning session for {ctx.chapter_name} in {ctx.subject_name} ({ctx.board_name})",
                    "board": ctx.board,
                    "subject": ctx.subject,
                    "chapter": ctx.chapter,
                    "currentState": ctx.current_state.value,
                    "isPaused": ctx.is_paused,
                })

        return jsonify({
            "user_id": user_id,
            "sessions": scheduled,
            "total": len(scheduled),
        })

    except Exception as e:
        logger.error(f"Scheduled sessions error: {e}")
        return jsonify({"error": str(e)}), 500
