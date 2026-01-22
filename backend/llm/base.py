"""
Abstract base class for LLM providers.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator, Iterator, Optional, Literal
from enum import Enum


class MessageRole(str, Enum):
    """Message roles for LLM conversations."""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


@dataclass
class LLMMessage:
    """Represents a message in a conversation."""
    role: MessageRole | str
    content: str

    def to_dict(self) -> dict:
        """Convert to dictionary for API calls."""
        role = self.role.value if isinstance(self.role, MessageRole) else self.role
        return {"role": role, "content": self.content}


@dataclass
class LLMResponse:
    """Response from an LLM provider."""
    content: str
    model: str
    provider: str
    finish_reason: Optional[str] = None
    usage: Optional[dict] = None
    raw_response: Optional[dict] = None


@dataclass
class StreamChunk:
    """A chunk from a streaming response."""
    content: str
    is_finished: bool = False
    finish_reason: Optional[str] = None


@dataclass
class LLMConfig:
    """Configuration for LLM requests."""
    model: Optional[str] = None
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0
    stop: Optional[list[str]] = None
    response_format: Optional[dict] = None

    def to_dict(self) -> dict:
        """Convert to dictionary, excluding None values."""
        result = {}
        if self.model:
            result["model"] = self.model
        result["temperature"] = self.temperature
        if self.max_tokens:
            result["max_tokens"] = self.max_tokens
        result["top_p"] = self.top_p
        if self.frequency_penalty:
            result["frequency_penalty"] = self.frequency_penalty
        if self.presence_penalty:
            result["presence_penalty"] = self.presence_penalty
        if self.stop:
            result["stop"] = self.stop
        if self.response_format:
            result["response_format"] = self.response_format
        return result


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
                LLMConfig(max_tokens=5)
            )
            return bool(response.content)
        except Exception:
            return False
