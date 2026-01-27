"""
Plan Generator Service - Phase 2

Unified service for generating course plans/outlines.
Supports both PDF-based (Gemini) and search-based (Brave) generation.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from schemas.course_plan import (
    CoursePlan,
    CoursePlanMetadata,
    Section,
    SubTopic,
    GeneratorType,
    DifficultyLevel,
)
from events.course_events import CourseEvent, CourseEventType
from events.event_bus import get_event_bus

logger = logging.getLogger(__name__)


class PlanGenerator:
    """
    Unified plan generator that selects the appropriate generation method
    based on available course materials.

    Generation methods:
    1. PDF-based: Uses Gemini to analyze uploaded PDF documents
    2. Search-based: Uses Brave Search + LLM to create outline from curriculum info
    """

    def __init__(self):
        """Initialize the plan generator."""
        self._event_bus = get_event_bus()

    async def generate_async(
        self,
        course_id: str,
        user_email: str,
        force_method: Optional[GeneratorType] = None,
    ) -> CoursePlan:
        """
        Generate a course plan asynchronously.

        Args:
            course_id: The course ID
            user_email: User's email address
            force_method: Optional forced generation method

        Returns:
            Generated CoursePlan
        """
        # Emit start event
        self._event_bus.emit(
            CourseEvent(
                event_type=CourseEventType.OUTLINE_GENERATION_STARTED,
                course_id=course_id,
                user_email=user_email,
            )
        )

        try:
            plan = await self._do_generate(course_id, user_email, force_method)

            # Save the plan
            self._save_plan(course_id, user_email, plan)

            # Emit completion event
            self._event_bus.emit(
                CourseEvent(
                    event_type=CourseEventType.OUTLINE_GENERATION_COMPLETED,
                    course_id=course_id,
                    user_email=user_email,
                    data={"plan_id": plan.id, "sections": len(plan.sections)},
                )
            )

            return plan

        except Exception as e:
            logger.error(f"Plan generation failed: {e}")
            self._event_bus.emit(
                CourseEvent(
                    event_type=CourseEventType.OUTLINE_GENERATION_FAILED,
                    course_id=course_id,
                    user_email=user_email,
                    data={"error": str(e)},
                )
            )
            raise

    def generate(
        self,
        course_id: str,
        user_email: str,
        force_method: Optional[GeneratorType] = None,
    ) -> CoursePlan:
        """
        Generate a course plan synchronously.

        Args:
            course_id: The course ID
            user_email: User's email address
            force_method: Optional forced generation method

        Returns:
            Generated CoursePlan
        """
        import asyncio

        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(
                self.generate_async(course_id, user_email, force_method)
            )
        finally:
            loop.close()

    async def _do_generate(
        self,
        course_id: str,
        user_email: str,
        force_method: Optional[GeneratorType],
    ) -> CoursePlan:
        """Internal generation logic."""
        # Import here to avoid circular imports
        from services.course_service import CourseService

        service = CourseService(user_email=user_email)
        course_info = service.get_course(course_id)

        if not course_info:
            raise ValueError(f"Course not found: {course_id}")

        course_data = course_info.course

        # Determine generation method
        method = force_method
        if method is None:
            uploaded_files = course_data.uploaded_files if course_data else []
            has_pdfs = any(f.filename.lower().endswith(".pdf") for f in uploaded_files)
            method = GeneratorType.GEMINI_PDF if has_pdfs else GeneratorType.BRAVE_LLM

        # Generate based on method
        if method == GeneratorType.GEMINI_PDF:
            return await self._generate_from_pdf(course_id, user_email, course_data)
        else:
            return await self._generate_from_search(course_id, user_email, course_data)

    async def _generate_from_pdf(
        self,
        course_id: str,
        user_email: str,
        course_data: Any,
    ) -> CoursePlan:
        """Generate plan from uploaded PDF documents."""
        from course_content_generation.gemini_course_outline_generator import (
            CourseOutlineGenerator,
        )
        import utils.s3_utils as s3_utils
        import tempfile

        logger.info(f"Generating plan from PDF for course {course_id}")

        uploaded_files = course_data.uploaded_files if course_data else []
        pdf_files = [f for f in uploaded_files if f.filename.lower().endswith(".pdf")]

        if not pdf_files:
            raise ValueError("No PDF files found for PDF-based generation")

        # Download first PDF (could be extended to merge multiple)
        pdf_file = pdf_files[0]
        s3_key = f"user_data/{user_email}/{course_id}/uploaded_files/{pdf_file.filename}"

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp_path = tmp.name
            s3_utils.download_file_obj(s3_key, tmp)

        try:
            generator = CourseOutlineGenerator()
            result = generator.generate_from_pdf(tmp_path)

            if "error" in result:
                raise ValueError(result["error"])

            # Convert to CoursePlan
            return self._convert_gemini_outline(
                course_id=course_id,
                outline_data=result,
                course_data=course_data,
                source_files=[f.filename for f in pdf_files],
            )
        finally:
            # Cleanup temp file
            import os

            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    async def _generate_from_search(
        self,
        course_id: str,
        user_email: str,
        course_data: Any,
    ) -> CoursePlan:
        """Generate plan from Brave Search + LLM."""
        from services.outline_generator import OutlineGenerator

        logger.info(f"Generating plan from search for course {course_id}")

        # Extract curriculum info from course data
        board = getattr(course_data, "board", "") or ""
        subject = getattr(course_data, "subject", "") or ""
        chapter = getattr(course_data, "chapter", "") or ""
        title = getattr(course_data, "title", "") or chapter

        generator = OutlineGenerator()
        outline = generator.generate_outline(
            board=board,
            subject=subject,
            chapter=chapter or title,
            use_search=True,
        )

        # Convert to CoursePlan
        return self._convert_search_outline(
            course_id=course_id,
            outline=outline,
            course_data=course_data,
        )

    def _convert_gemini_outline(
        self,
        course_id: str,
        outline_data: Dict[str, Any],
        course_data: Any,
        source_files: List[str],
    ) -> CoursePlan:
        """Convert Gemini outline format to CoursePlan."""
        sections = []
        raw_outline = outline_data.get("course_outline", [])

        for idx, section_data in enumerate(raw_outline):
            subtopics = []
            for sub_idx, sub_data in enumerate(section_data.get("subtopics", [])):
                subtopics.append(
                    SubTopic(
                        id=str(uuid4()),
                        title=sub_data.get("title", f"Subtopic {sub_idx + 1}"),
                        description=sub_data.get("description", ""),
                        key_points=sub_data.get("key_points", []),
                        estimated_minutes=sub_data.get("estimated_minutes", 5),
                        order=sub_idx,
                    )
                )

            sections.append(
                Section(
                    id=str(uuid4()),
                    title=section_data.get("title", f"Section {idx + 1}"),
                    description=section_data.get("description", ""),
                    learning_objectives=section_data.get("learning_objectives", []),
                    estimated_minutes=sum(s.estimated_minutes for s in subtopics),
                    order=idx,
                    subtopics=subtopics,
                )
            )

        # Build metadata
        title = getattr(course_data, "title", "") or "Untitled Course"
        metadata = CoursePlanMetadata(
            title=title,
            description=getattr(course_data, "description", "") or "",
            board=getattr(course_data, "board", "") or "",
            subject=getattr(course_data, "subject", "") or "",
            chapter=getattr(course_data, "chapter", "") or "",
            difficulty_level=DifficultyLevel.INTERMEDIATE,
        )

        return CoursePlan(
            id=str(uuid4()),
            course_id=course_id,
            version=1,
            metadata=metadata,
            sections=sections,
            source_files=source_files,
            generator=GeneratorType.GEMINI_PDF,
            generated_at=datetime.utcnow(),
            total_estimated_minutes=sum(s.estimated_minutes for s in sections),
        )

    def _convert_search_outline(
        self,
        course_id: str,
        outline: Any,
        course_data: Any,
    ) -> CoursePlan:
        """Convert search-based outline to CoursePlan."""
        sections = []

        for idx, section in enumerate(outline.sections):
            subtopics = []
            for sub_idx, sub in enumerate(section.subtopics):
                subtopics.append(
                    SubTopic(
                        id=str(uuid4()),
                        title=sub.title,
                        description=sub.description or "",
                        key_points=sub.key_points or [],
                        estimated_minutes=sub.estimated_minutes or 5,
                        order=sub_idx,
                    )
                )

            sections.append(
                Section(
                    id=str(uuid4()),
                    title=section.title,
                    description=section.description or "",
                    learning_objectives=section.learning_objectives or [],
                    estimated_minutes=section.estimated_minutes or 15,
                    order=idx,
                    subtopics=subtopics,
                )
            )

        # Build metadata
        title = getattr(course_data, "title", "") or outline.title or "Untitled Course"
        metadata = CoursePlanMetadata(
            title=title,
            description=getattr(course_data, "description", "") or "",
            board=getattr(course_data, "board", "") or "",
            subject=getattr(course_data, "subject", "") or "",
            chapter=getattr(course_data, "chapter", "") or "",
            difficulty_level=DifficultyLevel.INTERMEDIATE,
        )

        return CoursePlan(
            id=str(uuid4()),
            course_id=course_id,
            version=1,
            metadata=metadata,
            sections=sections,
            source_files=[],
            generator=GeneratorType.BRAVE_LLM,
            generated_at=datetime.utcnow(),
            total_estimated_minutes=sum(s.estimated_minutes for s in sections),
        )

    def _save_plan(self, course_id: str, user_email: str, plan: CoursePlan):
        """Save plan to S3 storage."""
        import utils.s3_utils as s3_utils
        import json

        s3_key = f"user_data/{user_email}/{course_id}/course_plan.json"

        try:
            plan_json = plan.model_dump_json(indent=2)
            s3_utils.upload_json_to_s3(s3_key, json.loads(plan_json))
            logger.info(f"Saved course plan to {s3_key}")
        except Exception as e:
            logger.error(f"Failed to save course plan: {e}")
            raise


def load_course_plan(course_id: str, user_email: str) -> Optional[CoursePlan]:
    """
    Load a saved course plan from S3.

    Args:
        course_id: The course ID
        user_email: User's email address

    Returns:
        CoursePlan if found, None otherwise
    """
    import utils.s3_utils as s3_utils

    s3_key = f"user_data/{user_email}/{course_id}/course_plan.json"

    try:
        data = s3_utils.download_json_from_s3(s3_key)
        if data:
            return CoursePlan.model_validate(data)
        return None
    except Exception as e:
        logger.warning(f"Failed to load course plan: {e}")
        return None
