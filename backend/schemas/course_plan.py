"""
Course Plan Schema - Phase 1

Canonical schema for course outlines used across all generators
(Gemini PDF, Brave+LLM, Manual).
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class DifficultyLevel(str, Enum):
    """Difficulty level of course content."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class GeneratorType(str, Enum):
    """Source of the course plan generation."""

    GEMINI_PDF = "gemini_pdf"
    BRAVE_LLM = "brave_llm"
    MANUAL = "manual"


class SubTopic(BaseModel):
    """A subtopic within a section."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    description: str = ""
    key_points: List[str] = Field(default_factory=list)
    estimated_minutes: int = 5
    order: int = 0

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "title": "Introduction to Variables",
                "description": "Learn what variables are and how to use them",
                "key_points": ["Variable declaration", "Variable types", "Naming conventions"],
                "estimated_minutes": 10,
                "order": 0,
            }
        }


class Section(BaseModel):
    """A section of the course containing subtopics."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str
    description: str = ""
    learning_objectives: List[str] = Field(default_factory=list)
    estimated_minutes: int = 15
    order: int = 0
    subtopics: List[SubTopic] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174001",
                "title": "Variables and Data Types",
                "description": "Understanding how to store and manipulate data",
                "learning_objectives": [
                    "Define and use variables",
                    "Understand different data types",
                ],
                "estimated_minutes": 30,
                "order": 0,
                "subtopics": [],
            }
        }


class CoursePlanMetadata(BaseModel):
    """Metadata about the course."""

    title: str = ""
    description: str = ""
    board: str = ""  # e.g., "CBSE", "ICSE"
    subject: str = ""  # e.g., "Mathematics", "Science"
    chapter: str = ""  # e.g., "Chapter 5: Quadratic Equations"
    difficulty_level: DifficultyLevel = DifficultyLevel.INTERMEDIATE
    target_audience: str = ""
    prerequisites: List[str] = Field(default_factory=list)


class CoursePlan(BaseModel):
    """
    Canonical course plan schema.

    This is the unified format for course outlines, regardless of how
    they were generated (PDF extraction, search-based, or manual).
    """

    id: str = Field(default_factory=lambda: str(uuid4()))
    course_id: str
    version: int = 1
    metadata: CoursePlanMetadata = Field(default_factory=CoursePlanMetadata)
    sections: List[Section] = Field(default_factory=list)
    source_files: List[str] = Field(default_factory=list)
    generator: GeneratorType = GeneratorType.BRAVE_LLM
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    total_estimated_minutes: int = 0

    def calculate_total_time(self) -> int:
        """Calculate total estimated time from sections."""
        total = 0
        for section in self.sections:
            total += section.estimated_minutes
            for subtopic in section.subtopics:
                total += subtopic.estimated_minutes
        return total

    def update_total_time(self) -> None:
        """Update the total_estimated_minutes field."""
        self.total_estimated_minutes = self.calculate_total_time()

    def get_all_topics(self) -> List[dict]:
        """Get flat list of all topics for curriculum design."""
        topics = []
        for section in self.sections:
            for subtopic in section.subtopics:
                topics.append(
                    {
                        "id": subtopic.id,
                        "title": subtopic.title,
                        "section_title": section.title,
                        "description": subtopic.description,
                        "key_points": subtopic.key_points,
                        "estimated_minutes": subtopic.estimated_minutes,
                        "learning_objectives": section.learning_objectives,
                    }
                )
        return topics

    class Config:
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174002",
                "course_id": "course-123",
                "version": 1,
                "metadata": {
                    "title": "Introduction to Programming",
                    "subject": "Computer Science",
                    "difficulty_level": "beginner",
                },
                "sections": [],
                "generator": "brave_llm",
                "total_estimated_minutes": 60,
            }
        }
