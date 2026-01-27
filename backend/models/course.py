"""
Course-related Data Transfer Objects.

These dataclasses define the contracts for course operations.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class CreateCourseRequest:
    """Request to create or update a course."""

    course_title: str
    course_description: str = ""
    ai_voice: str = "alloy"
    course_id: Optional[str] = None  # If provided, updates existing course
    current_step: int = 0


@dataclass
class UpdateStepRequest:
    """Request to update just the creation step."""

    course_id: str
    current_step: int


@dataclass
class UploadFileRequest:
    """Request to upload a file to a course."""

    course_id: str
    filename: str
    file_content: bytes
    content_type: str = "application/pdf"


@dataclass
class UploadFileMetadataRequest:
    """Request to add file metadata after upload."""

    course_id: str
    filename: str
    filesize: int


@dataclass
class DeleteFileRequest:
    """Request to delete a file from a course."""

    course_id: str
    filename: str


@dataclass
class FileInfo:
    """Information about an uploaded file."""

    name: str
    size: int


@dataclass
class CreateCourseProcess:
    """Course creation process state."""

    is_creation_complete: bool = False
    current_step: int = 0


@dataclass
class CourseProgress:
    """Course progress information."""

    hours: int = 0
    completion: int = 0


@dataclass
class CourseData:
    """Full course data structure."""

    id: str
    title: str
    description: str
    author: str
    created_at: str
    last_updated_at: str
    ai_voice: str = "alloy"
    is_published: bool = False
    uploaded_files: list[FileInfo] = field(default_factory=list)
    create_course_process: CreateCourseProcess = field(
        default_factory=CreateCourseProcess
    )
    progress: CourseProgress = field(default_factory=CourseProgress)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "author": self.author,
            "created_at": self.created_at,
            "last_updated_at": self.last_updated_at,
            "ai_voice": self.ai_voice,
            "is_published": self.is_published,
            "uploadedFiles": [
                {"name": f.name, "size": f.size} for f in self.uploaded_files
            ],
            "create_course_process": {
                "is_creation_complete": self.create_course_process.is_creation_complete,
                "current_step": self.create_course_process.current_step,
            },
            "progress": {
                "hours": self.progress.hours,
                "completion": self.progress.completion,
            },
        }

    @classmethod
    def from_dict(cls, data: dict) -> "CourseData":
        """Create from dictionary (e.g., from S3 JSON)."""
        uploaded_files = [
            FileInfo(name=f["name"], size=f["size"])
            for f in data.get("uploadedFiles", [])
        ]
        process_data = data.get("create_course_process", {})
        progress_data = data.get("progress", {})

        return cls(
            id=data["id"],
            title=data.get("title", ""),
            description=data.get("description", ""),
            author=data.get("author", ""),
            created_at=data.get("created_at", ""),
            last_updated_at=data.get("last_updated_at", ""),
            ai_voice=data.get("ai_voice", "alloy"),
            is_published=data.get("is_published", False),
            uploaded_files=uploaded_files,
            create_course_process=CreateCourseProcess(
                is_creation_complete=process_data.get("is_creation_complete", False),
                current_step=process_data.get("current_step", 0),
            ),
            progress=CourseProgress(
                hours=progress_data.get("hours", 0),
                completion=progress_data.get("completion", 0),
            ),
        )


@dataclass
class CourseResponse:
    """Standard response for course operations."""

    success: bool
    message: str
    course: Optional[CourseData] = None
    courses: Optional[list[CourseData]] = None
    drafts: Optional[list[CourseData]] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON response."""
        result = {
            "success": self.success,
            "message": self.message,
        }
        if self.course:
            result["course"] = self.course.to_dict()
        if self.courses is not None:
            result["courses"] = [c.to_dict() for c in self.courses]
        if self.drafts is not None:
            result["drafts"] = [c.to_dict() for c in self.drafts]
        if self.error:
            result["error"] = self.error
        return result


@dataclass
class SyllabusSection:
    """A section in the course syllabus."""

    title: str
    subtopics: list[dict] = field(default_factory=list)


@dataclass
class SyllabusResponse:
    """Response containing course syllabus."""

    success: bool
    message: str
    course_outline: Optional[list[dict]] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        result = {"success": self.success, "message": self.message}
        if self.course_outline:
            result["course_outline"] = self.course_outline
        if self.error:
            result["error"] = self.error
        return result


@dataclass
class SlideData:
    """A single slide in the course."""

    id: int
    title: str
    transcript: str
    duration: int = 60


@dataclass
class SlidesResponse:
    """Response containing course slides."""

    success: bool
    message: str
    slides: Optional[list[dict]] = None
    error: Optional[str] = None

    def to_dict(self) -> dict:
        result = {"success": self.success, "message": self.message}
        if self.slides:
            result["slides"] = self.slides
        if self.error:
            result["error"] = self.error
        return result
