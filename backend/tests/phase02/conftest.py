"""
Phase 2 Test Fixtures

Provides fixtures for testing course lifecycle events, embeddings, and plan generation.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime
from uuid import uuid4

from events import EventBus, CourseEvent, CourseEventType


@pytest.fixture
def event_bus():
    """Create an in-memory event bus for testing."""
    return EventBus(redis_url=None)


@pytest.fixture
def sample_course_event():
    """Create a sample course event."""
    return CourseEvent(
        event_type=CourseEventType.FILE_UPLOADED,
        course_id="test-course-123",
        user_email="test@example.com",
        data={"filename": "test.pdf"},
    )


@pytest.fixture
def mock_course_service():
    """Create a mock course service."""
    with patch("services.course_service.CourseService") as mock:
        instance = MagicMock()
        mock.return_value = instance
        yield instance


@pytest.fixture
def sample_course_info():
    """Sample course info dict."""
    return {
        "id": "test-course-123",
        "title": "Test Course",
        "description": "A test course",
        "author": "test@example.com",
        "create_course_process": {"is_creation_complete": True, "current_step": 6},
        "uploadedFiles": [{"filename": "test.pdf", "size": 1024}],
        "embeddings_status": "ready",
        "embeddings_built_at": datetime.utcnow().isoformat(),
        "plan_status": "ready",
        "plan_version": 1,
        "plan_generated_at": datetime.utcnow().isoformat(),
    }


@pytest.fixture
def sample_course_plan():
    """Sample course plan dict."""
    return {
        "id": str(uuid4()),
        "course_id": "test-course-123",
        "version": 1,
        "metadata": {
            "title": "Test Course",
            "description": "A test course",
            "board": "CBSE",
            "subject": "Science",
            "chapter": "Chapter 1",
            "difficulty_level": "intermediate",
        },
        "sections": [
            {
                "id": str(uuid4()),
                "title": "Section 1",
                "description": "First section",
                "learning_objectives": ["Objective 1"],
                "estimated_minutes": 15,
                "order": 0,
                "subtopics": [
                    {
                        "id": str(uuid4()),
                        "title": "Subtopic 1",
                        "description": "First subtopic",
                        "key_points": ["Point 1"],
                        "estimated_minutes": 5,
                        "order": 0,
                    }
                ],
            }
        ],
        "source_files": [],
        "generator": "brave_llm",
        "generated_at": datetime.utcnow().isoformat(),
        "total_estimated_minutes": 15,
    }
