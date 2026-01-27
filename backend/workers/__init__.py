"""
Background Workers Module - Phase 2

Provides background task processing for long-running operations.
"""

from .embedding_worker import EmbeddingWorker, get_embedding_worker

__all__ = ["EmbeddingWorker", "get_embedding_worker"]
