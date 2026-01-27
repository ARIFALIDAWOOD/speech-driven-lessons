"""
Centralized data models for the application.

This module provides a single import point for all data models used across
the system. All models are dataclasses with serialization support.

Example usage:
    from models import CourseData, SessionContext, TutorState
    from models import NotFoundError, ValidationError
"""

# Agent DTOs
from .agent import StateTransition, TutorEvent

# Assessment DTOs
from .assessment import AssessmentQuestion, AssessmentResponse

# Course DTOs
from .course import (
    CourseData,
    CourseProgress,
    CourseResponse,
    CreateCourseProcess,
    CreateCourseRequest,
    DeleteFileRequest,
    FileInfo,
    SlideData,
    SlidesResponse,
    SyllabusResponse,
    SyllabusSection,
    UpdateStepRequest,
    UploadFileMetadataRequest,
    UploadFileRequest,
)

# Enums
from .enums import AssessmentDifficulty, MessageRole, StudentLevel, TutorState

# Exceptions
from .exceptions import (
    AuthorizationError,
    NotFoundError,
    ProcessingError,
    ServiceError,
    SessionError,
    SessionNotFoundError,
    StorageError,
    ValidationError,
)

# LLM DTOs
from .llm import LLMConfig, LLMMessage, LLMResponse, StreamChunk

# Outline DTOs
from .outline import CourseOutline, OutlineSection, SubTopic

# Search DTOs
from .search import SearchResponse, SearchResult

# Session DTOs
from .session import (
    CreateSessionRequest,
    ProcessResponseRequest,
    SessionContext,
    SessionInfo,
    SessionResponse,
    SessionStatusResponse,
    TopicProgress,
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
