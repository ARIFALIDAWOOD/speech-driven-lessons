"""Community course management routes for Robyn."""

import logging

from robyn import Request, SubRouter

from models.community_course import (
    CourseFilters,
    CreateCourseRequest,
    SubmitContributionRequest,
)
from models.exceptions import NotFoundError, StorageError, ValidationError
from services.community_course_service import CommunityCourseService

from .auth import get_auth_handler, require_auth

router = SubRouter(__file__, prefix="/api/community")
logger = logging.getLogger(__name__)

# Add authentication to all routes in this router
router.configure_authentication(get_auth_handler())


def _handle_service_error(e: Exception) -> tuple[dict, dict, int]:
    """Convert service exceptions to HTTP responses."""
    if isinstance(e, NotFoundError):
        return {"detail": str(e)}, {}, 404
    elif isinstance(e, ValidationError):
        return {"detail": str(e)}, {}, 400
    elif isinstance(e, StorageError):
        logger.error(f"Storage error: {e}")
        return {"detail": str(e)}, {}, 500
    else:
        logger.error(f"Unexpected error: {e}")
        return {"detail": "An unexpected error occurred"}, {}, 500


def _get_service(request: Request) -> CommunityCourseService:
    """Create service instance from request auth."""
    user = require_auth(request)
    return CommunityCourseService(
        user_id=user["id"],
        user_email=user["email"],
    )


# =============================================================================
# COURSE ENDPOINTS
# =============================================================================


@router.get("/courses", auth_required=True)
async def list_courses(request: Request):
    """
    List community courses with optional filters.

    Query params:
      - board: Filter by board ID
      - subject: Filter by subject ID
      - chapter: Filter by chapter ID
      - status: Filter by status (default: active)
      - limit: Number of results (default: 50)
      - offset: Pagination offset (default: 0)
      - class_level: Filter by class level (6-12)
      - state_id: Filter by state ID
      - city_id: Filter by city ID
      - search: Search in title/description
    """
    try:
        service = _get_service(request)
        query_params = request.query_params

        # Parse class_level if provided
        class_level = None
        if query_params.get("class_level"):
            try:
                class_level = int(query_params.get("class_level"))
            except ValueError:
                pass

        filters = CourseFilters(
            board_id=query_params.get("board"),
            subject_id=query_params.get("subject"),
            chapter_id=query_params.get("chapter"),
            status=query_params.get("status", "active"),
            limit=int(query_params.get("limit", "50")),
            offset=int(query_params.get("offset", "0")),
            class_level=class_level,
            state_id=query_params.get("state_id"),
            city_id=query_params.get("city_id"),
            search=query_params.get("search"),
        )

        response = service.list_courses(filters)
        return response.to_dict()

    except Exception as e:
        return _handle_service_error(e)


@router.get("/courses/check", auth_required=True)
async def check_course_exists(request: Request):
    """
    Check if a course exists for the given B/S/C combination.

    Query params:
      - board: Board ID (required)
      - subject: Subject ID (required)
      - chapter: Chapter ID (required)
    """
    try:
        service = _get_service(request)
        query_params = request.query_params

        board_id = query_params.get("board")
        subject_id = query_params.get("subject")
        chapter_id = query_params.get("chapter")

        if not board_id or not subject_id or not chapter_id:
            return {"detail": "board, subject, and chapter are required"}, {}, 400

        existing = service.check_duplicate(board_id, subject_id, chapter_id)

        return {
            "exists": existing is not None,
            "course": existing.to_dict() if existing else None,
        }

    except Exception as e:
        return _handle_service_error(e)


@router.post("/courses", auth_required=True)
async def create_course(request: Request):
    """
    Create a new community course.

    Body:
      - title: Course title (required)
      - board_id: Board ID (required)
      - subject_id: Subject ID (required)
      - chapter_id: Chapter ID (required)
      - description: Course description
      - board_name: Human-readable board name
      - subject_name: Human-readable subject name
      - chapter_name: Human-readable chapter name
      - is_custom: Whether this is a custom course (default: false)
      - class_level: Class level (6-12)
      - state_id: State ID
      - city_id: City ID
      - state_name: State name
      - city_name: City name
    """
    try:
        service = _get_service(request)
        body = request.json()

        # Parse class_level if provided
        class_level = None
        if body.get("class_level"):
            try:
                class_level = int(body.get("class_level"))
                if class_level < 6 or class_level > 12:
                    return {"detail": "class_level must be between 6 and 12"}, {}, 400
            except ValueError:
                return {"detail": "class_level must be an integer"}, {}, 400

        req = CreateCourseRequest(
            title=body.get("title", ""),
            board_id=body.get("board_id", ""),
            subject_id=body.get("subject_id", ""),
            chapter_id=body.get("chapter_id", ""),
            description=body.get("description"),
            board_name=body.get("board_name"),
            subject_name=body.get("subject_name"),
            chapter_name=body.get("chapter_name"),
            is_custom=body.get("is_custom", False),
            class_level=class_level,
            state_id=body.get("state_id"),
            city_id=body.get("city_id"),
            state_name=body.get("state_name"),
            city_name=body.get("city_name"),
        )

        if not req.title:
            return {"detail": "title is required"}, {}, 400
        if not req.board_id:
            return {"detail": "board_id is required"}, {}, 400
        if not req.subject_id:
            return {"detail": "subject_id is required"}, {}, 400
        if not req.chapter_id:
            return {"detail": "chapter_id is required"}, {}, 400

        course = service.create_course(req)
        return {
            "message": "Course created successfully",
            "course": course.to_dict(),
        }

    except ValidationError as e:
        return {"detail": str(e)}, {}, 400
    except Exception as e:
        return _handle_service_error(e)


@router.get("/courses/:course_id", auth_required=True)
async def get_course_detail(request: Request):
    """Get detailed course information including materials and contributors."""
    try:
        service = _get_service(request)
        course_id = request.path_params.get("course_id")

        detail = service.get_course_detail(course_id)
        return detail.to_dict()

    except NotFoundError:
        return {"detail": "Course not found"}, {}, 404
    except Exception as e:
        return _handle_service_error(e)


# =============================================================================
# MEMBERSHIP ENDPOINTS
# =============================================================================


@router.post("/courses/:course_id/join", auth_required=True)
async def join_course(request: Request):
    """Join a course as a learner."""
    try:
        service = _get_service(request)
        course_id = request.path_params.get("course_id")

        membership = service.join_course(course_id)
        return {
            "message": "Successfully joined course",
            "membership": membership.to_dict(),
        }

    except NotFoundError:
        return {"detail": "Course not found"}, {}, 404
    except Exception as e:
        return _handle_service_error(e)


@router.delete("/courses/:course_id/leave", auth_required=True)
async def leave_course(request: Request):
    """Leave a course."""
    try:
        service = _get_service(request)
        course_id = request.path_params.get("course_id")

        service.leave_course(course_id)
        return {"message": "Successfully left course"}

    except Exception as e:
        return _handle_service_error(e)


@router.put("/courses/:course_id/progress", auth_required=True)
async def update_progress(request: Request):
    """
    Update progress in a course.

    Body:
      - progress_pct: Progress percentage (0-100)
      - time_spent_mins: Time spent in minutes
    """
    try:
        service = _get_service(request)
        course_id = request.path_params.get("course_id")
        body = request.json()

        progress_pct = float(body.get("progress_pct", 0))
        time_spent_mins = int(body.get("time_spent_mins", 0))

        membership = service.update_progress(course_id, progress_pct, time_spent_mins)
        return {
            "message": "Progress updated",
            "membership": membership.to_dict(),
        }

    except NotFoundError:
        return {"detail": "Membership not found"}, {}, 404
    except Exception as e:
        return _handle_service_error(e)


# =============================================================================
# CONTRIBUTION ENDPOINTS
# =============================================================================


@router.post("/courses/:course_id/contribute", auth_required=True)
async def submit_contribution(request: Request):
    """
    Submit a contribution to a course.

    For file uploads (pdf, image):
      Expects multipart form data with:
        - file: The file to upload
        - contribution_type: 'pdf' or 'image' (optional, defaults to 'pdf')

    For non-file contributions (youtube, link, text):
      Expects JSON body with:
        - contribution_type: 'youtube', 'link', or 'text'
        - filename: Display name for the contribution
        - contribution_metadata: { url, title, content } based on type
    """
    try:
        service = _get_service(request)
        course_id = request.path_params.get("course_id")

        # Check if this is a file upload or JSON request
        files = request.files
        content_type = request.headers.get("content-type", "")

        if files and "file" in files:
            # Handle file upload (pdf, image)
            file_info = files["file"]
            filename = file_info.get("filename", "")
            file_content = file_info.get("body", b"")

            if not filename:
                return {"detail": "No filename provided"}, {}, 400

            # Get contribution type from form data if available
            form_data = request.form_data or {}
            contribution_type = form_data.get("contribution_type", "pdf")

            req = SubmitContributionRequest(
                course_id=course_id,
                filename=filename,
                file_content=file_content,
                file_size=len(file_content),
                contribution_type=contribution_type,
            )
        elif "application/json" in content_type:
            # Handle JSON contribution (youtube, link, text)
            body = request.json()
            contribution_type = body.get("contribution_type", "")

            if contribution_type not in ["youtube", "link", "text"]:
                return {"detail": "For JSON requests, contribution_type must be 'youtube', 'link', or 'text'"}, {}, 400

            filename = body.get("filename", "")
            if not filename:
                return {"detail": "filename is required"}, {}, 400

            contribution_metadata = body.get("contribution_metadata", {})

            # Map metadata fields based on type
            if contribution_type == "youtube":
                contribution_metadata["url"] = contribution_metadata.get("url", filename)
            elif contribution_type == "link":
                contribution_metadata["url"] = contribution_metadata.get("url", filename)
            elif contribution_type == "text":
                if not contribution_metadata.get("content"):
                    return {"detail": "contribution_metadata.content is required for text contributions"}, {}, 400

            req = SubmitContributionRequest(
                course_id=course_id,
                filename=filename,
                file_content=b"",
                file_size=0,
                contribution_type=contribution_type,
                contribution_metadata=contribution_metadata,
            )
        else:
            return {"detail": "No file uploaded or invalid content type"}, {}, 400

        contribution = service.submit_contribution(req)
        return {
            "message": "Contribution submitted successfully",
            "contribution": contribution.to_dict(),
        }

    except ValidationError as e:
        return {"detail": str(e)}, {}, 400
    except NotFoundError:
        return {"detail": "Course not found"}, {}, 404
    except Exception as e:
        return _handle_service_error(e)


@router.get("/courses/:course_id/contributions", auth_required=True)
async def list_contributions(request: Request):
    """
    List contributions for a course.

    Query params:
      - status: Filter by status (pending, approved, rejected)
    """
    try:
        service = _get_service(request)
        course_id = request.path_params.get("course_id")
        status = request.query_params.get("status")

        response = service.list_contributions(course_id, status)
        return response.to_dict()

    except Exception as e:
        return _handle_service_error(e)


@router.post("/contributions/:contribution_id/approve", auth_required=True)
async def approve_contribution(request: Request):
    """Approve a pending contribution."""
    try:
        service = _get_service(request)
        contribution_id = request.path_params.get("contribution_id")

        contribution = service.approve_contribution(contribution_id)
        return {
            "message": "Contribution approved",
            "contribution": contribution.to_dict(),
        }

    except ValidationError as e:
        return {"detail": str(e)}, {}, 400
    except NotFoundError:
        return {"detail": "Contribution not found"}, {}, 404
    except Exception as e:
        return _handle_service_error(e)


@router.post("/contributions/:contribution_id/reject", auth_required=True)
async def reject_contribution(request: Request):
    """
    Reject a pending contribution.

    Body:
      - reason: Rejection reason (required)
    """
    try:
        service = _get_service(request)
        contribution_id = request.path_params.get("contribution_id")
        body = request.json()

        reason = body.get("reason", "")
        if not reason:
            return {"detail": "Rejection reason is required"}, {}, 400

        contribution = service.reject_contribution(contribution_id, reason)
        return {
            "message": "Contribution rejected",
            "contribution": contribution.to_dict(),
        }

    except ValidationError as e:
        return {"detail": str(e)}, {}, 400
    except NotFoundError:
        return {"detail": "Contribution not found"}, {}, 404
    except Exception as e:
        return _handle_service_error(e)


# =============================================================================
# USER PROGRESS ENDPOINTS
# =============================================================================


@router.get("/my-progress", auth_required=True)
async def get_my_progress(request: Request):
    """Get all courses the user is enrolled in with progress."""
    try:
        service = _get_service(request)

        progress = service.get_user_progress()
        return {
            "courses": [p.to_dict() for p in progress],
            "total": len(progress),
        }

    except Exception as e:
        return _handle_service_error(e)


@router.get("/my-contributions", auth_required=True)
async def get_my_contributions(request: Request):
    """Get all contributions made by the user."""
    try:
        service = _get_service(request)

        contributions = service.get_user_contributions()
        return {
            "contributions": [c.to_dict() for c in contributions],
            "total": len(contributions),
        }

    except Exception as e:
        return _handle_service_error(e)


# =============================================================================
# ADMIN ENDPOINTS
# =============================================================================


@router.get("/admin/pending", auth_required=True)
async def list_pending_contributions(request: Request):
    """
    List all pending contributions (admin view).

    TODO: Add admin role check.
    """
    try:
        service = _get_service(request)

        response = service.list_pending_contributions()
        return response.to_dict()

    except Exception as e:
        return _handle_service_error(e)
