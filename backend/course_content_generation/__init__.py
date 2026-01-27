"""Course content generation using Google Gemini.

Generates course outlines from PDFs and slide-by-slide content with speech scripts.
"""

from course_content_generation.gemini_course_outline_generator import CourseOutlineGenerator
from course_content_generation.gemini_slide_speech_generator import process_course_outline

__all__ = ["CourseOutlineGenerator", "process_course_outline"]
