"""
Course Events Module - Phase 2

Provides event-driven architecture for course lifecycle management.
"""

from .course_events import CourseEventType, CourseEvent
from .event_bus import EventBus, get_event_bus

__all__ = [
    "CourseEventType",
    "CourseEvent",
    "EventBus",
    "get_event_bus",
]
