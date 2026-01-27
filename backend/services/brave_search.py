"""
Brave Search API Client

Provides web search capabilities for gathering curriculum data and topic information.
"""

import os
import logging
from typing import Optional

import httpx

from models import SearchResult, SearchResponse


logger = logging.getLogger(__name__)


class BraveSearchClient:
    """Client for the Brave Search API."""

    BASE_URL = "https://api.search.brave.com/res/v1"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Brave Search client.

        Args:
            api_key: Brave Search API key (defaults to BRAVE_SEARCH_API_KEY env var)
        """
        self.api_key = api_key or os.getenv("BRAVE_SEARCH_API_KEY")
        if not self.api_key:
            logger.warning("Brave Search API key not configured")

    def _get_headers(self) -> dict:
        """Get headers for API requests."""
        return {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.api_key,
        }

    def search(
        self,
        query: str,
        count: int = 10,
        offset: int = 0,
        country: str = "IN",
        search_lang: str = "en",
        freshness: Optional[str] = None,
    ) -> SearchResponse:
        """
        Perform a web search using Brave Search API.

        Args:
            query: Search query string
            count: Number of results to return (max 20)
            offset: Result offset for pagination
            country: Country code for search localization
            search_lang: Language for search results
            freshness: Filter by content freshness (pd, pw, pm, py)

        Returns:
            SearchResponse with search results
        """
        if not self.api_key:
            logger.error("Brave Search API key not configured")
            return SearchResponse(query=query, results=[], total_results=0, took_ms=0)

        params = {
            "q": query,
            "count": min(count, 20),
            "offset": offset,
            "country": country,
            "search_lang": search_lang,
            "text_decorations": False,
        }

        if freshness:
            params["freshness"] = freshness

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.get(
                    f"{self.BASE_URL}/web/search",
                    headers=self._get_headers(),
                    params=params,
                )
                response.raise_for_status()
                data = response.json()

            results = []
            web_results = data.get("web", {}).get("results", [])

            for item in web_results:
                results.append(
                    SearchResult(
                        title=item.get("title", ""),
                        url=item.get("url", ""),
                        description=item.get("description", ""),
                        snippet=item.get("description", ""),
                        source=item.get("profile", {}).get("name", "Unknown"),
                        published_date=item.get("page_age"),
                    )
                )

            return SearchResponse(
                query=query,
                results=results,
                total_results=data.get("web", {}).get("total_results", len(results)),
                took_ms=data.get("query", {}).get("response_time", 0),
            )

        except httpx.HTTPStatusError as e:
            logger.error(f"Brave Search API error: {e.response.status_code} - {e.response.text}")
            return SearchResponse(query=query, results=[], total_results=0, took_ms=0)
        except Exception as e:
            logger.error(f"Brave Search error: {e}")
            return SearchResponse(query=query, results=[], total_results=0, took_ms=0)

    def search_curriculum(
        self,
        board: str,
        subject: str,
        chapter: str,
        additional_context: Optional[str] = None,
    ) -> SearchResponse:
        """
        Search for curriculum-specific content.

        Args:
            board: Education board (e.g., CBSE, ICSE)
            subject: Subject name
            chapter: Chapter name
            additional_context: Optional additional search terms

        Returns:
            SearchResponse with curriculum-related results
        """
        query_parts = [board, subject, chapter, "syllabus topics notes"]
        if additional_context:
            query_parts.append(additional_context)

        query = " ".join(query_parts)
        logger.info(f"Searching curriculum: {query}")

        return self.search(query, count=10)

    def search_topic_details(
        self,
        topic: str,
        board: Optional[str] = None,
        subject: Optional[str] = None,
    ) -> SearchResponse:
        """
        Search for detailed information about a specific topic.

        Args:
            topic: Topic to search for
            board: Optional education board context
            subject: Optional subject context

        Returns:
            SearchResponse with topic-related results
        """
        query_parts = [topic, "explanation examples concepts"]
        if board:
            query_parts.insert(0, board)
        if subject:
            query_parts.insert(1, subject)

        query = " ".join(query_parts)
        logger.info(f"Searching topic: {query}")

        return self.search(query, count=8)

    async def asearch(
        self,
        query: str,
        count: int = 10,
        offset: int = 0,
        country: str = "IN",
        search_lang: str = "en",
        freshness: Optional[str] = None,
    ) -> SearchResponse:
        """Async version of search."""
        if not self.api_key:
            logger.error("Brave Search API key not configured")
            return SearchResponse(query=query, results=[], total_results=0, took_ms=0)

        params = {
            "q": query,
            "count": min(count, 20),
            "offset": offset,
            "country": country,
            "search_lang": search_lang,
            "text_decorations": False,
        }

        if freshness:
            params["freshness"] = freshness

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/web/search",
                    headers=self._get_headers(),
                    params=params,
                )
                response.raise_for_status()
                data = response.json()

            results = []
            web_results = data.get("web", {}).get("results", [])

            for item in web_results:
                results.append(
                    SearchResult(
                        title=item.get("title", ""),
                        url=item.get("url", ""),
                        description=item.get("description", ""),
                        snippet=item.get("description", ""),
                        source=item.get("profile", {}).get("name", "Unknown"),
                        published_date=item.get("page_age"),
                    )
                )

            return SearchResponse(
                query=query,
                results=results,
                total_results=data.get("web", {}).get("total_results", len(results)),
                took_ms=data.get("query", {}).get("response_time", 0),
            )

        except Exception as e:
            logger.error(f"Brave Search async error: {e}")
            return SearchResponse(query=query, results=[], total_results=0, took_ms=0)
