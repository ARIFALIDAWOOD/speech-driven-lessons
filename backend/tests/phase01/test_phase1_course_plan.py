"""
P1-2: CoursePlan valid/invalid.

Unit tests for CoursePlan Pydantic validation.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from schemas import (
    CoursePlan,
    Section,
    SubTopic,
    CoursePlanMetadata,
    DifficultyLevel,
    GeneratorType,
)


@pytest.mark.unit
def test_course_plan_valid_minimal():
    """Valid CoursePlan with required fields only."""
    plan = CoursePlan(course_id="c1", sections=[])
    assert plan.course_id == "c1"
    assert plan.sections == []
    assert plan.version == 1
    assert plan.generator == GeneratorType.BRAVE_LLM


@pytest.mark.unit
def test_course_plan_valid_with_sections():
    """Valid CoursePlan with sections and subtopics."""
    st = SubTopic(title="Intro", description="Overview", key_points=["A", "B"])
    sec = Section(title="Ch1", description="First", subtopics=[st])
    plan = CoursePlan(course_id="c2", sections=[sec])
    assert len(plan.sections) == 1
    assert plan.sections[0].title == "Ch1"
    assert len(plan.sections[0].subtopics) == 1
    assert plan.sections[0].subtopics[0].title == "Intro"


@pytest.mark.unit
def test_course_plan_calculate_total_time():
    """calculate_total_time sums section and subtopic minutes."""
    st1 = SubTopic(title="T1", estimated_minutes=10)
    st2 = SubTopic(title="T2", estimated_minutes=5)
    sec = Section(title="S1", estimated_minutes=3, subtopics=[st1, st2])
    plan = CoursePlan(course_id="c3", sections=[sec])
    assert plan.calculate_total_time() == 18


@pytest.mark.unit
def test_course_plan_get_all_topics():
    """get_all_topics returns flat list of topics."""
    st1 = SubTopic(title="T1")
    st2 = SubTopic(title="T2")
    sec = Section(title="S1", learning_objectives=["L1"], subtopics=[st1, st2])
    plan = CoursePlan(course_id="c4", sections=[sec])
    topics = plan.get_all_topics()
    assert len(topics) == 2
    assert topics[0]["title"] == "T1"
    assert topics[1]["title"] == "T2"
    assert topics[0]["section_title"] == "S1"


@pytest.mark.unit
def test_course_plan_invalid_missing_course_id():
    """Missing course_id raises ValidationError."""
    with pytest.raises(ValidationError):
        CoursePlan(sections=[])  # type: ignore


@pytest.mark.unit
def test_course_plan_invalid_wrong_type():
    """Invalid types raise ValidationError."""
    with pytest.raises(ValidationError):
        CoursePlan(course_id=123, sections=[])  # type: ignore
    with pytest.raises(ValidationError):
        CoursePlan(course_id="c5", sections="not-a-list")  # type: ignore
