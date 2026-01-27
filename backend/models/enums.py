"""
Enumerations for the application.

Centralized location for all enum types used across the system.
"""

from enum import Enum


class TutorState(str, Enum):
    """States for the tutor agent state machine."""

    # Session setup states
    IDLE = "idle"
    COURSE_SETUP = "course_setup"

    # Assessment states
    INITIAL_ASSESSMENT = "initial_assessment"
    ASSESSMENT_REVIEW = "assessment_review"

    # Teaching states
    LESSON_INTRODUCTION = "lesson_introduction"
    CONCEPT_EXPLANATION = "concept_explanation"
    EXAMPLE_DEMONSTRATION = "example_demonstration"
    GUIDED_PRACTICE = "guided_practice"
    CHECK_UNDERSTANDING = "check_understanding"
    TOPIC_SUMMARY = "topic_summary"

    # Transition states
    LESSON_COMPLETE = "lesson_complete"
    BREAK_SUGGESTION = "break_suggestion"

    # Interaction states
    ANSWERING_QUESTION = "answering_question"
    HANDLING_CONFUSION = "handling_confusion"

    # End states
    SESSION_COMPLETE = "session_complete"
    SESSION_PAUSED = "session_paused"


class StudentLevel(str, Enum):
    """Student proficiency levels determined by assessment."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class AssessmentDifficulty(str, Enum):
    """Difficulty levels for assessment questions."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class MessageRole(str, Enum):
    """Message roles for LLM conversations."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
