"""
LLM-related Data Transfer Objects.

These dataclasses define the contracts for LLM operations.
"""

from dataclasses import dataclass
from typing import Optional

from .enums import MessageRole


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
