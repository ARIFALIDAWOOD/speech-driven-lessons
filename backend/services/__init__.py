"""
Backend services for the Agent-Driven Teaching System.
"""

from .brave_search import BraveSearchClient, SearchResult
from .outline_generator import OutlineGenerator, CourseOutline, OutlineSection
from .materials_context import (
    MaterialsContextManager,
    get_materials_manager,
    clear_session_materials,
)

__all__ = [
    "BraveSearchClient",
    "SearchResult",
    "OutlineGenerator",
    "CourseOutline",
    "OutlineSection",
    "MaterialsContextManager",
    "get_materials_manager",
    "clear_session_materials",
]
