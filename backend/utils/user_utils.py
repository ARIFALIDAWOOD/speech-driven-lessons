"""User utilities for authentication and user management.

NOTE: This module is DEPRECATED for Flask-based authentication.
For FastAPI, use `dependencies/auth.py` which provides:
- get_current_user dependency for route protection
- Supabase client-based JWT validation

This module is kept for backward compatibility with legacy code.
"""

import logging
import os
from typing import Any, Dict, Optional

import utils.s3_utils as s3_utils
from .supabase_auth import verify_supabase_token

logger = logging.getLogger(__name__)


def get_user_from_token(token: str) -> Optional[str]:
    """Get user email from a JWT token.

    Args:
        token: JWT token string (without 'Bearer ' prefix)

    Returns:
        User email if token is valid, None otherwise
    """
    if not token:
        logger.warning("No token provided")
        return None

    try:
        decoded_token = verify_supabase_token(token)
        if not decoded_token:
            logger.warning("Invalid token provided")
            return None

        user_email = decoded_token.get("email")
        if not user_email:
            logger.warning("No email found in token")
            return None

        return user_email
    except Exception as e:
        logger.error(f"Error validating token: {str(e)}")
        return None


def extract_token_from_header(auth_header: Optional[str]) -> Optional[str]:
    """Extract token from Authorization header.

    Args:
        auth_header: Authorization header value (e.g., "Bearer <token>")

    Returns:
        Token string without 'Bearer ' prefix, or None
    """
    if not auth_header:
        return None

    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return auth_header


def get_user_folder(upload_folder: str, username: str) -> str:
    """Get the user's folder path.

    Args:
        upload_folder: Base upload folder path
        username: Username/email

    Returns:
        Full path to user's folder
    """
    return os.path.join(upload_folder, username)


async def verify_and_init_user(token: str) -> Dict[str, Any]:
    """Verify user token and initialize user storage.

    This is the FastAPI-compatible version of verify_user.

    Args:
        token: JWT token string

    Returns:
        Dict with user info or error details

    Raises:
        ValueError: If authentication fails
    """
    # Validate token
    user_email = get_user_from_token(token)
    if not user_email:
        raise ValueError("Invalid or expired token")

    # Create user folder in S3
    try:
        logger.info(f"Creating S3 folder for user {user_email}")
        success = s3_utils.check_and_create_user_folder(user_email)
        if not success:
            logger.error(f"Failed to create S3 folder for user {user_email}")
            raise ValueError("Failed to initialize user storage")
        logger.info(f"Successfully created S3 folder for user {user_email}")
    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Error creating S3 folder for user {user_email}: {str(e)}")
        raise ValueError(f"Error creating user storage: {str(e)}")

    return {
        "message": "User verified successfully",
        "email": user_email,
        "courses": [],
    }
