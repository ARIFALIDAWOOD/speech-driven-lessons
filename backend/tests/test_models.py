"""
Tests for the centralized models module.
"""

from models import (  # Enums; Exceptions; Course DTOs; Outline DTOs
    CourseData,
    CreateCourseRequest,
    LLMConfig,
    LLMMessage,
    MessageRole,
    NotFoundError,
    OutlineSection,
    SearchResponse,
    SearchResult,
    ServiceError,
    SessionContext,
    SessionError,
    SessionInfo,
    SessionNotFoundError,
    StudentLevel,
    SubTopic,
    TutorEvent,
    TutorState,
)


class TestEnums:
    """Test enum definitions."""

    def test_tutor_state_values(self):
        assert TutorState.IDLE.value == "idle"
        assert TutorState.LESSON_COMPLETE.value == "lesson_complete"

    def test_student_level_values(self):
        assert StudentLevel.BEGINNER.value == "beginner"
        assert StudentLevel.ADVANCED.value == "advanced"

    def test_message_role_values(self):
        assert MessageRole.USER.value == "user"
        assert MessageRole.ASSISTANT.value == "assistant"


class TestExceptions:
    """Test exception classes."""

    def test_service_error(self):
        err = ServiceError("test error", {"key": "value"})
        assert err.message == "test error"
        assert err.details == {"key": "value"}

    def test_not_found_error(self):
        err = NotFoundError("Course", "123")
        assert err.resource_type == "Course"
        assert err.resource_id == "123"
        assert "123" in str(err)

    def test_session_not_found_error(self):
        err = SessionNotFoundError("sess-123")
        assert err.session_id == "sess-123"
        assert isinstance(err, SessionError)


class TestCourseDTOs:
    """Test course-related DTOs."""

    def test_create_course_request(self):
        req = CreateCourseRequest(course_title="Test Course")
        assert req.course_title == "Test Course"
        assert req.ai_voice == "alloy"

    def test_course_data_to_dict(self):
        course = CourseData(
            id="123",
            title="Test",
            description="A test course",
            author="me",
            created_at="2024-01-01",
            last_updated_at="2024-01-02",
        )
        d = course.to_dict()
        assert d["id"] == "123"
        assert d["title"] == "Test"
        assert "uploadedFiles" in d

    def test_course_data_from_dict(self):
        data = {
            "id": "123",
            "title": "Test",
            "description": "A test",
            "author": "me",
            "created_at": "2024-01-01",
            "last_updated_at": "2024-01-02",
            "uploadedFiles": [{"name": "file.pdf", "size": 1000}],
        }
        course = CourseData.from_dict(data)
        assert course.id == "123"
        assert len(course.uploaded_files) == 1
        assert course.uploaded_files[0].name == "file.pdf"


class TestSessionDTOs:
    """Test session-related DTOs."""

    def test_session_info_to_dict(self):
        info = SessionInfo(
            session_id="sess-1",
            user_id="user-1",
            board="CBSE",
            subject="Math",
            chapter="Algebra",
        )
        d = info.to_dict()
        assert d["session_id"] == "sess-1"
        assert d["state"] == "idle"

    def test_session_context_advance_topic(self):
        ctx = SessionContext(
            session_id="sess-1",
            user_id="user-1",
            board="CBSE",
            subject="Math",
            chapter="Algebra",
        )
        ctx.outline = {
            "sections": [
                {"title": "Section 1", "subtopics": [{"title": "A"}, {"title": "B"}]},
                {"title": "Section 2", "subtopics": [{"title": "C"}]},
            ]
        }

        # Initially at 0,0
        assert ctx.current_section_index == 0
        assert ctx.current_subtopic_index == 0

        # Advance within section
        result = ctx.advance_to_next_topic()
        assert result is True
        assert ctx.current_subtopic_index == 1

        # Advance to next section
        result = ctx.advance_to_next_topic()
        assert result is True
        assert ctx.current_section_index == 1
        assert ctx.current_subtopic_index == 0

        # No more topics
        result = ctx.advance_to_next_topic()
        assert result is False


class TestLLMDTOs:
    """Test LLM-related DTOs."""

    def test_llm_message_to_dict(self):
        msg = LLMMessage(role=MessageRole.USER, content="Hello")
        d = msg.to_dict()
        assert d["role"] == "user"
        assert d["content"] == "Hello"

    def test_llm_config_to_dict(self):
        cfg = LLMConfig(temperature=0.5, max_tokens=100)
        d = cfg.to_dict()
        assert d["temperature"] == 0.5
        assert d["max_tokens"] == 100


class TestSearchDTOs:
    """Test search-related DTOs."""

    def test_search_result_to_dict(self):
        result = SearchResult(
            title="Test",
            url="https://example.com",
            description="A test",
            snippet="Test snippet",
            source="Example",
        )
        d = result.to_dict()
        assert d["title"] == "Test"
        assert d["url"] == "https://example.com"

    def test_search_response_combined_context(self):
        results = [
            SearchResult(
                title=f"Result {i}",
                url=f"https://example.com/{i}",
                description=f"Desc {i}",
                snippet=f"Snippet {i}",
                source="Example",
            )
            for i in range(3)
        ]
        response = SearchResponse(query="test", results=results, total_results=3, took_ms=100)
        context = response.get_combined_context(max_results=2)
        assert "Result 0" in context
        assert "Result 1" in context
        assert "Result 2" not in context


class TestOutlineDTOs:
    """Test outline-related DTOs."""

    def test_outline_section_to_dict(self):
        section = OutlineSection(
            title="Test Section",
            learning_objectives=["Learn X"],
            subtopics=[SubTopic(title="Subtopic 1", description="Desc", key_points=["Point 1"])],
        )
        d = section.to_dict()
        assert d["title"] == "Test Section"
        assert len(d["subtopics"]) == 1


class TestAgentDTOs:
    """Test agent-related DTOs."""

    def test_tutor_event_to_dict(self):
        event = TutorEvent(
            event_type="test_event",
            content="Hello",
            state=TutorState.IDLE,
        )
        d = event.to_dict()
        assert d["event"] == "test_event"
        assert d["content"] == "Hello"
        assert d["state"] == "idle"

    def test_tutor_event_to_json(self):
        event = TutorEvent(event_type="test", content="test")
        json_str = event.to_json()
        assert '"event": "test"' in json_str


class TestBackwardCompatibility:
    """Test that backward compatibility imports work."""

    def test_import_from_services(self):
        from services import CourseData, NotFoundError, SessionInfo

        assert CourseData is not None
        assert NotFoundError is not None
        assert SessionInfo is not None

    def test_import_from_agent(self):
        from agent import SessionContext, StudentLevel, TutorState

        assert TutorState is not None
        assert SessionContext is not None
        assert StudentLevel is not None

    def test_import_from_llm(self):
        from llm import LLMConfig, LLMMessage, MessageRole

        assert LLMMessage is not None
        assert MessageRole is not None
        assert LLMConfig is not None
