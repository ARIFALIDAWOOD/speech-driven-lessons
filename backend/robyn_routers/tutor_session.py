"""Tutor session routes for Robyn."""

import json
import logging

from robyn import SubRouter, Request, SSEResponse, SSEMessage

from .auth import get_auth_handler, require_auth
from services import (
    TutorSessionService,
    CreateSessionRequest,
    ProcessResponseRequest,
    SessionNotFoundError,
    ValidationError,
)

router = SubRouter(__file__, prefix="/api/tutor-session")
logger = logging.getLogger(__name__)

# Add authentication to all routes
router.configure_authentication(get_auth_handler())


def _get_user_id(user: dict) -> str:
    """Extract user ID from auth user dict."""
    return user.get("email") or user.get("id")


def _handle_session_error(e: Exception) -> tuple[dict, dict, int]:
    """Convert session exceptions to HTTP responses."""
    if isinstance(e, SessionNotFoundError):
        return {"detail": "Session not found"}, {}, 404
    elif isinstance(e, ValidationError):
        return {"detail": str(e)}, {}, 400
    else:
        logger.error(f"Unexpected error: {e}")
        return {"detail": str(e)}, {}, 500


@router.post("/create", auth_required=True)
async def create_session(request: Request):
    """Create a new tutoring session."""
    try:
        user = require_auth(request)
        body = request.json()
        user_email = _get_user_id(user)

        # Phase 2: Check embeddings if course_id provided
        course_id = body.get("course_id")
        if course_id:
            from services import CourseService

            course_service = CourseService(user_email=user_email)
            embeddings_status = course_service.get_embeddings_status(course_id)

            if embeddings_status.get("status") == "not_found":
                return {"detail": "Course not found"}, {}, 404

            if embeddings_status.get("status") not in ("ready", "unknown"):
                # Allow unknown for backward compatibility
                status = embeddings_status.get("status")
                if status == "building":
                    return {
                        "detail": "Course embeddings are being built. Please wait.",
                        "status": status,
                    }, {}, 409
                elif status == "stale":
                    # Allow stale but warn
                    logger.warning(f"Starting session with stale embeddings for {course_id}")
                elif status == "error":
                    return {
                        "detail": f"Embeddings build failed: {embeddings_status.get('error')}",
                        "status": status,
                    }, {}, 409

        service = TutorSessionService(user_id=user_email)
        req = CreateSessionRequest(
            board=body.get("selection_board", ""),
            subject=body.get("selection_subject", ""),
            chapter=body.get("selection_chapter", ""),
            topic=body.get("selection_topic"),
            course_id=course_id,  # Pass validated course_id
        )

        response = service.create_session(req)

        return (
            {
                "session_id": response.session.session_id if response.session else None,
                "context": response.session.to_dict() if response.session else None,
                "outline": response.outline,
                "message": response.message,
            },
            {},
            201,
        )

    except ValidationError as e:
        return {"detail": str(e)}, {}, 400
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        return {"detail": str(e)}, {}, 500


@router.get("/:session_id/stream", auth_required=True)
async def stream_session(request: Request):
    """SSE endpoint for real-time tutor updates."""
    session_id = request.path_params.get("session_id")

    # Check if session exists
    if not TutorSessionService.session_exists(session_id):
        return {"detail": "Session not found"}, {}, 404

    user = require_auth(request)
    service = TutorSessionService(user_id=_get_user_id(user))

    def generate():
        """Generate SSE events."""
        try:
            for event_json in service.stream_session(session_id):
                yield SSEMessage(event_json)
        except SessionNotFoundError:
            error_data = json.dumps({"event": "error", "message": "Session not found"})
            yield SSEMessage(error_data)
        except Exception as e:
            logger.error(f"Stream error: {e}")
            error_data = json.dumps({"event": "error", "message": str(e)})
            yield SSEMessage(error_data)

    return SSEResponse(generate())


@router.post("/:session_id/respond", auth_required=True)
async def respond_to_tutor(request: Request):
    """Send a response to the tutor. Returns SSE stream."""
    session_id = request.path_params.get("session_id")

    # Check if session exists
    if not TutorSessionService.session_exists(session_id):
        return {"detail": "Session not found"}, {}, 404

    body = request.json()
    message = body.get("message")

    if not message:
        return {"detail": "Message is required"}, {}, 400

    user = require_auth(request)
    service = TutorSessionService(user_id=_get_user_id(user))

    req = ProcessResponseRequest(
        session_id=session_id,
        message=message,
    )

    def generate():
        """Generate SSE events for tutor response."""
        try:
            for event_json in service.process_response(req):
                yield SSEMessage(event_json)
        except SessionNotFoundError:
            error_data = json.dumps({"event": "error", "message": "Session not found"})
            yield SSEMessage(error_data)
        except Exception as e:
            logger.error(f"Response error: {e}")
            error_data = json.dumps({"event": "error", "message": str(e)})
            yield SSEMessage(error_data)

    return SSEResponse(generate())


@router.get("/:session_id/status", auth_required=True)
async def get_session_status(request: Request):
    """Get the current status of a tutoring session."""
    try:
        session_id = request.path_params.get("session_id")
        user = require_auth(request)

        service = TutorSessionService(user_id=_get_user_id(user))
        status = service.get_status(session_id)

        return {
            "session_id": status.session_id,
            "current_state": status.state,
            "student_level": status.progress.get("student_level", "beginner"),
            "assessment_score": status.assessment_score,
            "concepts_covered": status.progress.get("concepts_covered", []),
            "current_topic": status.progress.get("current_topic"),
            "progress": {
                "section_index": status.progress.get("section_index", 0),
                "subtopic_index": status.progress.get("subtopic_index", 0),
                "time_spent_minutes": status.progress.get("time_spent_minutes", 0),
            },
            "is_paused": status.is_paused,
        }

    except SessionNotFoundError:
        return {"detail": "Session not found"}, {}, 404
    except Exception as e:
        logger.error(f"Error getting session status: {e}")
        return {"detail": str(e)}, {}, 500


@router.post("/:session_id/pause", auth_required=True)
async def pause_session(request: Request):
    """Pause a tutoring session."""
    try:
        session_id = request.path_params.get("session_id")
        user = require_auth(request)

        service = TutorSessionService(user_id=_get_user_id(user))
        response = service.pause_session(session_id)

        return {
            "message": response.message,
            "state": response.session.state if response.session else None,
        }

    except SessionNotFoundError:
        return {"detail": "Session not found"}, {}, 404
    except Exception as e:
        logger.error(f"Error pausing session: {e}")
        return {"detail": str(e)}, {}, 500


@router.post("/:session_id/resume", auth_required=True)
async def resume_session(request: Request):
    """Resume a paused tutoring session."""
    session_id = request.path_params.get("session_id")

    # Check if session exists
    if not TutorSessionService.session_exists(session_id):
        return {"detail": "Session not found"}, {}, 404

    user = require_auth(request)
    service = TutorSessionService(user_id=_get_user_id(user))

    def generate():
        """Generate SSE events for resume."""
        try:
            for event_json in service.resume_session(session_id):
                yield SSEMessage(event_json)
        except SessionNotFoundError:
            error_data = json.dumps({"event": "error", "message": "Session not found"})
            yield SSEMessage(error_data)
        except Exception as e:
            logger.error(f"Resume error: {e}")
            error_data = json.dumps({"event": "error", "message": str(e)})
            yield SSEMessage(error_data)

    return SSEResponse(generate())


@router.post("/:session_id/end", auth_required=True)
async def end_session(request: Request):
    """End a tutoring session and save progress."""
    try:
        session_id = request.path_params.get("session_id")
        user = require_auth(request)

        service = TutorSessionService(user_id=_get_user_id(user))
        response = service.end_session(session_id)

        return {
            "message": response.message,
            "summary": response.summary,
        }

    except SessionNotFoundError:
        return {"detail": "Session not found"}, {}, 404
    except Exception as e:
        logger.error(f"Error ending session: {e}")
        return {"detail": str(e)}, {}, 500


@router.get("/:session_id/history", auth_required=True)
async def get_session_history(request: Request):
    """Get the conversation history for a session."""
    try:
        session_id = request.path_params.get("session_id")
        user = require_auth(request)

        service = TutorSessionService(user_id=_get_user_id(user))
        response = service.get_history(session_id)

        return {
            "session_id": session_id,
            "history": response.history,
        }

    except SessionNotFoundError:
        return {"detail": "Session not found"}, {}, 404
    except Exception as e:
        logger.error(f"Error getting session history: {e}")
        return {"detail": str(e)}, {}, 500


@router.get("/progress", auth_required=True)
async def get_user_progress(request: Request):
    """Get all progress for the current user."""
    user = require_auth(request)
    service = TutorSessionService(user_id=_get_user_id(user))

    return service.get_user_progress()


@router.get("/progress/:board/:subject/:chapter", auth_required=True)
async def get_chapter_progress(request: Request):
    """Get progress for a specific chapter."""
    user = require_auth(request)
    board = request.path_params.get("board")
    subject = request.path_params.get("subject")
    chapter = request.path_params.get("chapter")

    service = TutorSessionService(user_id=_get_user_id(user))
    return service.get_chapter_progress(board, subject, chapter)


@router.get("/scheduled", auth_required=True)
async def get_scheduled_sessions(request: Request):
    """Get scheduled/upcoming tutoring sessions for the current user."""
    user = require_auth(request)
    user_id = _get_user_id(user)

    service = TutorSessionService(user_id=user_id)
    sessions = service.get_user_sessions()

    return {
        "user_id": user_id,
        "sessions": sessions,
        "total": len(sessions),
    }
