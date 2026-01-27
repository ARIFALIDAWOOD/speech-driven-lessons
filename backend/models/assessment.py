"""
Assessment-related Data Transfer Objects.

These dataclasses define the contracts for assessment operations.
"""

from dataclasses import dataclass, field

from .enums import AssessmentDifficulty


@dataclass
class AssessmentQuestion:
    """Represents an assessment question."""

    question_text: str
    question_type: str  # "mcq", "true_false", "short_answer"
    options: list[str] = field(default_factory=list)
    correct_answer: str = ""
    difficulty: AssessmentDifficulty = AssessmentDifficulty.MEDIUM
    explanation: str = ""


@dataclass
class AssessmentResponse:
    """Represents a student's response to an assessment question."""

    question_index: int
    question_text: str
    question_type: str
    student_answer: str
    correct_answer: str
    is_correct: bool
    difficulty: AssessmentDifficulty
