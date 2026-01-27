"""
Groq LLM Provider

Fallback provider using llama-3.1-70b-versatile via Groq's fast inference API.
"""

import json
import os
from typing import AsyncIterator, Iterator, Optional

import httpx

from .base import LLMConfig, LLMMessage, LLMProvider, LLMResponse, StreamChunk


class GroqProvider(LLMProvider):
    """Groq API provider for fast LLM inference."""

    BASE_URL = "https://api.groq.com/openai/v1"
    DEFAULT_MODEL = "llama-3.1-70b-versatile"

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
    ):
        """
        Initialize Groq provider.

        Args:
            api_key: Groq API key (defaults to GROQ_API_KEY env var)
            default_model: Default model to use
        """
        api_key = api_key or os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("Groq API key is required")

        super().__init__(api_key, default_model or self.DEFAULT_MODEL)

    @property
    def provider_name(self) -> str:
        return "groq"

    @property
    def available_models(self) -> list[str]:
        return [
            "llama-3.1-70b-versatile",
            "llama-3.1-8b-instant",
            "llama-3.3-70b-versatile",
            "mixtral-8x7b-32768",
            "gemma2-9b-it",
        ]

    def _get_headers(self) -> dict:
        """Get headers for Groq API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _build_request_body(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig],
        stream: bool = False,
    ) -> dict:
        """Build the request body for API calls."""
        model = self._get_model(config)
        body = {
            "model": model,
            "messages": self._prepare_messages(messages),
            "stream": stream,
        }

        if config:
            params = config.to_dict()
            params.pop("model", None)
            # Groq doesn't support all OpenAI parameters
            params.pop("response_format", None)
            body.update(params)

        return body

    def complete(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """Generate a completion using Groq."""
        body = self._build_request_body(messages, config)

        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self._get_headers(),
                json=body,
            )
            response.raise_for_status()
            data = response.json()

        choice = data["choices"][0]
        return LLMResponse(
            content=choice["message"]["content"],
            model=data.get("model", self._get_model(config)),
            provider=self.provider_name,
            finish_reason=choice.get("finish_reason"),
            usage=data.get("usage"),
            raw_response=data,
        )

    def stream(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> Iterator[StreamChunk]:
        """Generate a streaming completion using Groq."""
        body = self._build_request_body(messages, config, stream=True)

        with httpx.Client(timeout=60.0) as client:
            with client.stream(
                "POST",
                f"{self.BASE_URL}/chat/completions",
                headers=self._get_headers(),
                json=body,
            ) as response:
                response.raise_for_status()

                for line in response.iter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            yield StreamChunk(content="", is_finished=True)
                            break

                        try:
                            data = json.loads(data_str)
                            choice = data["choices"][0]
                            delta = choice.get("delta", {})
                            content = delta.get("content", "")
                            finish_reason = choice.get("finish_reason")

                            yield StreamChunk(
                                content=content,
                                is_finished=finish_reason is not None,
                                finish_reason=finish_reason,
                            )
                        except json.JSONDecodeError:
                            continue

    async def acomplete(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """Async completion using Groq."""
        body = self._build_request_body(messages, config)

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/chat/completions",
                headers=self._get_headers(),
                json=body,
            )
            response.raise_for_status()
            data = response.json()

        choice = data["choices"][0]
        return LLMResponse(
            content=choice["message"]["content"],
            model=data.get("model", self._get_model(config)),
            provider=self.provider_name,
            finish_reason=choice.get("finish_reason"),
            usage=data.get("usage"),
            raw_response=data,
        )

    async def astream(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> AsyncIterator[StreamChunk]:
        """Async streaming completion using Groq."""
        body = self._build_request_body(messages, config, stream=True)

        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{self.BASE_URL}/chat/completions",
                headers=self._get_headers(),
                json=body,
            ) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line:
                        continue
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            yield StreamChunk(content="", is_finished=True)
                            break

                        try:
                            data = json.loads(data_str)
                            choice = data["choices"][0]
                            delta = choice.get("delta", {})
                            content = delta.get("content", "")
                            finish_reason = choice.get("finish_reason")

                            yield StreamChunk(
                                content=content,
                                is_finished=finish_reason is not None,
                                finish_reason=finish_reason,
                            )
                        except json.JSONDecodeError:
                            continue
