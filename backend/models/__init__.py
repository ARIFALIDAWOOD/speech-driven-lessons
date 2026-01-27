"""
Centralized data models for the application.

This module provides a single import point for all data models used across
the system. All models are dataclasses with serialization support.

Example usage:
    from models import CourseData, SessionContext, TutorState
    from models import NotFoundError, ValidationError
"""

# Enums
from .enums import (
    TutorState,
    StudentLevel,
    AssessmentDifficulty,
    MessageRole,
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

# Course DTOs
from .course import (
    CreateCourseRequest,
    UpdateStepRequest,
    UploadFileRequest,
    UploadFileMetadataRequest,
    DeleteFileRequest,
    FileInfo,
    CreateCourseProcess,
    CourseProgress,
    CourseData,
    CourseResponse,
    SyllabusSection,
    SyllabusResponse,
    SlideData,
    SlidesResponse,
)

# Session DTOs
from .session import (
    CreateSessionRequest,
    SessionInfo,
    SessionResponse,
    SessionStatusResponse,
    ProcessResponseRequest,
    TopicProgress,
    SessionContext,
)

# LLM DTOs
from .llm import (
    LLMMessage,
    LLMResponse,
    StreamChunk,
    LLMConfig,
)

# Search DTOs
from .search import (
    SearchResult,
    SearchResponse,
)

# Outline DTOs
from .outline import (
    SubTopic,
    OutlineSection,
    CourseOutline,
)

# Assessment DTOs
from .assessment import (
    AssessmentQuestion,
    AssessmentResponse,
)

# Agent DTOs
from .agent import (
    StateTransition,
    TutorEvent,
)


__all__ = [
    # Enums
    "TutorState",
    "StudentLevel",
    "AssessmentDifficulty",
    "MessageRole",
    # Exceptions
    "ServiceError",
    "NotFoundError",
    "ValidationError",
    "AuthorizationError",
    "StorageError",
    "ProcessingError",
    "SessionError",
    "SessionNotFoundError",
    # Course DTOs
    "CreateCourseRequest",
    "UpdateStepRequest",
    "UploadFileRequest",
    "UploadFileMetadataRequest",
    "DeleteFileRequest",
    "FileInfo",
    "CreateCourseProcess",
    "CourseProgress",
    "CourseData",
    "CourseResponse",
    "SyllabusSection",
    "SyllabusResponse",
    "SlideData",
    "SlidesResponse",
    # Session DTOs
    "CreateSessionRequest",
    "SessionInfo",
    "SessionResponse",
    "SessionStatusResponse",
    "ProcessResponseRequest",
    "TopicProgress",
    "SessionContext",
    # LLM DTOs
    "LLMMessage",
    "LLMResponse",
    "StreamChunk",
    "LLMConfig",
    # Search DTOs
    "SearchResult",
    "SearchResponse",
    # Outline DTOs
    "SubTopic",
    "OutlineSection",
    "CourseOutline",
    # Assessment DTOs
    "AssessmentQuestion",
    "AssessmentResponse",
    # Agent DTOs
    "StateTransition",
    "TutorEvent",
]
