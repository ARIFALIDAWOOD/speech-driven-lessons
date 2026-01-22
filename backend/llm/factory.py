"""
LLM Provider Factory

Factory pattern for provider selection with automatic fallback support.
"""

import os
import logging
from typing import Optional, Iterator, AsyncIterator
from enum import Enum

from .base import (
    LLMProvider,
    LLMMessage,
    LLMResponse,
    LLMConfig,
    StreamChunk,
)
from .openrouter import OpenRouterProvider
from .groq import GroqProvider
from .cerebras import CerebrasProvider


logger = logging.getLogger(__name__)


class ProviderType(str, Enum):
    """Available LLM provider types."""
    OPENROUTER = "openrouter"
    GROQ = "groq"
    CEREBRAS = "cerebras"


# Provider priority for fallback (first = primary)
DEFAULT_PROVIDER_PRIORITY = [
    ProviderType.OPENROUTER,
    ProviderType.GROQ,
    ProviderType.CEREBRAS,
]


class LLMFactory:
    """Factory for creating and managing LLM providers with fallback support."""

    _providers: dict[ProviderType, LLMProvider] = {}

    @classmethod
    def get_provider(
        cls,
        provider_type: ProviderType,
        **kwargs,
    ) -> LLMProvider:
        """
        Get or create a provider instance.

        Args:
            provider_type: Type of provider to get
            **kwargs: Additional arguments for provider initialization

        Returns:
            LLMProvider instance
        """
        if provider_type not in cls._providers:
            cls._providers[provider_type] = cls._create_provider(provider_type, **kwargs)
        return cls._providers[provider_type]

    @classmethod
    def _create_provider(
        cls,
        provider_type: ProviderType,
        **kwargs,
    ) -> LLMProvider:
        """Create a new provider instance."""
        if provider_type == ProviderType.OPENROUTER:
            return OpenRouterProvider(**kwargs)
        elif provider_type == ProviderType.GROQ:
            return GroqProvider(**kwargs)
        elif provider_type == ProviderType.CEREBRAS:
            return CerebrasProvider(**kwargs)
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")

    @classmethod
    def clear_cache(cls):
        """Clear the provider cache."""
        cls._providers.clear()


class FallbackLLMProvider(LLMProvider):
    """
    LLM provider with automatic fallback to backup providers.

    Tries providers in order until one succeeds.
    """

    def __init__(
        self,
        provider_priority: Optional[list[ProviderType]] = None,
        default_model: Optional[str] = None,
    ):
        """
        Initialize fallback provider.

        Args:
            provider_priority: List of providers to try in order
            default_model: Default model (provider-specific)
        """
        self.provider_priority = provider_priority or DEFAULT_PROVIDER_PRIORITY
        self._default_model = default_model
        self._available_providers: list[LLMProvider] = []

        # Initialize available providers
        for provider_type in self.provider_priority:
            try:
                provider = LLMFactory.get_provider(provider_type)
                self._available_providers.append(provider)
                logger.info(f"Initialized {provider_type.value} provider")
            except ValueError as e:
                logger.warning(f"Could not initialize {provider_type.value}: {e}")

        if not self._available_providers:
            raise RuntimeError("No LLM providers could be initialized")

    @property
    def provider_name(self) -> str:
        return "fallback"

    @property
    def available_models(self) -> list[str]:
        """Return all models from available providers."""
        models = []
        for provider in self._available_providers:
            models.extend(provider.available_models)
        return models

    @property
    def api_key(self) -> str:
        """Return primary provider's API key."""
        return self._available_providers[0].api_key if self._available_providers else ""

    @property
    def default_model(self) -> Optional[str]:
        """Return default model."""
        return self._default_model or (
            self._available_providers[0].default_model
            if self._available_providers else None
        )

    def complete(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """Try providers until one succeeds."""
        last_error = None

        for provider in self._available_providers:
            try:
                logger.debug(f"Trying {provider.provider_name} for completion")
                return provider.complete(messages, config)
            except Exception as e:
                logger.warning(f"{provider.provider_name} failed: {e}")
                last_error = e
                continue

        raise RuntimeError(f"All providers failed. Last error: {last_error}")

    def stream(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> Iterator[StreamChunk]:
        """Try providers until one succeeds for streaming."""
        last_error = None

        for provider in self._available_providers:
            try:
                logger.debug(f"Trying {provider.provider_name} for streaming")
                yield from provider.stream(messages, config)
                return
            except Exception as e:
                logger.warning(f"{provider.provider_name} failed: {e}")
                last_error = e
                continue

        raise RuntimeError(f"All providers failed. Last error: {last_error}")

    async def acomplete(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> LLMResponse:
        """Async try providers until one succeeds."""
        last_error = None

        for provider in self._available_providers:
            try:
                logger.debug(f"Trying {provider.provider_name} for async completion")
                return await provider.acomplete(messages, config)
            except Exception as e:
                logger.warning(f"{provider.provider_name} failed: {e}")
                last_error = e
                continue

        raise RuntimeError(f"All providers failed. Last error: {last_error}")

    async def astream(
        self,
        messages: list[LLMMessage],
        config: Optional[LLMConfig] = None,
    ) -> AsyncIterator[StreamChunk]:
        """Async try providers until one succeeds for streaming."""
        last_error = None

        for provider in self._available_providers:
            try:
                logger.debug(f"Trying {provider.provider_name} for async streaming")
                async for chunk in provider.astream(messages, config):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"{provider.provider_name} failed: {e}")
                last_error = e
                continue

        raise RuntimeError(f"All providers failed. Last error: {last_error}")


# Singleton instance for easy access
_default_provider: Optional[FallbackLLMProvider] = None


def get_llm_provider(
    provider_type: Optional[ProviderType] = None,
    use_fallback: bool = True,
) -> LLMProvider:
    """
    Get an LLM provider instance.

    Args:
        provider_type: Specific provider to use (None for default fallback)
        use_fallback: Whether to use fallback provider (default True)

    Returns:
        LLMProvider instance
    """
    global _default_provider

    if provider_type:
        return LLMFactory.get_provider(provider_type)

    if use_fallback:
        if _default_provider is None:
            _default_provider = FallbackLLMProvider()
        return _default_provider

    # Try to get first available provider
    for pt in DEFAULT_PROVIDER_PRIORITY:
        try:
            return LLMFactory.get_provider(pt)
        except ValueError:
            continue

    raise RuntimeError("No LLM providers available")


def reset_default_provider():
    """Reset the default provider (useful for testing)."""
    global _default_provider
    _default_provider = None
    LLMFactory.clear_cache()
