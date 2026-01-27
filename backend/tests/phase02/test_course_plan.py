"""
Phase 2 Tests: Course Plan and PlanGenerator

Tests for course plan schema and plan generation service.
"""

import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from schemas.course_plan import (
    CoursePlan,
    CoursePlanMetadata,
    Section,
    SubTopic,
    DifficultyLevel,
    GeneratorType,
)


class TestCoursePlanSchema:
    """Tests for CoursePlan Pydantic model."""

    @pytest.mark.unit
    def test_create_minimal_plan(self):
        """Test creating a minimal valid course plan."""
        plan = CoursePlan(
            course_id="test-course",
            sections=[],
        )

        assert plan.course_id == "test-course"
        assert plan.version == 1
        assert plan.sections == []
        assert plan.generator == GeneratorType.BRAVE_LLM

    @pytest.mark.unit
    def test_create_full_plan(self, sample_course_plan):
        """Test creating a full course plan."""
        plan = CoursePlan.model_validate(sample_course_plan)

        assert plan.course_id == "test-course-123"
        assert len(plan.sections) == 1
        assert plan.sections[0].title == "Section 1"
        assert len(plan.sections[0].subtopics) == 1

    @pytest.mark.unit
    def test_calculate_total_time(self):
        """Test calculating total time for a course plan."""
        subtopic1 = SubTopic(title="ST1", estimated_minutes=10)
        subtopic2 = SubTopic(title="ST2", estimated_minutes=15)
        section = Section(
            title="Section 1",
            estimated_minutes=5,
            subtopics=[subtopic1, subtopic2],
        )

        plan = CoursePlan(
            course_id="test",
            sections=[section],
        )

        total = plan.calculate_total_time()
        # Section time (5) + subtopic times (10 + 15) = 30
        assert total == 30

    @pytest.mark.unit
    def test_get_all_topics(self):
        """Test getting all topics from a plan."""
        subtopic1 = SubTopic(title="Topic A", description="First topic")
        subtopic2 = SubTopic(title="Topic B", description="Second topic")
        section = Section(
            title="Section 1",
            subtopics=[subtopic1, subtopic2],
        )

        plan = CoursePlan(
            course_id="test",
            sections=[section],
        )

        topics = plan.get_all_topics()
        assert len(topics) == 2
        assert topics[0]["title"] == "Topic A"
        assert topics[1]["title"] == "Topic B"

    @pytest.mark.unit
    def test_plan_serialization(self):
        """Test plan can be serialized to JSON."""
        plan = CoursePlan(
            course_id="test",
            metadata=CoursePlanMetadata(
                title="Test Course",
                difficulty_level=DifficultyLevel.BEGINNER,
            ),
            sections=[
                Section(
                    title="Section 1",
                    subtopics=[SubTopic(title="Topic 1")],
                )
            ],
        )

        json_str = plan.model_dump_json()
        assert "test" in json_str
        assert "Section 1" in json_str

    @pytest.mark.unit
    def test_plan_deserialization(self):
        """Test plan can be deserialized from dict."""
        data = {
            "course_id": "test-123",
            "version": 2,
            "metadata": {
                "title": "My Course",
                "difficulty_level": "advanced",
            },
            "sections": [],
            "generator": "gemini_pdf",
        }

        plan = CoursePlan.model_validate(data)
        assert plan.course_id == "test-123"
        assert plan.version == 2
        assert plan.metadata.difficulty_level == DifficultyLevel.ADVANCED
        assert plan.generator == GeneratorType.GEMINI_PDF

    @pytest.mark.unit
    def test_section_with_learning_objectives(self):
        """Test section with learning objectives."""
        section = Section(
            title="Introduction",
            learning_objectives=[
                "Understand basic concepts",
                "Apply knowledge to examples",
            ],
            subtopics=[SubTopic(title="Basics")],
        )

        assert len(section.learning_objectives) == 2
        assert "Understand" in section.learning_objectives[0]

    @pytest.mark.unit
    def test_subtopic_with_key_points(self):
        """Test subtopic with key points."""
        subtopic = SubTopic(
            title="Variables",
            description="Learn about variables",
            key_points=[
                "Variables store data",
                "Different types exist",
                "Naming conventions matter",
            ],
            estimated_minutes=10,
        )

        assert len(subtopic.key_points) == 3
        assert subtopic.estimated_minutes == 10


class TestPlanGenerator:
    """Tests for PlanGenerator service."""

    @pytest.mark.unit
    def test_generator_type_enum(self):
        """Test generator types are defined."""
        assert GeneratorType.GEMINI_PDF.value == "gemini_pdf"
        assert GeneratorType.BRAVE_LLM.value == "brave_llm"
        assert GeneratorType.MANUAL.value == "manual"

    @pytest.mark.unit
    def test_difficulty_level_enum(self):
        """Test difficulty levels are defined."""
        assert DifficultyLevel.BEGINNER.value == "beginner"
        assert DifficultyLevel.INTERMEDIATE.value == "intermediate"
        assert DifficultyLevel.ADVANCED.value == "advanced"
