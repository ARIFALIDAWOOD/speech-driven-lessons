"""Generate slide-by-slide content and speech scripts from course outline using Gemini."""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List

from google import genai
from pypdf import PdfReader


def _extract_text_from_pdf(path: str) -> str:
    """Extract text from a PDF file."""
    reader = PdfReader(path)
    parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            parts.append(text)
    return "\n\n".join(parts) if parts else ""


def _load_outline(outline_path: str) -> List[Dict[str, Any]]:
    """Load and validate course outline JSON."""
    with open(outline_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    outline = data.get("course_outline")
    if not outline or not isinstance(outline, list):
        raise ValueError("Outline must contain a 'course_outline' list")
    return outline


def _generate_slide_content(
    client: genai.Client,
    model_name: str,
    section_title: str,
    section_desc: str,
    subtopic: Dict[str, Any],
    doc_excerpt: str,
    detail_level: str,
) -> Dict[str, Any]:
    """Generate markdown and transcript for one subtopic."""
    st_title = subtopic.get("title", "Untitled")
    st_desc = subtopic.get("description", "")
    prompt = f"""You are an expert educational content designer. Create one slide for this subtopic.

Section: {section_title}
Section context: {section_desc}

Subtopic: {st_title}
Subtopic context: {st_desc}

Relevant document excerpt:
---
{doc_excerpt[:8000]}
---

Detail level: {detail_level}. "brief"=less text, "normal"=moderate, "detailed"=thorough.

Respond with a JSON object only (no markdown fences):
{{
  "title": "Slide title (concise)",
  "slide_markdown": "Markdown for the slide. Use **, *, ##, lists. Keep it clear and scannable.",
  "transcript": "TTS script: 2–4 sentences, natural spoken language, explaining the slide."
}}
"""
    response = client.models.generate_content(
        model=model_name,
        contents=prompt,
        config={"temperature": 0.4, "max_output_tokens": 1024},
    )
    raw = (response.text or "").strip()
    # Strip optional ```json ... ```
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    out = json.loads(raw)
    return {
        "title": out.get("title", st_title),
        "slide_markdown": out.get("slide_markdown", ""),
        "transcript": out.get("transcript", ""),
    }


def process_course_outline(
    pdf_path: str,
    outline_path: str,
    output_dir: str,
    detail_level: str = "normal",
    stream: bool = True,
    max_workers: int = 3,
) -> None:
    """
    Generate slide content and speech scripts from a course outline and PDF.

    Writes course_content.json, all_slides.json, and optionally section JSONs under output_dir.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY must be set for slide generation")
    client = genai.Client(api_key=api_key)
    model_name = "gemini-1.5-flash"

    outline = _load_outline(outline_path)
    try:
        doc_text = _extract_text_from_pdf(pdf_path)
    except Exception as e:
        raise RuntimeError(f"Failed to extract PDF text: {e}") from e
    doc_excerpt = (doc_text or "")[:50000]

    os.makedirs(output_dir, exist_ok=True)

    flat_slides: List[Dict[str, Any]] = []
    course_content: Dict[str, Any] = {"sections": [], "slides": []}
    section_id = 0
    position = 0
    prev_slide_id: int | None = None

    for sec_idx, sec in enumerate(outline):
        section_id = sec_idx + 1
        sec_title = sec.get("title", f"Section {section_id}")
        subtopics = sec.get("subtopics") or []
        for st_idx, st in enumerate(subtopics):
            res = _generate_slide_content(
                client,
                model_name,
                sec.get("title", ""),
                sec.get("description", ""),
                st,
                doc_excerpt,
                detail_level,
            )
            position += 1
            slide_id = position
            rec = {
                "id": slide_id,
                "local_id": slide_id,
                "title": res["title"],
                "slide_markdown": res["slide_markdown"],
                "transcript": res["transcript"],
                "preview": "",
                "preview_path": "",
                "subtopic_id": st_idx,
                "subtopic_title": st.get("title", ""),
                "section_id": section_id,
                "section_title": sec_title,
                "prev_slide": prev_slide_id,
                "next_slide": slide_id + 1,
                "position": position - 1,
            }
            flat_slides.append(rec)
            prev_slide_id = slide_id
    if flat_slides:
        flat_slides[-1]["next_slide"] = None

    all_slides_path = os.path.join(output_dir, "all_slides.json")
    with open(all_slides_path, "w", encoding="utf-8") as f:
        json.dump(flat_slides, f, indent=2)

    course_content["sections"] = outline
    course_content["slides"] = flat_slides
    content_path = os.path.join(output_dir, "course_content.json")
    with open(content_path, "w", encoding="utf-8") as f:
        json.dump(course_content, f, indent=2)

    for sec_idx, sec in enumerate(outline):
        sec_slides = [s for s in flat_slides if s["section_id"] == sec_idx + 1]
        sec_dir = os.path.join(output_dir, f"section_{sec_idx + 1}")
        os.makedirs(sec_dir, exist_ok=True)
        sec_path = os.path.join(sec_dir, "content.json")
        with open(sec_path, "w", encoding="utf-8") as f:
            json.dump({"section": sec, "slides": sec_slides}, f, indent=2)
