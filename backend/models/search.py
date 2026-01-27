"""
Search-related Data Transfer Objects.

These dataclasses define the contracts for search operations.
"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class SearchResult:
    """Represents a single search result."""

    title: str
    url: str
    description: str
    snippet: str
    source: str
    published_date: Optional[str] = None

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "url": self.url,
            "description": self.description,
            "snippet": self.snippet,
            "source": self.source,
            "published_date": self.published_date,
        }


@dataclass
class SearchResponse:
    """Response from a search query."""

    query: str
    results: list[SearchResult]
    total_results: int
    took_ms: int

    def get_combined_context(self, max_results: int = 5) -> str:
        """Combine search results into a single context string for LLM."""
        context_parts = []
        for i, result in enumerate(self.results[:max_results], 1):
            context_parts.append(
                f"[Source {i}] {result.title}\n"
                f"URL: {result.url}\n"
                f"Content: {result.snippet}\n"
            )
        return "\n---\n".join(context_parts)
