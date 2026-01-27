"""
Phase 2 Tests: Event System

Tests for course lifecycle events and event bus.
"""

import pytest
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime

from events import EventBus, CourseEvent, CourseEventType


class TestCourseEvent:
    """Tests for CourseEvent dataclass."""

    @pytest.mark.unit
    def test_event_creation(self):
        """Test creating a course event."""
        event = CourseEvent(
            event_type=CourseEventType.FILE_UPLOADED,
            course_id="course-123",
            user_email="test@example.com",
            data={"filename": "test.pdf"},
        )

        assert event.event_type == CourseEventType.FILE_UPLOADED
        assert event.course_id == "course-123"
        assert event.user_email == "test@example.com"
        assert event.data["filename"] == "test.pdf"
        assert isinstance(event.timestamp, datetime)

    @pytest.mark.unit
    def test_event_to_dict(self):
        """Test event serialization to dict."""
        event = CourseEvent(
            event_type=CourseEventType.EMBEDDINGS_BUILD_COMPLETED,
            course_id="course-456",
            user_email="user@example.com",
            correlation_id="corr-123",
        )

        event_dict = event.to_dict()

        assert event_dict["event_type"] == "course.embeddings.build_completed"
        assert event_dict["course_id"] == "course-456"
        assert event_dict["user_email"] == "user@example.com"
        assert event_dict["correlation_id"] == "corr-123"
        assert "timestamp" in event_dict

    @pytest.mark.unit
    def test_event_from_dict(self):
        """Test event deserialization from dict."""
        event_dict = {
            "event_type": "course.file.uploaded",
            "course_id": "course-789",
            "user_email": "admin@example.com",
            "timestamp": "2024-01-01T12:00:00",
            "data": {"size": 1024},
        }

        event = CourseEvent.from_dict(event_dict)

        assert event.event_type == CourseEventType.FILE_UPLOADED
        assert event.course_id == "course-789"
        assert event.data["size"] == 1024


class TestEventBus:
    """Tests for EventBus."""

    @pytest.mark.unit
    def test_subscribe_and_emit(self, event_bus):
        """Test subscribing to events and receiving them."""
        received_events = []

        def handler(event):
            received_events.append(event)

        event_bus.subscribe(
            event_types=[CourseEventType.FILE_UPLOADED],
            handler=handler,
        )

        event = CourseEvent(
            event_type=CourseEventType.FILE_UPLOADED,
            course_id="test-course",
            user_email="test@example.com",
        )

        event_bus.emit(event)

        assert len(received_events) == 1
        assert received_events[0].course_id == "test-course"

    @pytest.mark.unit
    def test_subscribe_multiple_events(self, event_bus):
        """Test subscribing to multiple event types."""
        received_events = []

        def handler(event):
            received_events.append(event)

        event_bus.subscribe(
            event_types=[
                CourseEventType.FILE_UPLOADED,
                CourseEventType.FILE_DELETED,
            ],
            handler=handler,
        )

        event_bus.emit(
            CourseEvent(
                event_type=CourseEventType.FILE_UPLOADED,
                course_id="course-1",
                user_email="user@example.com",
            )
        )

        event_bus.emit(
            CourseEvent(
                event_type=CourseEventType.FILE_DELETED,
                course_id="course-2",
                user_email="user@example.com",
            )
        )

        assert len(received_events) == 2

    @pytest.mark.unit
    def test_course_id_filter(self, event_bus):
        """Test filtering events by course_id."""
        received_events = []

        def handler(event):
            received_events.append(event)

        event_bus.subscribe(
            event_types=[CourseEventType.FILE_UPLOADED],
            handler=handler,
            course_id="specific-course",
        )

        # This should be received
        event_bus.emit(
            CourseEvent(
                event_type=CourseEventType.FILE_UPLOADED,
                course_id="specific-course",
                user_email="user@example.com",
            )
        )

        # This should NOT be received
        event_bus.emit(
            CourseEvent(
                event_type=CourseEventType.FILE_UPLOADED,
                course_id="other-course",
                user_email="user@example.com",
            )
        )

        assert len(received_events) == 1
        assert received_events[0].course_id == "specific-course"

    @pytest.mark.unit
    def test_unsubscribe(self, event_bus):
        """Test unsubscribing from events."""
        received_events = []

        def handler(event):
            received_events.append(event)

        subscription = event_bus.subscribe(
            event_types=[CourseEventType.FILE_UPLOADED],
            handler=handler,
        )

        # First event should be received
        event_bus.emit(
            CourseEvent(
                event_type=CourseEventType.FILE_UPLOADED,
                course_id="course-1",
                user_email="user@example.com",
            )
        )

        event_bus.unsubscribe(subscription)

        # Second event should NOT be received
        event_bus.emit(
            CourseEvent(
                event_type=CourseEventType.FILE_UPLOADED,
                course_id="course-2",
                user_email="user@example.com",
            )
        )

        assert len(received_events) == 1

    @pytest.mark.unit
    def test_event_types_defined(self):
        """Test all expected event types are defined."""
        expected_types = [
            "COURSE_CREATED",
            "FILE_UPLOADED",
            "FILE_DELETED",
            "OUTLINE_GENERATION_STARTED",
            "OUTLINE_GENERATION_COMPLETED",
            "EMBEDDINGS_BUILD_STARTED",
            "EMBEDDINGS_BUILD_COMPLETED",
            "EMBEDDINGS_INVALIDATED",
        ]

        for type_name in expected_types:
            assert hasattr(CourseEventType, type_name)
