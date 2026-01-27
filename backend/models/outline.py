"""
Outline-related Data Transfer Objects.

These dataclasses define the contracts for course outline operations.
"""

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class SubTopic:
    """Represents a subtopic within a section."""

    title: str
    description: str
    key_points: list[str] = field(default_factory=list)
    estimated_minutes: int = 5


@dataclass
class OutlineSection:
    """Represents a section in the course outline."""

    title: str
    learning_objectives: list[str]
    subtopics: list[SubTopic]
    estimated_minutes: int = 15

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "learning_objectives": self.learning_objectives,
            "subtopics": [
                {
                    "title": st.title,
                    "description": st.description,
                    "key_points": st.key_points,
                    "estimated_minutes": st.estimated_minutes,
                }
                for st in self.subtopics
            ],
            "estimated_minutes": self.estimated_minutes,
        }


@dataclass
class CourseOutline:
    """Complete course outline."""

    board: str
    subject: str
    chapter: str
    topic: Optional[str]
    sections: list[OutlineSection]
    source_urls: list[str]
    generated_at: str
    total_estimated_minutes: int

    def to_dict(self) -> dict:
        return {
            "board": self.board,
            "subject": self.subject,
            "chapter": self.chapter,
            "topic": self.topic,
            "sections": [s.to_dict() for s in self.sections],
            "source_urls": self.source_urls,
            "generated_at": self.generated_at,
            "total_estimated_minutes": self.total_estimated_minutes,
        }
