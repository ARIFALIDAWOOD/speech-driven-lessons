"""
Custom exceptions for the service layer.

These exceptions provide semantic error handling that routers can translate
into appropriate HTTP responses.
"""


class ServiceError(Exception):
    """Base exception for all service layer errors."""

    def __init__(self, message: str, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class NotFoundError(ServiceError):
    """Raised when a requested resource is not found."""

    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            message=f"{resource_type} with id '{resource_id}' not found",
            details={"resource_type": resource_type, "resource_id": resource_id},
        )
        self.resource_type = resource_type
        self.resource_id = resource_id


class ValidationError(ServiceError):
    """Raised when input validation fails."""

    def __init__(
        self, message: str, field: str | None = None, errors: list | None = None
    ):
        super().__init__(
            message=message,
            details={"field": field, "errors": errors or []},
        )
        self.field = field
        self.errors = errors or []


class AuthorizationError(ServiceError):
    """Raised when a user lacks permission for an operation."""

    def __init__(self, message: str = "Not authorized to perform this action"):
        super().__init__(message=message)


class StorageError(ServiceError):
    """Raised when S3/storage operations fail."""

    def __init__(self, operation: str, message: str):
        super().__init__(
            message=f"Storage {operation} failed: {message}",
            details={"operation": operation},
        )
        self.operation = operation


class ProcessingError(ServiceError):
    """Raised when content processing (e.g., FAISS indexing) fails."""

    def __init__(self, message: str, course_id: str | None = None):
        super().__init__(
            message=message,
            details={"course_id": course_id},
        )
        self.course_id = course_id


class SessionError(ServiceError):
    """Raised when tutor session operations fail."""

    def __init__(self, message: str, session_id: str | None = None):
        super().__init__(
            message=message,
            details={"session_id": session_id},
        )
        self.session_id = session_id


class SessionNotFoundError(SessionError):
    """Raised when a tutor session is not found."""

    def __init__(self, session_id: str):
        super().__init__(
            message=f"Session '{session_id}' not found or has ended",
            session_id=session_id,
        )
