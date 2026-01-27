"""Authentication handler for Robyn using Supabase."""

import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from robyn import Request
from robyn.authentication import AuthenticationHandler, BearerGetter, Identity
from supabase import Client, create_client

logger = logging.getLogger(__name__)

# Load environment variables
_env_local = Path(__file__).parent.parent / ".env.local"
_env_file = Path(__file__).parent.parent / ".env"
if _env_local.exists():
    load_dotenv(_env_local)
else:
    load_dotenv(_env_file)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError(
        "SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables"
    )

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)


class SupabaseAuthHandler(AuthenticationHandler):
    """Authentication handler that validates Supabase JWT tokens."""

    def authenticate(self, request: Request) -> Optional[Identity]:
        """
        Authenticate the request using Supabase JWT token.

        Args:
            request: The incoming HTTP request

        Returns:
            Identity object with user claims if authenticated, None otherwise
        """
        token = self.token_getter.get_token(request)

        if not token:
            logger.warning("No token provided")
            return None

        try:
            # Use Supabase client to validate token and get user
            user_response = supabase_client.auth.get_user(token)

            if not user_response.user:
                logger.warning("User not found for token")
                return None

            user = user_response.user

            # Return Identity with user claims
            # Note: all claim values must be strings in Robyn
            return Identity(
                claims={
                    "id": user.id,
                    "email": user.email or "",
                }
            )

        except Exception as e:
            logger.error(f"Authentication error: {str(e)}")
            return None


def get_auth_handler() -> SupabaseAuthHandler:
    """Get the configured Supabase authentication handler."""
    return SupabaseAuthHandler(token_getter=BearerGetter())


def get_user_from_request(request: Request) -> Optional[Dict[str, Any]]:
    """
    Extract user information from an authenticated request.

    This is a helper function for routes that need user info
    but don't use auth_required=True.

    Args:
        request: The HTTP request object

    Returns:
        Dict with user info or None if not authenticated
    """
    if hasattr(request, "identity") and request.identity:
        # Return claims dict directly (contains id and email)
        return dict(request.identity.claims)
    return None


def require_auth(request: Request) -> Dict[str, Any]:
    """
    Require authentication for a request.

    Use this in route handlers to get user info and raise an error if not authenticated.

    Args:
        request: The HTTP request object

    Returns:
        Dict with user info

    Raises:
        ValueError: If the request is not authenticated
    """
    user = get_user_from_request(request)
    if not user:
        raise ValueError("Authentication required")
    return user


async def refresh_access_token(refresh_token: str) -> Optional[Dict[str, Any]]:
    """
    Exchange a refresh token for new access and refresh tokens.

    Args:
        refresh_token: The Supabase refresh token

    Returns:
        Dict with new access_token, refresh_token, and expires_at, or None on failure
    """
    try:
        response = supabase_client.auth.refresh_session(refresh_token)

        if not response.session:
            logger.warning("Failed to refresh session - no session returned")
            return None

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "expires_at": response.session.expires_at,
            "expires_in": response.session.expires_in,
        }

    except Exception as e:
        logger.error(f"Error refreshing token: {str(e)}")
        return None
