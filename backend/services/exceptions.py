"""
Custom exceptions for the service layer.

NOTE: This file is maintained for backward compatibility.
All exceptions have been moved to the `models/` directory.

Import from `models` directly for new code:
    from models import ServiceError, NotFoundError, ...
"""

# Re-export all exceptions from models
from models.exceptions import (
    ServiceError,
    NotFoundError,
    ValidationError,
    AuthorizationError,
    StorageError,
    ProcessingError,
    SessionError,
    SessionNotFoundError,
)

__all__ = [
    "ServiceError",
    "NotFoundError",
    "ValidationError",
    "AuthorizationError",
    "StorageError",
    "ProcessingError",
    "SessionError",
    "SessionNotFoundError",
]
