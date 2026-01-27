"""
Abstract base class for LLM providers.

NOTE: Data models (LLMMessage, LLMResponse, etc.) have been moved to `models/`.
Import from `models` directly for new code:
    from models import LLMMessage, LLMConfig, MessageRole, ...

This file retains the LLMProvider abstract base class.
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Iterator, Optional

# Re-export DTOs from models for backward compatibility
from models.enums import MessageRole
from models.llm import LLMConfig, LLMMessage, LLMResponse, StreamChunk


class LLMProvider(ABC):
    """Abstract base class for LLM providers."""

    def __init__(self, api_key: str, default_model: Optional[str] = None):
        """
        Initialize the LLM provider.

        Args:
            api_key: API key for the provider
            default_model: Default model to use if not specified in requests
        """
        self.api_key = api_key
        self.default_model = default_model

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the name of this provider."""
        pass

    @property
    @abstractmethod
    def available_models(self) -> list[str]:
        """Return list of available models for this provider."""
        pass

    @abstractmethod
    def complete(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """
        Generate a completion for the given messages.

        Args:
            messages: List of conversation messages
            config: Optional configuration overrides

        Returns:
            LLMResponse with the generated content
        """
        pass

    @abstractmethod
    def stream(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> Iterator[StreamChunk]:
        """
        Generate a streaming completion for the given messages.

        Args:
            messages: List of conversation messages
            config: Optional configuration overrides

        Yields:
            StreamChunk objects with content fragments
        """
        pass

    @abstractmethod
    async def acomplete(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """
        Async version of complete().

        Args:
            messages: List of conversation messages
            config: Optional configuration overrides

        Returns:
            LLMResponse with the generated content
        """
        pass

    @abstractmethod
    async def astream(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> AsyncIterator[StreamChunk]:
        """
        Async streaming completion.

        Args:
            messages: List of conversation messages
            config: Optional configuration overrides

        Yields:
            StreamChunk objects with content fragments
        """
        pass

    def _get_model(self, config: Optional[LLMConfig]) -> str:
        """Get the model to use, with fallback to default."""
        if config and config.model:
            return config.model
        if self.default_model:
            return self.default_model
        if self.available_models:
            return self.available_models[0]
        raise ValueError("No model specified and no default available")

    def _prepare_messages(self, messages: list[LLMMessage]) -> list[dict]:
        """Convert LLMMessage objects to dictionaries."""
        return [msg.to_dict() for msg in messages]

    def health_check(self) -> bool:
        """
        Check if the provider is accessible.

        Returns:
            True if the provider is healthy, False otherwise
        """
        try:
            response = self.complete(
                [LLMMessage(role=MessageRole.USER, content="Hi")],
                LLMConfig(max_tokens=5),
            )
            return bool(response.content)
        except Exception:
            return False


__all__ = [
    "LLMProvider",
    "LLMMessage",
    "LLMResponse",
    "StreamChunk",
    "LLMConfig",
    "MessageRole",
]
