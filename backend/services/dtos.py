"""
Data Transfer Objects (DTOs) for the service layer.

NOTE: This file is maintained for backward compatibility.
All models have been moved to the `models/` directory.

Import from `models` directly for new code:
    from models import CourseData, SessionInfo, ...
"""

# Re-export all course DTOs from models
from models.course import (
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
    UpdateTagsRequest,
    UploadFileMetadataRequest,
    UploadFileRequest,
)

# Re-export all session DTOs from models
from models.session import (
    CreateSessionRequest,
    ProcessResponseRequest,
    SessionInfo,
    SessionResponse,
    SessionStatusResponse,
)

__all__ = [
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
    "UpdateTagsRequest",
    # Session DTOs
    "CreateSessionRequest",
    "SessionInfo",
    "SessionResponse",
    "SessionStatusResponse",
    "ProcessResponseRequest",
]
