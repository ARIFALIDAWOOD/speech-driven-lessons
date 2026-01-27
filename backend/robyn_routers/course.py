"""Course management routes for Robyn."""

import logging
import os

from robyn import SubRouter, Request

from .auth import get_auth_handler, require_auth
from services import (
    CourseService,
    CreateCourseRequest,
    UpdateStepRequest,
    UploadFileRequest,
    DeleteFileRequest,
    NotFoundError,
    ValidationError,
    StorageError,
    ProcessingError,
)

router = SubRouter(__file__, prefix="/api/course")
logger = logging.getLogger(__name__)

# Add authentication to all routes in this router
router.configure_authentication(get_auth_handler())


def _get_api_key() -> str | None:
    """Get OpenAI API key from environment."""
    return os.getenv("OPENAI_API_KEY")


def _handle_service_error(e: Exception) -> tuple[dict, int, dict]:
    """Convert service exceptions to HTTP responses."""
    if isinstance(e, NotFoundError):
        return {"detail": str(e)}, 404, {}
    elif isinstance(e, ValidationError):
        return {"detail": str(e)}, 400, {}
    elif isinstance(e, (StorageError, ProcessingError)):
        logger.error(f"Service error: {e}")
        return {"detail": str(e)}, 500, {}
    else:
        logger.error(f"Unexpected error: {e}")
        return {"detail": "An unexpected error occurred"}, 500, {}


@router.post("/create-course", auth_required=True)
async def create_course(request: Request):
    """Create or update a course."""
    try:
        user = require_auth(request)
        body = request.json()

        api_key = _get_api_key()
        service = CourseService(user_email=user["email"], api_key=api_key)

        create_process_data = body.get("create_course_process", {})
        req = CreateCourseRequest(
            course_title=body.get("course_title", ""),
            course_id=body.get("course_id"),
            course_description=body.get("description", ""),
            ai_voice=body.get("ai_voice", "jennifer"),
            current_step=create_process_data.get("current_step", 1),
        )

        response = service.create_or_update_course(req)
        return {
            "message": response.message,
            "course": response.course.to_dict() if response.course else None,
        }

    except (NotFoundError, ValidationError, StorageError) as e:
        return _handle_service_error(e)
    except Exception as e:
        logger.error(f"Error creating/updating course: {e}")
        return {"detail": "An unexpected error occurred during course creation/update"}, 500, {}


@router.post("/customize", auth_required=True)
async def customize_course(request: Request):
    """Customize a course."""
    try:
        user = require_auth(request)
        body = request.json()

        api_key = _get_api_key()
        service = CourseService(user_email=user["email"], api_key=api_key)

        response = service.customize_course(
            course_id=body.get("id"),
            title=body.get("title"),
            progress=body.get("progress", 0),
            ai_tutor=body.get("aiTutor", {}),
            uploaded_files=body.get("uploadedFiles", []),
        )

        if response.success:
            return {"message": response.message}
        else:
            return {"detail": response.message}, 500, {}

    except (NotFoundError, ValidationError, StorageError) as e:
        return _handle_service_error(e)
    except Exception as e:
        logger.error(f"Error customizing course: {e}")
        return {"detail": str(e)}, 500, {}


@router.post("/generate-course-syllabus", auth_required=True)
async def generate_course_syllabus(request: Request):
    """Generate course syllabus based on uploaded content."""
    try:
        user = require_auth(request)
        body = request.json()
        course_id = body.get("course_id")

        logger.info(f"Syllabus generation requested for course {course_id}")
        service = CourseService(user_email=user["email"])

        response = service.generate_syllabus(course_id)
        return response.to_dict()

    except (NotFoundError, ValidationError, StorageError) as e:
        return _handle_service_error(e)
    except Exception as e:
        logger.error(f"Error generating syllabus: {e}")
        return {"detail": str(e)}, 500, {}


@router.post("/generate-course-slides", auth_required=True)
async def generate_course_slides(request: Request):
    """Generate course slides."""
    try:
        user = require_auth(request)
        body = request.json()
        course_id = body.get("course_id")

        service = CourseService(user_email=user["email"])
        response = service.generate_slides(course_id)

        if response.success:
            return {"message": response.message}
        else:
            return {"detail": response.message}, 500, {}

    except (NotFoundError, ValidationError, StorageError) as e:
        return _handle_service_error(e)
    except Exception as e:
        logger.error(f"Error generating slides: {e}")
        return {"detail": str(e)}, 500, {}


@router.get("/courses", auth_required=True)
async def get_courses(request: Request):
    """Get all courses for the authenticated user."""
    try:
        user = require_auth(request)

        api_key = _get_api_key()
        service = CourseService(user_email=user["email"], api_key=api_key)

        response = service.get_all_courses()
        return response.to_dict()

    except Exception as e:
        logger.error(f"Error getting courses: {e}")
        return {"detail": str(e)}, 500, {}


@router.get("/fetch-course/:course_id", auth_required=True)
async def fetch_course_info(request: Request):
    """Fetch a single course info by ID."""
    try:
        user = require_auth(request)
        course_id = request.path_params.get("course_id")

        service = CourseService(user_email=user["email"])
        response = service.get_course(course_id)

        return {
            "message": response.message,
            "course": response.course.to_dict() if response.course else None,
        }

    except NotFoundError:
        return {"detail": "Course not found or access denied"}, 404, {}
    except Exception as e:
        logger.error(f"Error fetching course: {e}")
        return {"detail": str(e)}, 500, {}


@router.delete("/delete/:course_id", auth_required=True)
async def delete_course_endpoint(request: Request):
    """Delete a course."""
    try:
        user = require_auth(request)
        course_id = request.path_params.get("course_id")

        service = CourseService(user_email=user["email"])
        response = service.delete_course(course_id)

        if response.success:
            return {"message": response.message}
        else:
            return {"detail": response.message}, 500, {}

    except (NotFoundError, StorageError) as e:
        return _handle_service_error(e)
    except Exception as e:
        logger.error(f"Error deleting course: {e}")
        return {"detail": str(e)}, 500, {}


@router.post("/upload-file", auth_required=True)
async def upload_file(request: Request):
    """Upload a file to a course."""
    try:
        user = require_auth(request)

        # Get form data
        form_data = request.form_data
        files = request.files

        course_id = form_data.get("course_id")
        if not course_id:
            return {"detail": "course_id is required"}, 400, {}

        # Get the uploaded file
        if not files or "file" not in files:
            return {"detail": "No file uploaded"}, 400, {}

        file_info = files["file"]
        filename = file_info.get("filename", "")
        file_content = file_info.get("body", b"")

        if not filename:
            return {"detail": "No selected file"}, 400, {}

        service = CourseService(user_email=user["email"])
        req = UploadFileRequest(
            course_id=course_id,
            filename=filename,
            file_content=file_content,
        )

        response = service.upload_file(req)

        if response.success:
            return {"message": response.message, "filename": filename}
        else:
            return {"detail": response.message}, 500, {}

    except ValidationError as e:
        return {"detail": str(e)}, 400, {}
    except (NotFoundError, StorageError) as e:
        return _handle_service_error(e)
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        return {"detail": str(e)}, 500, {}


@router.delete("/delete-file", auth_required=True)
async def delete_file(request: Request):
    """Delete a file from a course."""
    try:
        user = require_auth(request)
        body = request.json()

        service = CourseService(user_email=user["email"])
        req = DeleteFileRequest(
            course_id=body.get("course_id"),
            filename=body.get("filename"),
        )

        response = service.delete_file(req)

        if response.success:
            return {"message": response.message}
        else:
            return {"detail": response.message}, 500, {}

    except (NotFoundError, StorageError) as e:
        return _handle_service_error(e)
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        return {"detail": str(e)}, 500, {}


@router.get("/get-file", auth_required=True)
async def get_file(request: Request):
    """Get file endpoint - placeholder."""
    return {"detail": "Get file endpoint not implemented"}, 501, {}


@router.post("/process-content/:course_id", auth_required=True)
async def process_course_content_endpoint(request: Request):
    """Process course content by chunking files and creating FAISS embeddings."""
    try:
        user = require_auth(request)
        course_id = request.path_params.get("course_id")

        api_key = _get_api_key()
        if not api_key:
            return {"detail": "Missing API key"}, 500, {}

        logger.info(f"Starting content processing for course {course_id}")
        service = CourseService(user_email=user["email"], api_key=api_key)

        # Note: The original code called generate_slides here, keeping same behavior
        response = service.generate_slides(course_id)

        if response.success:
            return {"message": "Course content processed successfully"}
        else:
            return {"detail": response.message}, 500, {}

    except ValidationError as e:
        return {"detail": str(e)}, 400, {}
    except (NotFoundError, StorageError, ProcessingError) as e:
        return _handle_service_error(e)
    except Exception as e:
        logger.error(f"Error processing content: {e}")
        return {"detail": str(e)}, 500, {}


@router.post("/auto-save-content", auth_required=True)
async def auto_save_content(request: Request):
    """Auto-save course content without changing the step."""
    try:
        user = require_auth(request)
        body = request.json()

        service = CourseService(user_email=user["email"])
        response = service.auto_save_content(
            course_title=body.get("course_title", ""),
            description=body.get("description"),
            course_id=body.get("course_id"),
        )

        return {
            "message": response.message,
            "course": response.course.to_dict() if response.course else None,
        }

    except NotFoundError as e:
        return {"detail": f"Course {e.resource_id} not found or does not exist"}, 404, {}
    except ValidationError as e:
        return {"detail": str(e)}, 400, {}
    except Exception as e:
        logger.error(f"Error auto-saving content: {e}")
        return {"detail": str(e)}, 500, {}


@router.post("/update-step", auth_required=True)
async def update_course_step(request: Request):
    """Update only the course step during navigation."""
    try:
        user = require_auth(request)
        body = request.json()

        course_id = body.get("course_id")
        create_course_process = body.get("create_course_process", {})
        creation_step = create_course_process.get("current_step")
        is_creation_complete = create_course_process.get("is_creation_complete", False)

        if not isinstance(creation_step, int) or creation_step < 1 or creation_step > 6:
            return {"detail": "Valid step number (1-6) is required"}, 400, {}

        service = CourseService(user_email=user["email"])
        req = UpdateStepRequest(
            course_id=course_id,
            current_step=creation_step,
        )

        response = service.update_step(req, is_creation_complete=is_creation_complete)

        return {
            "message": response.message,
            "course": response.course.to_dict() if response.course else None,
        }

    except NotFoundError as e:
        return {"detail": f"Course {e.resource_id} not found"}, 404, {}
    except ValidationError as e:
        return {"detail": str(e)}, 400, {}
    except Exception as e:
        logger.error(f"Error updating course step: {e}")
        return {"detail": str(e)}, 500, {}
