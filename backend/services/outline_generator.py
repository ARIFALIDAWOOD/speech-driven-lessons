"""
Course Outline Generator

Combines Brave Search results with LLM to generate structured course outlines.
"""

import json
import logging
from typing import Iterator, Optional
from datetime import datetime

from models import (
    SubTopic,
    OutlineSection,
    CourseOutline,
    LLMMessage,
    LLMConfig,
    MessageRole,
)
from .brave_search import BraveSearchClient
from llm import get_llm_provider


logger = logging.getLogger(__name__)


OUTLINE_SYSTEM_PROMPT = """You are an expert educational content designer specializing in creating structured course outlines for students.

Your task is to create a comprehensive course outline based on the provided curriculum information and search results.

Guidelines:
1. Create 3-8 logical sections that cover the topic progressively
2. Each section should have 2-6 subtopics
3. Learning objectives should be specific and measurable (use Bloom's taxonomy verbs)
4. Estimate realistic time for each section (typically 10-20 minutes per section)
5. Include key points that students should remember
6. Organize content from basic to advanced concepts
7. Consider the education board's typical approach and standards

Output your response as a valid JSON object with the following structure:
{
  "sections": [
    {
      "title": "Section Title",
      "learning_objectives": ["Objective 1", "Objective 2"],
      "subtopics": [
        {
          "title": "Subtopic Title",
          "description": "Brief description of what this subtopic covers",
          "key_points": ["Point 1", "Point 2"],
          "estimated_minutes": 5
        }
      ],
      "estimated_minutes": 15
    }
  ]
}

Only output the JSON object, no additional text."""


class OutlineGenerator:
    """Generates structured course outlines using search and LLM."""

    def __init__(
        self,
        search_client: Optional[BraveSearchClient] = None,
        cache_days: int = 30,
    ):
        """
        Initialize the outline generator.

        Args:
            search_client: BraveSearchClient instance (creates default if None)
            cache_days: Number of days to cache outlines
        """
        self.search_client = search_client or BraveSearchClient()
        self.llm_provider = get_llm_provider()
        self.cache_days = cache_days

    def generate_outline(
        self,
        board: str,
        subject: str,
        chapter: str,
        topic: Optional[str] = None,
        use_search: bool = True,
    ) -> CourseOutline:
        """
        Generate a course outline for the given curriculum.

        Args:
            board: Education board (e.g., CBSE, ICSE)
            subject: Subject name
            chapter: Chapter name
            topic: Optional specific topic focus
            use_search: Whether to use Brave Search for context

        Returns:
            CourseOutline with structured sections
        """
        logger.info(f"Generating outline for {board} {subject} - {chapter}")

        # Gather context from search
        search_context = ""
        source_urls = []

        if use_search:
            try:
                search_response = self.search_client.search_curriculum(
                    board=board,
                    subject=subject,
                    chapter=chapter,
                    additional_context=topic,
                )
                search_context = search_response.get_combined_context(max_results=5)
                source_urls = [r.url for r in search_response.results[:5]]
                logger.info(f"Found {len(search_response.results)} search results")
            except Exception as e:
                logger.warning(f"Search failed, continuing without: {e}")

        # Build the prompt
        user_prompt = self._build_user_prompt(
            board=board,
            subject=subject,
            chapter=chapter,
            topic=topic,
            search_context=search_context,
        )

        # Generate outline using LLM
        messages = [
            LLMMessage(role=MessageRole.SYSTEM, content=OUTLINE_SYSTEM_PROMPT),
            LLMMessage(role=MessageRole.USER, content=user_prompt),
        ]

        config = LLMConfig(temperature=0.7, max_tokens=4000)
        response = self.llm_provider.complete(messages, config)

        # Parse the response
        outline_data = self._parse_outline_response(response.content)

        # Build the CourseOutline object
        sections = []
        total_minutes = 0

        for section_data in outline_data.get("sections", []):
            subtopics = []
            section_minutes = section_data.get("estimated_minutes", 15)

            for st_data in section_data.get("subtopics", []):
                subtopics.append(
                    SubTopic(
                        title=st_data.get("title", ""),
                        description=st_data.get("description", ""),
                        key_points=st_data.get("key_points", []),
                        estimated_minutes=st_data.get("estimated_minutes", 5),
                    )
                )

            sections.append(
                OutlineSection(
                    title=section_data.get("title", ""),
                    learning_objectives=section_data.get("learning_objectives", []),
                    subtopics=subtopics,
                    estimated_minutes=section_minutes,
                )
            )
            total_minutes += section_minutes

        return CourseOutline(
            board=board,
            subject=subject,
            chapter=chapter,
            topic=topic,
            sections=sections,
            source_urls=source_urls,
            generated_at=datetime.utcnow().isoformat(),
            total_estimated_minutes=total_minutes,
        )

    def stream_outline(
        self,
        board: str,
        subject: str,
        chapter: str,
        topic: Optional[str] = None,
        use_search: bool = True,
    ) -> Iterator[str]:
        """
        Stream the outline generation for SSE responses.

        Yields:
            Status updates and content chunks
        """
        yield json.dumps({"status": "searching", "message": "Searching for curriculum data..."})

        # Gather context from search
        search_context = ""
        source_urls = []

        if use_search:
            try:
                search_response = self.search_client.search_curriculum(
                    board=board,
                    subject=subject,
                    chapter=chapter,
                    additional_context=topic,
                )
                search_context = search_response.get_combined_context(max_results=5)
                source_urls = [r.url for r in search_response.results[:5]]
                yield json.dumps({
                    "status": "search_complete",
                    "message": f"Found {len(search_response.results)} relevant sources",
                    "sources": source_urls[:3],
                })
            except Exception as e:
                logger.warning(f"Search failed: {e}")
                yield json.dumps({"status": "search_failed", "message": "Search unavailable, using LLM knowledge"})

        yield json.dumps({"status": "generating", "message": "Creating course outline..."})

        # Build the prompt
        user_prompt = self._build_user_prompt(
            board=board,
            subject=subject,
            chapter=chapter,
            topic=topic,
            search_context=search_context,
        )

        # Generate outline using streaming LLM
        messages = [
            LLMMessage(role=MessageRole.SYSTEM, content=OUTLINE_SYSTEM_PROMPT),
            LLMMessage(role=MessageRole.USER, content=user_prompt),
        ]

        config = LLMConfig(temperature=0.7, max_tokens=4000)
        full_content = ""

        for chunk in self.llm_provider.stream(messages, config):
            full_content += chunk.content
            if chunk.content:
                yield json.dumps({"status": "outputting", "chunk": chunk.content})

        # Parse and return final outline
        try:
            outline_data = self._parse_outline_response(full_content)
            yield json.dumps({
                "status": "completed",
                "outline": outline_data,
                "source_urls": source_urls,
            })
        except Exception as e:
            logger.error(f"Failed to parse outline: {e}")
            yield json.dumps({"status": "error", "message": f"Failed to parse outline: {e}"})

    def _build_user_prompt(
        self,
        board: str,
        subject: str,
        chapter: str,
        topic: Optional[str],
        search_context: str,
    ) -> str:
        """Build the user prompt for outline generation."""
        prompt_parts = [
            f"Create a course outline for the following:",
            f"- Education Board: {board}",
            f"- Subject: {subject}",
            f"- Chapter: {chapter}",
        ]

        if topic:
            prompt_parts.append(f"- Specific Focus: {topic}")

        if search_context:
            prompt_parts.extend([
                "",
                "Here is relevant context from educational resources:",
                "---",
                search_context,
                "---",
                "",
                "Use this context to create an accurate and comprehensive outline.",
            ])

        prompt_parts.extend([
            "",
            "Generate a structured JSON outline with 3-8 sections, each containing:",
            "- Clear learning objectives",
            "- 2-6 subtopics with descriptions and key points",
            "- Realistic time estimates",
        ])

        return "\n".join(prompt_parts)

    def _parse_outline_response(self, content: str) -> dict:
        """Parse the LLM response into outline data."""
        # Try to extract JSON from the response
        content = content.strip()

        # Remove markdown code blocks if present
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
            content = content[3:]

        if content.endswith("```"):
            content = content[:-3]

        content = content.strip()

        try:
            return json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON: {e}")
            # Try to find JSON in the content
            import re
            json_match = re.search(r'\{[\s\S]*\}', content)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass

            # Return a default structure
            return {
                "sections": [
                    {
                        "title": "Introduction",
                        "learning_objectives": ["Understand the basics of the topic"],
                        "subtopics": [
                            {
                                "title": "Overview",
                                "description": "General introduction to the chapter",
                                "key_points": ["Key concept 1", "Key concept 2"],
                                "estimated_minutes": 10,
                            }
                        ],
                        "estimated_minutes": 15,
                    }
                ]
            }


async def generate_outline_async(
    board: str,
    subject: str,
    chapter: str,
    topic: Optional[str] = None,
) -> CourseOutline:
    """
    Async wrapper for outline generation.

    This is a convenience function for use in async contexts.
    """
    generator = OutlineGenerator()
    return generator.generate_outline(board, subject, chapter, topic)
