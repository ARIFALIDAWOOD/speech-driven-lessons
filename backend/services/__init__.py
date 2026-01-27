"""
Backend services for the Agent-Driven Teaching System.
"""

# Re-export DTOs from models for backward compatibility
from models import (  # Course DTOs; Session DTOs; Search & Outline DTOs; Exceptions
    AuthorizationError,
    CourseData,
    CourseOutline,
    CourseResponse,
    CreateCourseRequest,
    CreateSessionRequest,
    DeleteFileRequest,
    NotFoundError,
    OutlineSection,
    ProcessingError,
    ProcessResponseRequest,
    SearchResponse,
    SearchResult,
    ServiceError,
    SessionError,
    SessionInfo,
    SessionNotFoundError,
    SessionResponse,
    SessionStatusResponse,
    SlidesResponse,
    StorageError,
    SubTopic,
    SyllabusResponse,
    UpdateStepRequest,
    UploadFileMetadataRequest,
    UploadFileRequest,
    ValidationError,
)

from .brave_search import BraveSearchClient

# Service layer
from .course_service import CourseService
from .materials_context import (
    MaterialsContextManager,
    clear_session_materials,
    get_materials_manager,
)
from .outline_generator import OutlineGenerator
from .tutor_session_service import TutorSessionService

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
