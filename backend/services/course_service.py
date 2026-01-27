"""
Course management service layer.

This module provides a clean interface for course operations, separating
business logic from HTTP handling. Refactored from CourseManager.
"""

import logging
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional

import utils.load_and_process_index as faiss_utils
import utils.s3_utils as s3_utils

from .dtos import (
    CourseData,
    CourseResponse,
    CreateCourseRequest,
    DeleteFileRequest,
    SlidesResponse,
    SyllabusResponse,
    UpdateStepRequest,
    UpdateTagsRequest,
    UploadFileMetadataRequest,
    UploadFileRequest,
)
from .exceptions import NotFoundError, ProcessingError, StorageError, ValidationError

logger = logging.getLogger(__name__)


class CourseService:
    """
    Service class for course management operations.

    This class encapsulates all course-related business logic, providing
    a clean interface for routers to call without dealing with implementation
    details like S3 storage.
    """

    def __init__(self, user_email: str, api_key: Optional[str] = None):
        """
        Initialize CourseService.

        Args:
            user_email: The user's email address (required).
            api_key: OpenAI API key. Optional for methods that don't require LLM.
        """
        if not user_email:
            raise ValidationError("User email cannot be empty", field="user_email")

        self.user_email = user_email
        self.api_key = api_key
        self.s3_bucket = s3_utils.S3_BUCKET_NAME

    def _get_course_folder(self, course_id: str) -> str:
        """Get the S3 path for a course."""
        return f"user_data/{self.user_email}/{course_id}/"

    def _get_course_info_key(self, course_id: str) -> str:
        """Get the S3 key for course_info.json."""
        return f"{self._get_course_folder(course_id)}course_info.json"

    def _get_current_utc_iso_string(self) -> str:
        """Returns the current UTC time in ISO 8601 format with Z."""
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    def _course_data_from_dict(self, data: dict) -> CourseData:
        """Convert a raw dict (from S3) to CourseData."""
        return CourseData.from_dict(data)

    # =========================================================================
    # CRUD Operations
    # =========================================================================

    def create_or_update_course(self, request: CreateCourseRequest) -> CourseResponse:
        """
        Create a new course or update an existing one.

        Args:
            request: CreateCourseRequest with course details.

        Returns:
            CourseResponse with the created/updated course data.
        """
        is_new_course = not request.course_id
        course_id = request.course_id or str(uuid.uuid4())

        if is_new_course:
            logger.info(
                f"[{self.user_email}] Creating new course: ID={course_id}, "
                f"Title='{request.course_title}'"
            )
        else:
            logger.info(
                f"[{self.user_email}] Updating course: ID={course_id}, "
                f"Title='{request.course_title}'"
            )

        course_info_key = self._get_course_info_key(course_id)

        # Ensure user folder exists
        s3_utils.check_and_create_user_folder(self.user_email)

        # Fetch existing or initialize new
        if not is_new_course:
            try:
                course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
                if not course_info:
                    raise NotFoundError("Course", course_id)
                logger.info(f"Fetched existing course info for {course_id}")
            except NotFoundError:
                raise
            except Exception as e:
                logger.error(f"Error fetching existing course info for {course_id}: {e}")
                raise StorageError("fetch", f"Could not retrieve course {course_id}")
        else:
            course_info = {
                "id": course_id,
                "created_at": self._get_current_utc_iso_string(),
                "title": "",
                "description": None,
                "author": self.user_email,
                "create_course_process": {"is_creation_complete": False, "current_step": 1},
                "uploadedFiles": [],
                "progress": {"hours": 0, "completion": 0.0},
                "ai_voice": "jennifer",
                "is_published": False,
                "last_updated_at": self._get_current_utc_iso_string(),
            }

        # Update fields
        course_info["title"] = request.course_title
        if request.course_description is not None:
            course_info["description"] = request.course_description
        course_info["ai_voice"] = request.ai_voice
        course_info["create_course_process"]["current_step"] = request.current_step
        course_info["last_updated_at"] = self._get_current_utc_iso_string()

        # Save to S3
        try:
            s3_utils.upload_json_to_s3(course_info, self.s3_bucket, course_info_key)
            logger.info(f"Uploaded course info to {course_info_key}")
        except Exception as e:
            logger.error(f"Failed to upload course info for {course_id}: {e}")
            raise StorageError("upload", f"Could not save course {course_id}")

        action = "updated" if request.course_id else "created"
        return CourseResponse(
            success=True,
            message=f"Course {action} successfully",
            course=self._course_data_from_dict(course_info),
        )

    def get_course(self, course_id: str) -> CourseResponse:
        """
        Get a single course by ID.

        Args:
            course_id: The course ID.

        Returns:
            CourseResponse with the course data.

        Raises:
            NotFoundError: If course doesn't exist.
        """
        course_info_key = self._get_course_info_key(course_id)

        try:
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                raise NotFoundError("Course", course_id)

            return CourseResponse(
                success=True,
                message="Course retrieved successfully",
                course=self._course_data_from_dict(course_info),
            )
        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Failed to get course info for {course_id}: {e}")
            raise StorageError("fetch", f"Could not retrieve course {course_id}")

    def get_all_courses(self) -> CourseResponse:
        """
        Get all courses for the user, categorized by completion status.

        Returns:
            CourseResponse with courses and drafts lists.
        """
        logger.info(f"Fetching all courses for user {self.user_email}")
        completed_courses = []
        draft_courses = []

        try:
            course_ids = s3_utils.list_user_course_ids(self.user_email)

            for course_id in course_ids:
                try:
                    response = self.get_course(course_id)
                    if response.course:
                        is_complete = response.course.create_course_process.is_creation_complete
                        if is_complete:
                            completed_courses.append(response.course)
                        else:
                            draft_courses.append(response.course)
                except NotFoundError:
                    logger.warning(f"Could not retrieve course info for ID: {course_id}")

            # Sort by last_updated_at descending
            completed_courses.sort(key=lambda x: x.last_updated_at, reverse=True)
            draft_courses.sort(key=lambda x: x.last_updated_at, reverse=True)

            return CourseResponse(
                success=True,
                message="Courses retrieved successfully",
                courses=completed_courses,
                drafts=draft_courses,
            )

        except Exception as e:
            logger.error(f"Error fetching all courses for {self.user_email}: {e}")
            return CourseResponse(
                success=False,
                message="Failed to retrieve courses",
                courses=[],
                drafts=[],
                error=str(e),
            )

    def delete_course(self, course_id: str) -> CourseResponse:
        """
        Delete a course and all its files.

        Args:
            course_id: The course ID to delete.

        Returns:
            CourseResponse indicating success/failure.
        """
        logger.info(f"Deleting course {course_id} for user {self.user_email}")

        try:
            course_folder = self._get_course_folder(course_id)
            s3_utils.delete_folder_from_s3(self.s3_bucket, course_folder)

            logger.info(f"Successfully deleted course folder {course_id}")
            return CourseResponse(
                success=True,
                message="Course deleted successfully",
            )
        except Exception as e:
            logger.error(f"Error deleting course {course_id}: {e}")
            raise StorageError("delete", f"Could not delete course {course_id}")

    # =========================================================================
    # File Operations
    # =========================================================================

    def upload_file(self, request: UploadFileRequest) -> CourseResponse:
        """
        Upload a file to a course.

        Args:
            request: UploadFileRequest with file details.

        Returns:
            CourseResponse indicating success/failure.
        """
        # Validate PDF
        if not request.filename.endswith(".pdf"):
            raise ValidationError(
                "Only .pdf files are currently supported",
                field="filename",
            )

        s3_key = s3_utils.get_s3_course_materials_path(
            self.user_email, request.course_id, request.filename
        )
        file_size = len(request.file_content)

        # Upload to S3
        file_obj = BytesIO(request.file_content)
        try:
            s3_upload_success = s3_utils.upload_file_to_s3(file_obj, self.s3_bucket, s3_key)
            if not s3_upload_success:
                raise StorageError("upload", "Failed to upload file to storage")
        except Exception as e:
            logger.error(f"Error uploading file to S3: {e}")
            raise StorageError("upload", f"Failed to upload file: {e}")

        # Update course metadata
        metadata_request = UploadFileMetadataRequest(
            course_id=request.course_id,
            filename=request.filename,
            filesize=file_size,
        )

        try:
            self.add_file_metadata(metadata_request)
        except Exception as e:
            logger.error(f"File uploaded but failed to update metadata: {e}")
            return CourseResponse(
                success=False,
                message="File uploaded but failed to update course metadata",
                error=str(e),
            )

        return CourseResponse(
            success=True,
            message="File uploaded successfully",
        )

    def add_file_metadata(self, request: UploadFileMetadataRequest) -> bool:
        """
        Add file metadata to course_info.json after upload.

        Args:
            request: UploadFileMetadataRequest with file info.

        Returns:
            True if successful.
        """
        logger.info(
            f"[{self.user_email}] Adding file '{request.filename}' "
            f"({request.filesize} bytes) to course {request.course_id}"
        )
        course_info_key = self._get_course_info_key(request.course_id)

        try:
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                raise NotFoundError("Course", request.course_id)

            if "uploadedFiles" not in course_info:
                course_info["uploadedFiles"] = []

            # Check if file already exists
            file_exists = any(
                f.get("name") == request.filename for f in course_info["uploadedFiles"]
            )

            if not file_exists:
                course_info["uploadedFiles"].append(
                    {
                        "name": request.filename,
                        "size": request.filesize,
                    }
                )
                course_info["last_updated_at"] = self._get_current_utc_iso_string()
                s3_utils.upload_json_to_s3(course_info, self.s3_bucket, course_info_key)
                logger.info(f"Successfully added file '{request.filename}' metadata")

            return True

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error adding file metadata: {e}")
            raise StorageError("update", f"Could not add file metadata: {e}")

    def delete_file(self, request: DeleteFileRequest) -> CourseResponse:
        """
        Delete a file from a course.

        Args:
            request: DeleteFileRequest with course_id and filename.

        Returns:
            CourseResponse indicating success/failure.
        """
        s3_key = s3_utils.get_s3_course_materials_path(
            self.user_email, request.course_id, request.filename
        )

        # Delete from S3
        try:
            s3_utils.delete_file_from_s3(self.s3_bucket, s3_key)
        except Exception as e:
            logger.error(f"Error deleting file from S3: {e}")
            raise StorageError("delete", f"Failed to delete file: {e}")

        # Remove from metadata
        self._remove_file_metadata(request.course_id, request.filename)

        return CourseResponse(
            success=True,
            message="File deleted successfully",
        )

    def _remove_file_metadata(self, course_id: str, filename: str) -> bool:
        """Remove file metadata from course_info.json."""
        logger.info(f"[{self.user_email}] Removing file '{filename}' from course {course_id}")
        course_info_key = self._get_course_info_key(course_id)

        try:
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                raise NotFoundError("Course", course_id)

            initial_length = len(course_info.get("uploadedFiles", []))
            course_info["uploadedFiles"] = [
                f for f in course_info.get("uploadedFiles", []) if f.get("name") != filename
            ]

            if len(course_info["uploadedFiles"]) < initial_length:
                course_info["last_updated_at"] = self._get_current_utc_iso_string()
                s3_utils.upload_json_to_s3(course_info, self.s3_bucket, course_info_key)
                logger.info(f"Successfully removed file '{filename}' metadata")

            return True

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error removing file metadata: {e}")
            raise StorageError("update", f"Could not remove file metadata: {e}")

    # =========================================================================
    # Content Generation
    # =========================================================================

    def generate_syllabus(self, course_id: str) -> SyllabusResponse:
        """
        Generate course syllabus from uploaded content.

        Args:
            course_id: The course ID.

        Returns:
            SyllabusResponse with the generated outline.
        """
        logger.info(f"Generating syllabus for course {course_id}")

        # Verify course exists
        try:
            self.get_course(course_id)
        except NotFoundError:
            raise

        # Mock data for now - TODO: Replace with actual syllabus generation
        mock_data = {
            "course_outline": [
                {
                    "title": "Introduction",
                    "description": "Overview of the course content.",
                    "subtopics": [
                        {
                            "title": "Research Context",
                            "description": "Background and motivation.",
                        },
                        {
                            "title": "Research Methods",
                            "description": "Methodologies employed.",
                        },
                    ],
                },
                {
                    "title": "Core Concepts",
                    "description": "Fundamental concepts and principles.",
                    "subtopics": [
                        {
                            "title": "Key Principles",
                            "description": "Essential principles to understand.",
                        },
                        {
                            "title": "Practical Applications",
                            "description": "How to apply the concepts.",
                        },
                    ],
                },
            ]
        }

        # Save syllabus to S3
        try:
            syllabus_key = f"{self._get_course_folder(course_id)}syllabus.json"
            s3_utils.upload_json_to_s3(mock_data, self.s3_bucket, syllabus_key)
            logger.info(f"Successfully saved syllabus.json for course {course_id}")

            return SyllabusResponse(
                success=True,
                message="Syllabus generated successfully",
                course_outline=mock_data["course_outline"],
            )

        except Exception as e:
            logger.error(f"Failed to save syllabus.json for course {course_id}: {e}")
            raise StorageError("upload", f"Could not save syllabus: {e}")

    def generate_slides(self, course_id: str) -> SlidesResponse:
        """
        Generate course slides from syllabus.

        Args:
            course_id: The course ID.

        Returns:
            SlidesResponse with the generated slides.
        """
        logger.info(f"Generating slides for course {course_id}")

        # Verify course exists and get info
        try:
            course_response = self.get_course(course_id)
            course_info = course_response.course
        except NotFoundError:
            raise

        # Mock slide data
        mock_slides = [
            {
                "id": 1,
                "local_id": 1,
                "title": f"Welcome to {course_info.title}!",
                "slide_markdown": f"**{course_info.title}**\n\n*   Course overview\n*   Key concepts\n*   Learning objectives",
                "transcript": f"Welcome to {course_info.title}. In this lecture, we'll cover the course structure and key concepts.",
                "preview": "/images/section_1/slide_1_1.png",
                "subtopic_id": 0,
                "subtopic_title": "Introduction",
                "section_id": 1,
                "section_title": "Lecture 1: Introduction",
                "prev_slide": None,
                "next_slide": 2,
                "position": 0,
            },
            {
                "id": 2,
                "local_id": 2,
                "title": "Lecture 1: Summary",
                "slide_markdown": "*   **Overview:** Course structure\n*   **Key Concepts:** Fundamental ideas\n*   **Next Steps:** Upcoming lectures",
                "transcript": "Let's review what we covered in this lecture.",
                "preview": "/images/section_1/slide_1_2.png",
                "subtopic_id": 0,
                "subtopic_title": "Introduction",
                "section_id": 1,
                "section_title": "Lecture 1: Introduction",
                "prev_slide": 1,
                "next_slide": None,
                "position": 1,
            },
        ]

        try:
            slides_key = f"{self._get_course_folder(course_id)}slides.json"
            s3_utils.upload_json_to_s3(mock_slides, self.s3_bucket, slides_key)
            logger.info(f"Successfully saved slides for course {course_id}")

            return SlidesResponse(
                success=True,
                message="Slides generated successfully",
                slides=mock_slides,
            )

        except Exception as e:
            logger.error(f"Error saving slides for course {course_id}: {e}")
            raise StorageError("upload", f"Could not save slides: {e}")

    def get_course_outline(self, course_id: str) -> SyllabusResponse:
        """
        Get the generated course outline (syllabus).

        Args:
            course_id: The course ID.

        Returns:
            SyllabusResponse with the outline.
        """
        syllabus_key = f"{self._get_course_folder(course_id)}syllabus.json"

        try:
            syllabus_data = s3_utils.get_json_from_s3(self.s3_bucket, syllabus_key)
            if syllabus_data and isinstance(syllabus_data.get("course_outline"), list):
                return SyllabusResponse(
                    success=True,
                    message="Course outline retrieved successfully",
                    course_outline=syllabus_data["course_outline"],
                )
            else:
                raise NotFoundError("Syllabus", course_id)
        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error fetching course outline: {e}")
            raise StorageError("fetch", f"Could not retrieve syllabus: {e}")

    def get_slides(self, course_id: str) -> SlidesResponse:
        """
        Get generated slides for a course.

        Args:
            course_id: The course ID.

        Returns:
            SlidesResponse with the slides.
        """
        slides_key = f"{self._get_course_folder(course_id)}slides.json"

        try:
            slides_data = s3_utils.get_json_from_s3(self.s3_bucket, slides_key)
            if slides_data and isinstance(slides_data, list):
                return SlidesResponse(
                    success=True,
                    message="Slides retrieved successfully",
                    slides=slides_data,
                )
            else:
                raise NotFoundError("Slides", course_id)
        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error fetching slides: {e}")
            raise StorageError("fetch", f"Could not retrieve slides: {e}")

    # =========================================================================
    # Processing
    # =========================================================================

    def process_course_content(self, course_id: str) -> CourseResponse:
        """
        Trigger FAISS processing for a course's content.

        Args:
            course_id: The course ID.

        Returns:
            CourseResponse indicating success/failure.
        """
        logger.info(f"Processing content for course {course_id}")

        if not self.api_key:
            raise ValidationError(
                "API key is required for processing course content",
                field="api_key",
            )

        try:
            success = faiss_utils.process_course_context_s3(
                self.s3_bucket, self.user_email, course_id, self.api_key
            )
            if success:
                logger.info(f"Successfully processed context for course {course_id}")
                return CourseResponse(
                    success=True,
                    message="Course content processed successfully",
                )
            else:
                raise ProcessingError(
                    "Failed to process course content",
                    course_id=course_id,
                )
        except Exception as e:
            logger.error(f"Error processing context for course {course_id}: {e}")
            raise ProcessingError(str(e), course_id=course_id)

    # =========================================================================
    # Step Management
    # =========================================================================

    def update_step(
        self, request: UpdateStepRequest, is_creation_complete: bool = False
    ) -> CourseResponse:
        """
        Update only the course creation step.

        Args:
            request: UpdateStepRequest with course_id and step.
            is_creation_complete: Whether course creation is complete.

        Returns:
            CourseResponse with updated course.
        """
        if request.current_step < 1 or request.current_step > 6:
            raise ValidationError(
                "Valid step number (1-6) is required",
                field="current_step",
            )

        # Get current course
        try:
            course_response = self.get_course(request.course_id)
            course_info = course_response.course
        except NotFoundError:
            raise

        # Note: CreateCourseRequest kept for potential future validation use
        _update_request = CreateCourseRequest(
            course_title=course_info.title,
            course_id=request.course_id,
            course_description=course_info.description,
            ai_voice=course_info.ai_voice,
            current_step=request.current_step,
        )

        # Fetch raw course info to update completion flag
        course_info_key = self._get_course_info_key(request.course_id)
        raw_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
        raw_info["create_course_process"]["current_step"] = request.current_step
        raw_info["create_course_process"]["is_creation_complete"] = is_creation_complete
        raw_info["last_updated_at"] = self._get_current_utc_iso_string()

        s3_utils.upload_json_to_s3(raw_info, self.s3_bucket, course_info_key)

        return CourseResponse(
            success=True,
            message="Course step updated successfully",
            course=self._course_data_from_dict(raw_info),
        )

    def auto_save_content(
        self,
        course_title: str,
        description: Optional[str] = None,
        course_id: Optional[str] = None,
    ) -> CourseResponse:
        """
        Auto-save course content without changing the step.

        Args:
            course_title: The course title.
            description: Optional description.
            course_id: Optional course ID for existing course.

        Returns:
            CourseResponse with the saved course.
        """
        # First-time save (create new course)
        if not course_id:
            logger.info(f"Creating new course via auto-save for {self.user_email}")
            request = CreateCourseRequest(
                course_title=course_title,
                course_description=description or "",
                current_step=1,
            )
            return self.create_or_update_course(request)

        # Existing course update - preserve step
        try:
            course_response = self.get_course(course_id)
            current_course = course_response.course
        except NotFoundError:
            raise

        request = CreateCourseRequest(
            course_title=course_title,
            course_id=course_id,
            course_description=description or current_course.description,
            ai_voice=current_course.ai_voice,
            current_step=current_course.create_course_process.current_step,
        )

        response = self.create_or_update_course(request)
        response.message = "Course content auto-saved successfully"
        return response

    def customize_course(
        self,
        course_id: str,
        title: str,
        progress: int,
        ai_tutor: dict,
        uploaded_files: list,
    ) -> CourseResponse:
        """
        Customize course configuration.

        Args:
            course_id: The course ID.
            title: Course title.
            progress: Progress percentage.
            ai_tutor: AI tutor configuration.
            uploaded_files: List of uploaded files.

        Returns:
            CourseResponse indicating success/failure.

        Note: This is a stub - full implementation pending.
        """
        # TODO: Implement course customization
        return CourseResponse(
            success=False,
            message="Course customization not yet implemented",
        )

    # =========================================================================
    # Phase 2: Embeddings and Plan Management
    # =========================================================================

    def update_embeddings_status(
        self,
        course_id: str,
        status: str,
        built_at: Optional[str] = None,
        error: Optional[str] = None,
    ) -> bool:
        """
        Update the embeddings status for a course.

        Args:
            course_id: The course ID
            status: Status value ("ready", "stale", "building", "error")
            built_at: ISO timestamp of when embeddings were built
            error: Error message if status is "error"

        Returns:
            True if update succeeded, False otherwise
        """
        course_info_key = self._get_course_info_key(course_id)

        try:
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                logger.warning(f"Course not found for embeddings update: {course_id}")
                return False

            # Update embeddings fields
            course_info["embeddings_status"] = status
            course_info["last_updated_at"] = self._get_current_utc_iso_string()

            if built_at:
                course_info["embeddings_built_at"] = built_at

            if error:
                course_info["embeddings_error"] = error
            elif "embeddings_error" in course_info:
                # Clear error on non-error status
                del course_info["embeddings_error"]

            s3_utils.upload_json_to_s3(course_info, self.s3_bucket, course_info_key)
            logger.info(f"Updated embeddings status for {course_id}: {status}")
            return True

        except Exception as e:
            logger.error(f"Failed to update embeddings status for {course_id}: {e}")
            return False

    def get_embeddings_status(self, course_id: str) -> dict:
        """
        Get the embeddings status for a course.

        Args:
            course_id: The course ID

        Returns:
            Dict with status, built_at, and error fields
        """
        course_info_key = self._get_course_info_key(course_id)

        try:
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                return {"status": "not_found"}

            return {
                "status": course_info.get("embeddings_status", "unknown"),
                "built_at": course_info.get("embeddings_built_at"),
                "error": course_info.get("embeddings_error"),
            }

        except Exception as e:
            logger.error(f"Failed to get embeddings status for {course_id}: {e}")
            return {"status": "error", "error": str(e)}

    def update_plan_status(
        self,
        course_id: str,
        status: str,
        version: Optional[int] = None,
        generated_at: Optional[str] = None,
        error: Optional[str] = None,
    ) -> bool:
        """
        Update the plan/outline status for a course.

        Args:
            course_id: The course ID
            status: Status value ("ready", "generating", "error")
            version: Plan version number
            generated_at: ISO timestamp of when plan was generated
            error: Error message if status is "error"

        Returns:
            True if update succeeded, False otherwise
        """
        course_info_key = self._get_course_info_key(course_id)

        try:
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                logger.warning(f"Course not found for plan update: {course_id}")
                return False

            # Update plan fields
            course_info["plan_status"] = status
            course_info["last_updated_at"] = self._get_current_utc_iso_string()

            if version is not None:
                course_info["plan_version"] = version

            if generated_at:
                course_info["plan_generated_at"] = generated_at

            if error:
                course_info["plan_error"] = error
            elif "plan_error" in course_info:
                del course_info["plan_error"]

            s3_utils.upload_json_to_s3(course_info, self.s3_bucket, course_info_key)
            logger.info(f"Updated plan status for {course_id}: {status}")
            return True

        except Exception as e:
            logger.error(f"Failed to update plan status for {course_id}: {e}")
            return False

    def save_course_plan(self, course_id: str, plan_data: dict) -> bool:
        """
        Save a course plan to S3.

        Args:
            course_id: The course ID
            plan_data: The plan data dictionary

        Returns:
            True if save succeeded, False otherwise
        """
        plan_key = f"{self._get_course_folder(course_id)}course_plan.json"

        try:
            s3_utils.upload_json_to_s3(plan_data, self.s3_bucket, plan_key)

            # Update course info with plan metadata
            self.update_plan_status(
                course_id,
                status="ready",
                version=plan_data.get("version", 1),
                generated_at=plan_data.get("generated_at"),
            )

            logger.info(f"Saved course plan for {course_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to save course plan for {course_id}: {e}")
            return False

    def load_course_plan(self, course_id: str) -> Optional[dict]:
        """
        Load a course plan from S3.

        Args:
            course_id: The course ID

        Returns:
            Plan data dictionary, or None if not found
        """
        plan_key = f"{self._get_course_folder(course_id)}course_plan.json"

        try:
            plan_data = s3_utils.get_json_from_s3(self.s3_bucket, plan_key)
            return plan_data

        except Exception as e:
            logger.warning(f"Failed to load course plan for {course_id}: {e}")
            return None

    def get_course_status(self, course_id: str) -> dict:
        """
        Get comprehensive status for a course including plan and embeddings.

        Args:
            course_id: The course ID

        Returns:
            Dict with course, plan, and embeddings status
        """
        course_info_key = self._get_course_info_key(course_id)

        try:
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                return {"error": "Course not found"}

            return {
                "course_id": course_id,
                "title": course_info.get("title", ""),
                "is_creation_complete": course_info.get("create_course_process", {}).get(
                    "is_creation_complete", False
                ),
                "plan": {
                    "status": course_info.get("plan_status", "unknown"),
                    "version": course_info.get("plan_version"),
                    "generated_at": course_info.get("plan_generated_at"),
                    "error": course_info.get("plan_error"),
                },
                "embeddings": {
                    "status": course_info.get("embeddings_status", "unknown"),
                    "built_at": course_info.get("embeddings_built_at"),
                    "error": course_info.get("embeddings_error"),
                },
                "last_updated_at": course_info.get("last_updated_at"),
            }

        except Exception as e:
            logger.error(f"Failed to get course status for {course_id}: {e}")
            return {"error": str(e)}

    # =========================================================================
    # Phase 3: B/S/C/T Curriculum Tagging
    # =========================================================================

    def update_course_tags(self, request: UpdateTagsRequest) -> CourseResponse:
        """
        Update B/S/C/T curriculum tags for a course.

        Args:
            request: UpdateTagsRequest with course_id and tag fields

        Returns:
            CourseResponse with the updated course data
        """
        logger.info(
            f"[{self.user_email}] Updating tags for course {request.course_id}: "
            f"board={request.board_id}, subject={request.subject_id}, chapter={request.chapter_id}"
        )

        course_info_key = self._get_course_info_key(request.course_id)

        try:
            course_info = s3_utils.get_json_from_s3(self.s3_bucket, course_info_key)
            if not course_info:
                raise NotFoundError("Course", request.course_id)

            # Update curriculum tag fields
            if request.board_id is not None:
                course_info["board_id"] = request.board_id
            if request.subject_id is not None:
                course_info["subject_id"] = request.subject_id
            if request.chapter_id is not None:
                course_info["chapter_id"] = request.chapter_id
            if request.curriculum_topic is not None:
                course_info["curriculum_topic"] = request.curriculum_topic

            # Update display names
            if request.board_name is not None:
                course_info["board_name"] = request.board_name
            if request.subject_name is not None:
                course_info["subject_name"] = request.subject_name
            if request.chapter_name is not None:
                course_info["chapter_name"] = request.chapter_name

            course_info["last_updated_at"] = self._get_current_utc_iso_string()

            s3_utils.upload_json_to_s3(course_info, self.s3_bucket, course_info_key)
            logger.info(f"Successfully updated tags for course {request.course_id}")

            return CourseResponse(
                success=True,
                message="Course tags updated successfully",
                course=self._course_data_from_dict(course_info),
            )

        except NotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error updating course tags for {request.course_id}: {e}")
            raise StorageError("update", f"Could not update course tags: {e}")

    def find_courses_by_bsct(
        self,
        board_id: str,
        subject_id: Optional[str] = None,
        chapter_id: Optional[str] = None,
        embeddings_ready_only: bool = True,
    ) -> list[CourseData]:
        """
        Find courses matching B/S/C/T curriculum criteria.

        Args:
            board_id: Required board ID to match
            subject_id: Optional subject ID filter
            chapter_id: Optional chapter ID filter
            embeddings_ready_only: Only return courses with embeddings ready (default True)

        Returns:
            List of matching CourseData objects
        """
        logger.info(
            f"[{self.user_email}] Finding courses by BSCT: "
            f"board={board_id}, subject={subject_id}, chapter={chapter_id}"
        )

        matching_courses = []

        try:
            course_ids = s3_utils.list_user_course_ids(self.user_email)

            for course_id in course_ids:
                try:
                    response = self.get_course(course_id)
                    if not response.course:
                        continue

                    course = response.course

                    # Board is required match
                    if course.board_id != board_id:
                        continue

                    # Subject filter (if provided)
                    if subject_id and course.subject_id != subject_id:
                        continue

                    # Chapter filter (if provided)
                    if chapter_id and course.chapter_id != chapter_id:
                        continue

                    # Embeddings status check
                    if embeddings_ready_only:
                        status = self.get_embeddings_status(course_id)
                        if status.get("status") not in ("ready", "unknown"):
                            continue

                    matching_courses.append(course)

                except NotFoundError:
                    continue
                except Exception as e:
                    logger.warning(f"Error checking course {course_id}: {e}")
                    continue

            # Sort by last_updated_at descending
            matching_courses.sort(key=lambda x: x.last_updated_at, reverse=True)

            logger.info(f"Found {len(matching_courses)} matching courses")
            return matching_courses

        except Exception as e:
            logger.error(f"Error finding courses by BSCT: {e}")
            return []
