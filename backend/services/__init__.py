"""
Backend services for the Agent-Driven Teaching System.
"""

from .brave_search import BraveSearchClient
from .outline_generator import OutlineGenerator
from .materials_context import (
    MaterialsContextManager,
    get_materials_manager,
    clear_session_materials,
)

# Service layer
from .course_service import CourseService
from .tutor_session_service import TutorSessionService

# Re-export DTOs from models for backward compatibility
from models import (
    # Course DTOs
    CreateCourseRequest,
    UpdateStepRequest,
    UploadFileRequest,
    UploadFileMetadataRequest,
    DeleteFileRequest,
    CourseData,
    CourseResponse,
    SyllabusResponse,
    SlidesResponse,
    # Session DTOs
    CreateSessionRequest,
    SessionInfo,
    SessionResponse,
    SessionStatusResponse,
    ProcessResponseRequest,
    # Search & Outline DTOs
    SearchResult,
    SearchResponse,
    CourseOutline,
    OutlineSection,
    SubTopic,
    # Exceptions
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
    "SearchResponse",
    "OutlineGenerator",
    "CourseOutline",
    "OutlineSection",
    "SubTopic",
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
