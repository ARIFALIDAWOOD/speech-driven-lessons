"""
LLM Provider Abstraction Layer

Provides a unified interface for multiple LLM providers:
- OpenRouter (primary): zai/glm-4.7
- Groq (fallback): llama-3.1-70b-versatile
- Cerebras (fallback): llama3.1-70b
"""

from .base import LLMConfig, LLMMessage, LLMProvider, LLMResponse, MessageRole, StreamChunk
from .cerebras import CerebrasProvider
from .factory import LLMFactory, get_llm_provider
from .groq import GroqProvider
from .openrouter import OpenRouterProvider

__all__ = [
    "LLMProvider",
    "LLMResponse",
    "LLMMessage",
    "LLMConfig",
    "MessageRole",
    "StreamChunk",
    "LLMFactory",
    "get_llm_provider",
    "OpenRouterProvider",
    "GroqProvider",
    "CerebrasProvider",
]
