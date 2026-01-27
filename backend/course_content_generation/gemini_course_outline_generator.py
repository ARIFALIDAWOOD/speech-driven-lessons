"""Generate course outlines from PDFs using Google Gemini."""

from __future__ import annotations

import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List

from google import genai
from pypdf import PdfReader

OUTLINE_SCHEMA = """
Respond with a single JSON object (no markdown, no code fences) of this exact shape:
{
  "course_outline": [
    {
      "title": "Section title",
      "description": "Brief section description",
      "subtopics": [
        {"title": "Subtopic title", "description": "Subtopic description"},
        ...
      ]
    },
    ...
  ]
}
Create 3–8 sections. Each section has 2–6 subtopics. Base everything strictly on the document.
"""


def _extract_text_from_pdf(path: str) -> str:
    """Extract text from a PDF file."""
    reader = PdfReader(path)
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n\n".join(parts) if parts else ""


def _parse_outline_json(raw: str) -> Dict[str, Any]:
    """Parse outline from model output, handling optional markdown code fences."""
    raw = raw.strip()
    m = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
    if m:
        raw = m.group(1).strip()
    return json.loads(raw)


class CourseOutlineGenerator:
    """Generates structured course outlines from PDF documents using Gemini."""

    def __init__(self, api_key: str | None = None) -> None:
        """Initialize the generator with optional Gemini API key."""
        key = api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            raise ValueError("GEMINI_API_KEY must be set for course outline generation")
        self._client = genai.Client(api_key=key)
        self._model_name = "gemini-1.5-flash"
        self.stream_response: List[str] = []

    def generate_from_pdf(self, pdf_path: str, stream: bool = False) -> Dict[str, Any]:
        """
        Generate a course outline from a PDF file.

        Args:
            pdf_path: Path to the PDF file.
            stream: If True, populate self.stream_response with streaming chunks.

        Returns:
            Dict with "course_outline", "generated_at", "source_pdf", or {"error": "..."}.
        """
        self.stream_response = []
        if not os.path.isfile(pdf_path):
            return {"error": f"PDF not found: {pdf_path}"}

        try:
            text = _extract_text_from_pdf(pdf_path)
        except Exception as e:
            return {"error": f"Failed to extract PDF text: {e}"}

        if not text or len(text.strip()) < 100:
            return {"error": "PDF has insufficient extractable text for outline generation"}

        doc_excerpt = text[:120000]
        prompt = f"""You are an expert course designer. Produce a structured course outline.

{OUTLINE_SCHEMA}

Document content (excerpt; use full context when generating):

---
{doc_excerpt}
---
"""

        config = {"temperature": 0.3}
        try:
            if stream:
                accumulated = []
                for chunk in self._client.models.generate_content_stream(
                    model=self._model_name,
                    contents=prompt,
                    config=config,
                ):
                    if chunk.text:
                        accumulated.append(chunk.text)
                        self.stream_response.append(chunk.text)
                full_text = "".join(accumulated)
            else:
                response = self._client.models.generate_content(
                    model=self._model_name,
                    contents=prompt,
                    config=config,
                )
                full_text = (response.text or "").strip()
                if not full_text:
                    return {"error": "Gemini returned empty response"}

            data = _parse_outline_json(full_text)
            course_outline = data.get("course_outline")
            if not course_outline or not isinstance(course_outline, list):
                return {"error": "Generated outline missing or invalid 'course_outline' list"}

            return {
                "course_outline": course_outline,
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "source_pdf": os.path.basename(pdf_path),
            }
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON in outline response: {e}"}
        except Exception as e:
            return {"error": str(e)}
