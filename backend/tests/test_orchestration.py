"""
Tests for Orchestration Module - Phase 1

Tests the acceptance criteria for Phase 1 orchestration implementation.
"""

import pytest
from datetime import datetime
from uuid import uuid4

# Import orchestration components
from orchestration import (
    OrchestratorState,
    AgentType,
    SessionPhase,
    ProgressHealth,
    create_initial_state,
    create_orchestration_graph,
    OrchestrationConfig,
    get_config,
)
from schemas import CoursePlan, Section, SubTopic, CoursePlanMetadata, DifficultyLevel


class TestOrchestratorState:
    """P1-1: OrchestratorState TypedDict tests."""

    def test_create_initial_state(self):
        """Test that initial state can be created with all required fields."""
        state = create_initial_state(
            session_id="test-session-123",
            user_id="user@example.com",
        )

        assert state["session_id"] == "test-session-123"
        assert state["user_id"] == "user@example.com"
        assert state["active_agent"] == AgentType.ORCHESTRATOR
        assert state["current_phase"] == SessionPhase.INITIALIZATION
        assert state["progress_health"] == ProgressHealth.GOOD
        assert state["health_score"] == 1.0
        assert state["consecutive_struggles"] == 0
        assert state["knowledge_gaps"] == []
        assert state["messages"] == []

    def test_state_with_course_outline(self):
        """Test state creation with course outline."""
        outline = {
            "metadata": {"title": "Test Course"},
            "sections": [],
        }

        state = create_initial_state(
            session_id="test-session-456",
            user_id="user@example.com",
            course_id="course-123",
            course_outline=outline,
        )

        assert state["course_id"] == "course-123"
        assert state["course_outline"] == outline

    def test_state_serialization(self):
        """Test that state can be serialized to dict."""
        state = create_initial_state(
            session_id="test-session-789",
            user_id="user@example.com",
        )

        # State is already a TypedDict, verify it's dict-like
        assert isinstance(state, dict)
        assert "session_id" in state
        assert "active_agent" in state


class TestCoursePlanSchema:
    """P1-2: CoursePlan Pydantic model tests."""

    def test_create_valid_course_plan(self):
        """Test creating a valid course plan."""
        subtopic = SubTopic(
            title="Introduction to Variables",
            description="Learn about variables",
            key_points=["What is a variable", "Types of variables"],
            estimated_minutes=10,
        )

        section = Section(
            title="Variables and Data Types",
            description="Understanding data storage",
            learning_objectives=["Define variables", "Use different data types"],
            estimated_minutes=30,
            subtopics=[subtopic],
        )

        metadata = CoursePlanMetadata(
            title="Introduction to Programming",
            description="A beginner's guide",
            subject="Computer Science",
            difficulty_level=DifficultyLevel.BEGINNER,
        )

        plan = CoursePlan(
            course_id="course-123",
            metadata=metadata,
            sections=[section],
        )

        assert plan.course_id == "course-123"
        assert plan.metadata.title == "Introduction to Programming"
        assert len(plan.sections) == 1
        assert plan.sections[0].title == "Variables and Data Types"
        assert len(plan.sections[0].subtopics) == 1

    def test_course_plan_calculate_time(self):
        """Test time calculation for course plan."""
        subtopic1 = SubTopic(title="Topic 1", estimated_minutes=10)
        subtopic2 = SubTopic(title="Topic 2", estimated_minutes=15)

        section = Section(
            title="Section 1",
            estimated_minutes=5,  # Section intro time
            subtopics=[subtopic1, subtopic2],
        )

        plan = CoursePlan(
            course_id="course-456",
            sections=[section],
        )

        total = plan.calculate_total_time()
        assert total == 30  # 5 + 10 + 15

    def test_course_plan_get_all_topics(self):
        """Test getting flat list of all topics."""
        subtopic1 = SubTopic(title="Topic 1")
        subtopic2 = SubTopic(title="Topic 2")

        section = Section(
            title="Section 1",
            learning_objectives=["Learn topic 1", "Learn topic 2"],
            subtopics=[subtopic1, subtopic2],
        )

        plan = CoursePlan(
            course_id="course-789",
            sections=[section],
        )

        topics = plan.get_all_topics()
        assert len(topics) == 2
        assert topics[0]["title"] == "Topic 1"
        assert topics[1]["title"] == "Topic 2"

    def test_invalid_course_plan(self):
        """Test that invalid course plan raises error."""
        with pytest.raises(Exception):
            # course_id is required
            CoursePlan(sections=[])  # type: ignore


class TestOrchestrationWorkflow:
    """P1-3: LangGraph workflow tests."""

    def test_workflow_compiles(self):
        """Test that orchestration graph compiles without errors."""
        graph = create_orchestration_graph(with_checkpointer=False)

        # Graph should be compiled
        assert graph is not None

        # Graph should have expected nodes
        # Note: LangGraph internals, just verify it's callable
        assert hasattr(graph, "invoke")
        assert hasattr(graph, "ainvoke")

    def test_workflow_with_checkpointer(self):
        """Test workflow compilation with memory checkpointer."""
        graph = create_orchestration_graph(with_checkpointer=True)

        assert graph is not None
        assert hasattr(graph, "invoke")


class TestOrchestrationConfig:
    """P1-6: Configuration tests."""

    def test_config_defaults(self):
        """Test default configuration values."""
        config = OrchestrationConfig()

        assert config.health_warning_threshold == 0.45
        assert config.health_critical_threshold == 0.25
        assert config.max_consecutive_struggles == 3
        assert config.checkpoint_ttl == 86400

    def test_config_singleton(self):
        """Test that get_config returns same instance."""
        config1 = get_config()
        config2 = get_config()

        assert config1 is config2


class TestAgentEnums:
    """Test agent type and phase enums."""

    def test_agent_types(self):
        """Test all agent types are defined."""
        assert AgentType.ORCHESTRATOR.value == "orchestrator"
        assert AgentType.COURSE_CREATOR.value == "course_creator"
        assert AgentType.CURRICULUM_DESIGNER.value == "curriculum_designer"
        assert AgentType.TUTOR.value == "tutor"
        assert AgentType.ASSESSOR.value == "assessor"
        assert AgentType.PROGRESS_TRACKER.value == "progress_tracker"

    def test_session_phases(self):
        """Test all session phases are defined."""
        assert SessionPhase.INITIALIZATION.value == "initialization"
        assert SessionPhase.COURSE_CREATION.value == "course_creation"
        assert SessionPhase.CURRICULUM_DESIGN.value == "curriculum_design"
        assert SessionPhase.ACTIVE_TUTORING.value == "active_tutoring"
        assert SessionPhase.ASSESSMENT.value == "assessment"
        assert SessionPhase.REVIEW.value == "review"
        assert SessionPhase.COMPLETE.value == "complete"

    def test_progress_health(self):
        """Test all progress health levels are defined."""
        assert ProgressHealth.EXCELLENT.value == "excellent"
        assert ProgressHealth.GOOD.value == "good"
        assert ProgressHealth.MODERATE.value == "moderate"
        assert ProgressHealth.STRUGGLING.value == "struggling"
        assert ProgressHealth.CRITICAL.value == "critical"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
