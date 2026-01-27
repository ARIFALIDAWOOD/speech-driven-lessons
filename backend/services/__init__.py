"""
Backend services for the Agent-Driven Teaching System.
"""

from .brave_search import BraveSearchClient, SearchResult
from .outline_generator import OutlineGenerator, CourseOutline, OutlineSection
from .materials_context import (
    MaterialsContextManager,
    get_materials_manager,
    clear_session_materials,
)

# Service layer
from .course_service import CourseService
from .tutor_session_service import TutorSessionService

# DTOs
from .dtos import (
    CreateCourseRequest,
    UpdateStepRequest,
    UploadFileRequest,
    UploadFileMetadataRequest,
    DeleteFileRequest,
    CourseData,
    CourseResponse,
    SyllabusResponse,
    SlidesResponse,
    CreateSessionRequest,
    SessionInfo,
    SessionResponse,
    SessionStatusResponse,
    ProcessResponseRequest,
)

# Exceptions
from .exceptions import (
    ServiceError,
    NotFoundError,
    ValidationError,
    AuthorizationError,
    StorageError,
    ProcessingError,
    SessionError,
    SessionNotFoundError,
)

__all__ = [
    # Search & Outline
    "BraveSearchClient",
    "SearchResult",
    "OutlineGenerator",
    "CourseOutline",
    "OutlineSection",
    # Materials
    "MaterialsContextManager",
    "get_materials_manager",
    "clear_session_materials",
    # Services
    "CourseService",
    "TutorSessionService",
    # Course DTOs
    "CreateCourseRequest",
    "UpdateStepRequest",
    "UploadFileRequest",
    "UploadFileMetadataRequest",
    "DeleteFileRequest",
    "CourseData",
    "CourseResponse",
    "SyllabusResponse",
    "SlidesResponse",
    # Session DTOs
    "CreateSessionRequest",
    "SessionInfo",
    "SessionResponse",
    "SessionStatusResponse",
    "ProcessResponseRequest",
    # Exceptions
    "ServiceError",
    "NotFoundError",
    "ValidationError",
    "AuthorizationError",
    "StorageError",
    "ProcessingError",
    "SessionError",
    "SessionNotFoundError",
]
