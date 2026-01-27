"""
OpenRouter LLM Provider

Primary provider using zai/glm-4.7 and other models via OpenRouter's unified API.
"""

import json
import os
from typing import AsyncIterator, Iterator, Optional

import httpx

from .base import LLMConfig, LLMMessage, LLMProvider, LLMResponse, StreamChunk


class OpenRouterProvider(LLMProvider):
    """OpenRouter API provider for accessing various LLMs."""

    BASE_URL = "https://openrouter.ai/api/v1"
    DEFAULT_MODEL = "zhipu/glm-4-plus"  # zai/glm-4.7 equivalent on OpenRouter

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
        site_url: Optional[str] = None,
        site_name: Optional[str] = None,
    ):
        """
        Initialize OpenRouter provider.

        Args:
            api_key: OpenRouter API key (defaults to OPENROUTER_API_KEY env var)
            default_model: Default model to use
            site_url: Your site URL for OpenRouter attribution
            site_name: Your site name for OpenRouter attribution
        """
        api_key = api_key or os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OpenRouter API key is required")

        super().__init__(api_key, default_model or self.DEFAULT_MODEL)

        self.site_url = site_url or os.getenv("SITE_URL", "http://localhost:3391")
        self.site_name = site_name or os.getenv("SITE_NAME", "Speech-Driven Lessons")

    @property
    def provider_name(self) -> str:
        return "openrouter"

    @property
    def available_models(self) -> list[str]:
        return [
            "zhipu/glm-4-plus",  # Primary: GLM-4 Plus
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o",
            "openai/gpt-4o-mini",
            "google/gemini-pro-1.5",
            "meta-llama/llama-3.1-70b-instruct",
            "meta-llama/llama-3.1-405b-instruct",
        ]

    def _get_headers(self) -> dict:
        """Get headers for OpenRouter API requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.site_url,
            "X-Title": self.site_name,
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
            params.pop("model", None)  # Already set
            body.update(params)

        return body

    def complete(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """Generate a completion using OpenRouter."""
        body = self._build_request_body(messages, config)

        with httpx.Client(timeout=120.0) as client:
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
        """Generate a streaming completion using OpenRouter."""
        body = self._build_request_body(messages, config, stream=True)

        with httpx.Client(timeout=120.0) as client:
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
        """Async completion using OpenRouter."""
        body = self._build_request_body(messages, config)

        async with httpx.AsyncClient(timeout=120.0) as client:
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
        """Async streaming completion using OpenRouter."""
        body = self._build_request_body(messages, config, stream=True)

        async with httpx.AsyncClient(timeout=120.0) as client:
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
