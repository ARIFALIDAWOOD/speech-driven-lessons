"""
Course Lifecycle Events - Phase 2

Defines event types and data structures for course lifecycle management.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional


class CourseEventType(str, Enum):
    """Types of course lifecycle events."""

    # Course management
    COURSE_CREATED = "course.created"
    COURSE_UPDATED = "course.updated"
    COURSE_DELETED = "course.deleted"

    # File operations
    FILE_UPLOADED = "course.file.uploaded"
    FILE_DELETED = "course.file.deleted"
    FILES_CHANGED = "course.files.changed"

    # Outline/Plan generation
    OUTLINE_GENERATION_STARTED = "course.outline.generation_started"
    OUTLINE_GENERATION_COMPLETED = "course.outline.generation_completed"
    OUTLINE_GENERATION_FAILED = "course.outline.generation_failed"

    # Embeddings lifecycle
    EMBEDDINGS_BUILD_STARTED = "course.embeddings.build_started"
    EMBEDDINGS_BUILD_COMPLETED = "course.embeddings.build_completed"
    EMBEDDINGS_BUILD_FAILED = "course.embeddings.build_failed"
    EMBEDDINGS_INVALIDATED = "course.embeddings.invalidated"

    # Session events
    SESSION_STARTED = "course.session.started"
    SESSION_ENDED = "course.session.ended"


@dataclass
class CourseEvent:
    """
    Represents a course lifecycle event.

    Events are used to coordinate between different parts of the system,
    such as triggering embedding rebuilds when files change.
    """

    event_type: CourseEventType
    course_id: str
    user_email: str
    timestamp: datetime = field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = field(default_factory=dict)
    correlation_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization."""
        return {
            "event_type": self.event_type.value,
            "course_id": self.course_id,
            "user_email": self.user_email,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
            "correlation_id": self.correlation_id,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CourseEvent":
        """Create event from dictionary."""
        return cls(
            event_type=CourseEventType(data["event_type"]),
            course_id=data["course_id"],
            user_email=data["user_email"],
            timestamp=datetime.fromisoformat(data["timestamp"]),
            data=data.get("data", {}),
            correlation_id=data.get("correlation_id"),
        )
