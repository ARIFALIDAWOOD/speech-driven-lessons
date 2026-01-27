"""
Pytest configuration and fixtures for authentication testing.

This module provides fixtures for generating Supabase tokens programmatically
and managing test environment configuration.
"""

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

from supabase import Client, create_client

# Load test environment variables
test_env_path = Path(__file__).parent.parent / ".env.test"
if test_env_path.exists():
    load_dotenv(test_env_path)
else:
    # Fallback to main .env if .env.test doesn't exist
    load_dotenv()


@pytest.fixture(scope="session")
def supabase_client() -> Client:
    """
    Create a Supabase client for test operations.

    Uses test environment credentials from .env.test or .env.

    Returns:
        Supabase client instance

    Raises:
        ValueError: If required environment variables are not set
    """
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.test or .env"
        )

    return create_client(supabase_url, supabase_key)


@pytest.fixture(scope="session")
def test_user_credentials(supabase_client: Client):
    """
    Create or retrieve a test user for authentication testing.

    This fixture creates a test user with a known email and password
    that can be used to generate tokens for testing.

    Args:
        supabase_client: Supabase client fixture

    Returns:
        Dictionary containing user credentials:
        - email: Test user email
        - password: Test user password
        - user_id: Supabase user ID

    Note:
        The test user is created if it doesn't exist.
        Email format: test-auth-{timestamp}@example.com
    """
    import time

    # Use a consistent test user email
    test_email = "test-auth@example.com"
    test_password = "TestAuth123!"

    try:
        # Try to sign up the test user
        auth_response = supabase_client.auth.sign_up(
            {
                "email": test_email,
                "password": test_password,
            }
        )

        user_id = auth_response.user.id if auth_response.user else None

    except Exception as e:
        # User might already exist, try to sign in instead
        try:
            auth_response = supabase_client.auth.sign_in_with_password(
                {
                    "email": test_email,
                    "password": test_password,
                }
            )
            user_id = auth_response.user.id if auth_response.user else None
        except Exception as sign_in_error:
            pytest.skip(f"Could not create or sign in test user: {sign_in_error}")

    return {
        "email": test_email,
        "password": test_password,
        "user_id": user_id,
    }


@pytest.fixture
def valid_supabase_token(supabase_client: Client, test_user_credentials: dict) -> str:
    """
    Generate a fresh valid Supabase access token for testing.

    This fixture signs in the test user and returns a fresh access token
    that can be used to test authentication logic.

    Args:
        supabase_client: Supabase client fixture
        test_user_credentials: Test user credentials fixture

    Returns:
        Fresh Supabase access token string

    Note:
        Tokens are generated at runtime to avoid hardcoding.
        Tokens expire after 1 hour by default.
    """
    try:
        auth_response = supabase_client.auth.sign_in_with_password(
            {
                "email": test_user_credentials["email"],
                "password": test_user_credentials["password"],
            }
        )

        if not auth_response.session or not auth_response.session.access_token:
            pytest.fail("Failed to generate access token from Supabase")

        return auth_response.session.access_token

    except Exception as e:
        pytest.fail(f"Failed to generate valid token: {e}")


@pytest.fixture
def expired_supabase_token(supabase_client: Client, test_user_credentials: dict) -> str:
    """
    Generate an expired Supabase token for testing expiration handling.

    This fixture creates a token that is already expired by manipulating
    the token's expiration time.

    Args:
        supabase_client: Supabase client fixture
        test_user_credentials: Test user credentials fixture

    Returns:
        Expired Supabase access token string

    Note:
        This fixture manually creates an expired token by setting
        'exp' claim to a past timestamp.
    """
    import time

    import jwt

    # Get a valid token first
    auth_response = supabase_client.auth.sign_in_with_password(
        {
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"],
        }
    )

    if not auth_response.session or not auth_response.session.access_token:
        pytest.fail("Failed to generate access token from Supabase")

    valid_token = auth_response.session.access_token

    # Decode the token to get its payload
    try:
        # Get JWT secret from environment
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret:
            pytest.fail("SUPABASE_JWT_SECRET must be set in .env.test or .env")

        # Decode without verification to get the payload
        payload = jwt.decode(valid_token, options={"verify_signature": False})

        # Set expiration to 1 hour ago
        payload["exp"] = int(time.time()) - 3600

        # Re-encode with the same secret
        expired_token = jwt.encode(payload, jwt_secret, algorithm="HS256")

        return expired_token

    except Exception as e:
        pytest.fail(f"Failed to create expired token: {e}")


@pytest.fixture
def invalid_audience_token(supabase_client: Client, test_user_credentials: dict) -> str:
    """
    Generate a Supabase token with invalid audience for testing audience validation.

    This fixture creates a token with an incorrect 'aud' claim to test
    that the authentication logic properly validates the audience.

    Args:
        supabase_client: Supabase client fixture
        test_user_credentials: Test user credentials fixture

    Returns:
        Supabase token with invalid audience

    Note:
        The expected audience is 'authenticated'. This fixture uses 'invalid'.
    """
    import jwt

    # Get a valid token first
    auth_response = supabase_client.auth.sign_in_with_password(
        {
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"],
        }
    )

    if not auth_response.session or not auth_response.session.access_token:
        pytest.fail("Failed to generate access token from Supabase")

    valid_token = auth_response.session.access_token

    try:
        # Get JWT secret from environment
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret:
            pytest.fail("SUPABASE_JWT_SECRET must be set in .env.test or .env")

        # Decode without verification to get the payload
        payload = jwt.decode(valid_token, options={"verify_signature": False})

        # Change audience to invalid value
        payload["aud"] = "invalid"

        # Re-encode with the same secret
        invalid_token = jwt.encode(payload, jwt_secret, algorithm="HS256")

        return invalid_token

    except Exception as e:
        pytest.fail(f"Failed to create invalid audience token: {e}")


@pytest.fixture
def missing_email_token(supabase_client: Client, test_user_credentials: dict) -> str:
    """
    Generate a Supabase token without email claim for testing email validation.

    This fixture creates a token that is missing the 'email' claim to test
    that the authentication logic properly validates required claims.

    Args:
        supabase_client: Supabase client fixture
        test_user_credentials: Test user credentials fixture

    Returns:
        Supabase token without email claim

    Note:
        This fixture removes the 'email' claim from a valid token.
    """
    import jwt

    # Get a valid token first
    auth_response = supabase_client.auth.sign_in_with_password(
        {
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"],
        }
    )

    if not auth_response.session or not auth_response.session.access_token:
        pytest.fail("Failed to generate access token from Supabase")

    valid_token = auth_response.session.access_token

    try:
        # Get JWT secret from environment
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not jwt_secret:
            pytest.fail("SUPABASE_JWT_SECRET must be set in .env.test or .env")

        # Decode without verification to get the payload
        payload = jwt.decode(valid_token, options={"verify_signature": False})

        # Remove email claim
        if "email" in payload:
            del payload["email"]

        # Re-encode with the same secret
        token_without_email = jwt.encode(payload, jwt_secret, algorithm="HS256")

        return token_without_email

    except Exception as e:
        pytest.fail(f"Failed to create token without email: {e}")


@pytest.fixture
def invalid_signature_token(supabase_client: Client, test_user_credentials: dict) -> str:
    """
    Generate a Supabase token with invalid signature for testing signature validation.

    This fixture creates a token that has a tampered signature to test
    that the authentication logic properly validates JWT signatures.

    Args:
        supabase_client: Supabase client fixture
        test_user_credentials: Test user credentials fixture

    Returns:
        Supabase token with invalid signature

    Note:
        This fixture changes one byte in the signature to make it invalid.
    """
    import jwt

    # Get a valid token first
    auth_response = supabase_client.auth.sign_in_with_password(
        {
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"],
        }
    )

    if not auth_response.session or not auth_response.session.access_token:
        pytest.fail("Failed to generate access token from Supabase")

    valid_token = auth_response.session.access_token

    try:
        # Tamper with the token signature
        # The token has 3 parts: header.payload.signature
        parts = valid_token.split(".")

        if len(parts) != 3:
            pytest.fail("Invalid token format")

        # Corrupt the signature by changing one character
        corrupted_signature = parts[2][:-1] + ("X" if parts[2][-1] != "X" else "Y")

        # Reassemble with corrupted signature
        invalid_token = f"{parts[0]}.{parts[1]}.{corrupted_signature}"

        return invalid_token

    except Exception as e:
        pytest.fail(f"Failed to create invalid signature token: {e}")


@pytest.fixture
def auth_headers_valid(valid_supabase_token: str) -> dict:
    """
    Create HTTP headers with a valid authentication token.

    Args:
        valid_supabase_token: Valid token fixture

    Returns:
        Dictionary containing Authorization header with valid token
    """
    return {"Authorization": f"Bearer {valid_supabase_token}"}


@pytest.fixture
def auth_headers_expired(expired_supabase_token: str) -> dict:
    """
    Create HTTP headers with an expired authentication token.

    Args:
        expired_supabase_token: Expired token fixture

    Returns:
        Dictionary containing Authorization header with expired token
    """
    return {"Authorization": f"Bearer {expired_supabase_token}"}


@pytest.fixture
def auth_headers_invalid_audience(invalid_audience_token: str) -> dict:
    """
    Create HTTP headers with a token with invalid audience.

    Args:
        invalid_audience_token: Invalid audience token fixture

    Returns:
        Dictionary containing Authorization header with invalid audience token
    """
    return {"Authorization": f"Bearer {invalid_audience_token}"}


@pytest.fixture
def auth_headers_missing_email(missing_email_token: str) -> dict:
    """
    Create HTTP headers with a token missing email claim.

    Args:
        missing_email_token: Token without email fixture

    Returns:
        Dictionary containing Authorization header with token missing email
    """
    return {"Authorization": f"Bearer {missing_email_token}"}


@pytest.fixture
def auth_headers_invalid_signature(invalid_signature_token: str) -> dict:
    """
    Create HTTP headers with a token with invalid signature.

    Args:
        invalid_signature_token: Invalid signature token fixture

    Returns:
        Dictionary containing Authorization header with invalid signature token
    """
    return {"Authorization": f"Bearer {invalid_signature_token}"}


@pytest.fixture
def test_client():
    """
    Create a FastAPI TestClient for integration testing.

    This fixture initializes the backend FastAPI application
    for testing API endpoints with authentication.

    Returns:
        FastAPI TestClient instance
    """
    import sys
    from pathlib import Path

    from fastapi.testclient import TestClient

    # Add backend directory to Python path
    backend_dir = Path(__file__).parent.parent
    sys.path.insert(0, str(backend_dir))

    try:
        # Import the Flask/FastAPI app
        from app import app

        return TestClient(app)
    except ImportError as e:
        pytest.skip(f"Could not import backend app: {e}")
