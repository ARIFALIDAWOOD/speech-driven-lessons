import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from jose import JWTError, jwt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables - match the pattern from app.py
# Check for .env.local first (preferred), then .env
_env_local = Path(__file__).parent.parent / ".env.local"
_env_file = Path(__file__).parent.parent / ".env"
if _env_local.exists():
    load_dotenv(_env_local)
else:
    load_dotenv(_env_file)

# Supabase JWT configuration
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_URL = os.getenv("SUPABASE_URL")


def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify a Supabase JWT token and return the decoded payload.

    Args:
        token: The JWT token to verify (with or without 'Bearer ' prefix)

    Returns:
        Decoded token payload with 'email' field if valid, None if invalid
    """
    try:
        if not token:
            logger.warning("No token provided")
            return None

        # Remove 'Bearer ' prefix if present
        if token.startswith("Bearer "):
            token = token[7:]

        if not SUPABASE_JWT_SECRET:
            logger.error("SUPABASE_JWT_SECRET environment variable is not set")
            return None

        # Try to decode token header to see what algorithm is being used
        try:
            unverified_header = jwt.get_unverified_header(token)
            token_algorithm = unverified_header.get("alg", "unknown")
            logger.info(f"Token algorithm from header: {token_algorithm}")
        except Exception as e:
            logger.warning(f"Could not decode token header: {str(e)}")

        # Decode and verify the JWT
        # Supabase local dev with jwt_secret uses HS256
        # Allow both HS256 and RS256 for compatibility
        # Note: If RS256 is used, we may need the public key instead of secret
        decoded_token = jwt.decode(
            token, SUPABASE_JWT_SECRET, algorithms=["HS256", "RS256"], audience="authenticated"
        )

        # Check if token has email
        email = decoded_token.get("email")
        if not email:
            logger.warning("No email found in token")
            return None

        logger.info(f"Token verified successfully for user: {email}")
        return decoded_token

    except JWTError as e:
        logger.error(f"JWT verification error: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error in verify_supabase_token: {str(e)}")
        return None


def get_user_email_from_token(token: str) -> Optional[str]:
    """
    Convenience function to extract just the email from a Supabase JWT token.

    Args:
        token: The JWT token to verify

    Returns:
        User email if valid, None if invalid
    """
    decoded_token = verify_supabase_token(token)
    if decoded_token:
        return decoded_token.get("email")
    return None
