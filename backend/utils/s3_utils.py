"""
Supabase Storage Utilities Module

This module provides all storage operations for the application, including:
- File upload/download (text, binary, JSON)
- Folder listing and deletion
- User data management

Migrated from AWS S3 to Supabase Storage.
Note: FAISS vector index storage has been migrated to Supabase vector store (pgvector).
See utils/vector_utils.py for vector operations.
"""

import io
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from dotenv import load_dotenv

from supabase import Client, create_client

# Load environment variables before accessing them
# Check for .env.local first (preferred), then .env
env_local = Path(__file__).parent.parent / ".env.local"
env_file = Path(__file__).parent.parent / ".env"
if env_local.exists():
    load_dotenv(env_local)
else:
    load_dotenv(env_file)

# Configure logging
logger = logging.getLogger(__name__)

# FAISS imports removed - vector storage now uses Supabase pgvector
# FAISS is still used for in-memory operations in materials_context.py
# but persistent storage uses Supabase vector store (see utils/vector_utils.py)

# ============================================================================
# CONFIGURATION
# ============================================================================

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME", "anantra-lms-store")

# Legacy constant for backwards compatibility (aliased)
S3_BUCKET_NAME = SUPABASE_BUCKET_NAME


# Validate required environment variables at module load
def _validate_env_vars():
    """Validate that required Supabase environment variables are set."""
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_ROLE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")

    if missing:
        error_msg = f"Missing required environment variables: {', '.join(missing)}"
        logger.error(error_msg)
        raise EnvironmentError(error_msg)


_validate_env_vars()

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    storage = supabase.storage
    logger.info(f"Supabase client initialized for bucket: {SUPABASE_BUCKET_NAME}")
except Exception as e:
    logger.error(f"Failed to initialize Supabase client: {e}")
    raise

# ============================================================================
# PATH HELPER FUNCTIONS (Unchanged from S3 version)
# ============================================================================


def get_user_s3_folder(username: str) -> str:
    """Get the storage folder for a user."""
    return f"user_data/{username}/"


def get_course_s3_folder(username: str, coursename: str) -> str:
    """Get the storage folder for a course."""
    return f"user_data/{username}/{coursename}/"


def get_s3_file_path(username: str, coursename: str, filename: str) -> str:
    """Get the storage path for a course file."""
    return f"user_data/{username}/{coursename}/{filename}"


def get_s3_course_materials_path(username: str, course_id: str, filename: str) -> str:
    """Get the storage path for course materials."""
    return f"user_data/{username}/{course_id}/course_materials/{filename}"


def get_reverse_mapping_s3_path() -> str:
    """Returns the storage key for the assistant reverse lookup table."""
    return "user_data/assistant_reverse_mapping.json"


def get_assistant_s3_path(username: str) -> str:
    """Returns the storage key for a user's assistant data."""
    return f"user_data/{username}/assistant.json"


# ============================================================================
# CORE FILE OPERATIONS
# ============================================================================


def upload_file_to_s3(file, bucket_name: str, s3_key: str) -> bool:
    """
    Upload a file to Supabase Storage.

    Args:
        file: File object (Flask FileStorage or file-like object)
        bucket_name: Name of the storage bucket
        s3_key: Path/key under which the file will be stored

    Returns:
        True if successful, False otherwise
    """
    try:
        # Read file content
        if hasattr(file, "read"):
            content = file.read()
            # Reset file pointer if possible (for Flask FileStorage)
            if hasattr(file, "seek"):
                file.seek(0)
        else:
            content = file

        # Determine content type
        content_type = getattr(file, "content_type", "application/octet-stream")

        # Upload to Supabase Storage
        response = storage.from_(bucket_name).upload(
            path=s3_key, file=content, file_options={"content-type": content_type, "upsert": "true"}
        )

        logger.info(f"File uploaded successfully to {bucket_name}/{s3_key}")
        return True

    except Exception as e:
        logger.error(f"Error uploading file to {bucket_name}/{s3_key}: {e}")
        return False


def read_text_file_from_s3(bucket_name: str, key: str) -> Optional[str]:
    """
    Read contents of a text file from Supabase Storage.

    Args:
        bucket_name: Name of the storage bucket
        key: Full path to the file

    Returns:
        File content as string or None on error
    """
    try:
        response = storage.from_(bucket_name).download(key)
        return response.decode("utf-8")
    except Exception as e:
        logger.error(f"Error reading text file {key}: {e}")
        return None


def read_binary_from_s3(bucket_name: str, key: str) -> Optional[bytes]:
    """
    Read binary data from Supabase Storage.

    Args:
        bucket_name: Name of the storage bucket
        key: Full path to the file

    Returns:
        File content as bytes or None on error
    """
    try:
        response = storage.from_(bucket_name).download(key)
        return response
    except Exception as e:
        logger.error(f"Error reading binary from {bucket_name}/{key}: {e}")
        return None


def get_json_from_s3(bucket_name: str, key: str) -> Optional[Dict[str, Any]]:
    """
    Read JSON data from Supabase Storage.

    Args:
        bucket_name: Name of the storage bucket
        key: Full path to the JSON file

    Returns:
        Parsed JSON data or None on error
    """
    try:
        response = storage.from_(bucket_name).download(key)
        return json.loads(response.decode("utf-8"))
    except Exception as e:
        logger.error(f"Error reading JSON from {bucket_name}/{key}: {e}")
        return None


def upload_json_to_s3(json_data: Union[Dict, List], bucket_name: str, s3_key: str) -> bool:
    """
    Upload a JSON object to Supabase Storage.

    Args:
        json_data: JSON-serializable data
        bucket_name: Name of the storage bucket
        s3_key: Path/key under which the JSON will be stored

    Returns:
        True if successful, False otherwise
    """
    try:
        json_string = json.dumps(json_data, indent=4)
        json_bytes = json_string.encode("utf-8")

        response = storage.from_(bucket_name).upload(
            path=s3_key,
            file=json_bytes,
            file_options={"content-type": "application/json", "upsert": "true"},
        )

        logger.info(f"JSON uploaded successfully to {bucket_name}/{s3_key}")
        return True

    except Exception as e:
        logger.error(f"Error uploading JSON to {bucket_name}/{s3_key}: {e}")
        return False


def upload_faiss_index_to_s3(index, bucket_name: str, s3_key: str) -> bool:
    """
    [DEPRECATED] Upload a FAISS index to Supabase Storage.

    This function is deprecated. Vector storage now uses Supabase's native pgvector
    extension via utils/vector_utils.py. This function is kept for backward compatibility
    during migration but should not be used for new code.

    Args:
        index: FAISS index object
        bucket_name: Name of the storage bucket
        s3_key: Path/key under which the index will be stored

    Returns:
        True if successful, False otherwise
    """
    logger.warning(
        "upload_faiss_index_to_s3 is deprecated. Use utils.vector_utils.store_course_embeddings() instead."
    )

    try:
        import faiss
        import numpy as np

        # Serialize the FAISS index to memory
        index_binary = faiss.serialize_index(index)
        index_bytes = index_binary.tobytes()

        response = storage.from_(bucket_name).upload(
            path=s3_key,
            file=index_bytes,
            file_options={"content-type": "application/octet-stream", "upsert": "true"},
        )

        logger.info(
            f"FAISS index uploaded successfully to {bucket_name}/{s3_key} (deprecated method)"
        )
        return True

    except ImportError:
        logger.error("FAISS is not available. Cannot upload FAISS index.")
        return False
    except Exception as e:
        logger.error(f"Error uploading FAISS index to {bucket_name}/{s3_key}: {e}")
        return False


def delete_file_from_s3(bucket_name: str, s3_key: str) -> bool:
    """
    Delete a file from Supabase Storage.

    Args:
        bucket_name: Name of the storage bucket
        s3_key: Path/key of the file to delete

    Returns:
        True if successful, False otherwise
    """
    try:
        response = storage.from_(bucket_name).remove([s3_key])
        logger.info(f"File deleted successfully from {bucket_name}/{s3_key}")
        return True
    except Exception as e:
        logger.error(f"Error deleting file from {bucket_name}/{s3_key}: {e}")
        return False


def delete_folder_from_s3(bucket_name: str, s3_key: str) -> bool:
    """
    Delete a folder and all its contents from Supabase Storage.

    Args:
        bucket_name: Name of the storage bucket
        s3_key: Path/key of the folder to delete (with trailing slash)

    Returns:
        True if successful, False otherwise
    """
    try:
        # Ensure prefix ends with /
        prefix = s3_key if s3_key.endswith("/") else s3_key + "/"

        # List all files in the folder
        files = list_objects_in_folder(bucket_name, prefix)

        if not files:
            logger.info(f"No files found in {bucket_name}/{prefix}")
            return True

        # Extract file paths
        file_paths = [
            obj.get("Key", obj.get("name", ""))
            for obj in files
            if obj.get("Key") or obj.get("name")
        ]

        if file_paths:
            # Batch delete all files
            response = storage.from_(bucket_name).remove(file_paths)
            logger.info(
                f"Folder deleted successfully from {bucket_name}/{s3_key} ({len(file_paths)} files)"
            )

        return True

    except Exception as e:
        logger.error(f"Error deleting folder from {bucket_name}/{s3_key}: {e}")
        return False


def list_objects_in_folder(bucket_name: str, prefix: str) -> List[Dict[str, Any]]:
    """
    List all objects in a storage folder/path.

    Args:
        bucket_name: Name of the storage bucket
        prefix: Folder path prefix to list objects from

    Returns:
        List of object dictionaries or empty list on error
    """
    try:
        # Normalize prefix - remove leading slash if present
        prefix = prefix.lstrip("/")

        # Split prefix into folder and remaining path
        parts = prefix.rstrip("/").rsplit("/", 1)
        folder = parts[0] if len(parts) > 0 else ""

        # List files in the folder
        response = storage.from_(bucket_name).list(folder)

        # Add full path to each object for compatibility
        for obj in response:
            if "name" in obj:
                obj["Key"] = f"{folder}/{obj['name']}" if folder else obj["name"]

        return response

    except Exception as e:
        logger.error(f"Error listing objects in {bucket_name}/{prefix}: {e}")
        return []


def list_files_in_prefix(bucket: str, prefix: str, file_extension: str = None) -> List[str]:
    """
    List files in storage prefix with optional extension filter.

    Args:
        bucket: Name of the storage bucket
        prefix: Folder path prefix
        file_extension: Optional file extension filter (e.g., 'txt', 'json')

    Returns:
        List of file paths
    """
    try:
        objects = list_objects_in_folder(bucket, prefix)
        file_paths = [obj.get("Key", obj.get("name", "")) for obj in objects]

        # Filter by extension if specified
        if file_extension:
            ext = file_extension.lower().lstrip(".")
            file_paths = [f for f in file_paths if f.lower().endswith(f".{ext}")]

        return file_paths

    except Exception as e:
        logger.error(f"Error listing files in {bucket}/{prefix}: {e}")
        return []


def list_user_course_ids(user_email: str) -> List[str]:
    """
    List course ID subdirectories within a user's storage folder.

    Args:
        user_email: User's email address

    Returns:
        List of course IDs
    """
    user_folder = get_user_s3_folder(user_email).rstrip("/")
    course_ids = []

    try:
        # List items in user folder
        response = storage.from_(SUPABASE_BUCKET_NAME).list(user_folder)

        for item in response:
            name = item.get("name", "")
            # Check if it's a folder (has metadata indicating folder or no file extension)
            # In Supabase, folders are indicated by the id being null or by name convention
            if name and name != user_email and "." not in name:
                # This is likely a course folder
                course_ids.append(name)

        logger.info(f"Found course IDs for {user_email}: {course_ids}")
        return course_ids

    except Exception as e:
        logger.error(f"Could not list course IDs for {user_email}: {e}")
        return []


def download_file_from_s3(bucket: str, s3_key: str, local_path: str) -> bool:
    """
    Download a file from Supabase Storage to local path.

    Args:
        bucket: Name of the storage bucket
        s3_key: Path/key of the file in storage
        local_path: Local file path to save to

    Returns:
        True if successful, False otherwise
    """
    try:
        # Create directory structure if needed
        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        # Download file
        content = storage.from_(bucket).download(s3_key)

        # Write to local file
        with open(local_path, "wb") as f:
            f.write(content)

        logger.info(f"Successfully downloaded {s3_key} to {local_path}")
        return True

    except Exception as e:
        logger.error(f"Error downloading {s3_key}: {e}")
        return False


def upload_directory_to_s3(local_path: str, bucket: str, s3_prefix: str) -> bool:
    """
    Upload an entire directory to Supabase Storage.

    Args:
        local_path: Path to the local directory
        bucket: Name of the storage bucket
        s3_prefix: Prefix to use for storage paths (folder path)

    Returns:
        True if successful, False otherwise
    """
    try:
        # Ensure prefix ends with /
        if not s3_prefix.endswith("/"):
            s3_prefix += "/"

        # Walk through directory
        for root, dirs, files in os.walk(local_path):
            for file in files:
                local_file_path = os.path.join(root, file)

                # Calculate relative path
                rel_path = os.path.relpath(local_file_path, local_path)

                # Create storage key
                s3_key = f"{s3_prefix}{rel_path.replace(os.sep, '/')}"

                # Determine content type
                if file.endswith(".json"):
                    content_type = "application/json"
                elif file.endswith(".png"):
                    content_type = "image/png"
                elif file.endswith(".jpg") or file.endswith(".jpeg"):
                    content_type = "image/jpeg"
                else:
                    content_type = "application/octet-stream"

                # Upload file
                with open(local_file_path, "rb") as f:
                    content = f.read()
                    storage.from_(bucket).upload(
                        path=s3_key,
                        file=content,
                        file_options={"content-type": content_type, "upsert": "true"},
                    )

                logger.info(f"Uploaded {local_file_path} to {bucket}/{s3_key}")

        return True

    except Exception as e:
        logger.error(f"Error uploading directory to storage: {e}")
        return False


# ============================================================================
# USER & COURSE DATA FUNCTIONS
# ============================================================================


def get_s3_user_courses_info(username: str) -> List[Dict[str, Any]]:
    """
    Get the course information for a user from storage.

    Args:
        username: Username of the user

    Returns:
        List of course information dictionaries
    """
    try:
        user_folder = get_user_s3_folder(username)
        courses_info = []

        # List all items in user folder
        items = storage.from_(SUPABASE_BUCKET_NAME).list(user_folder.rstrip("/"))

        for item in items:
            name = item.get("name", "")
            # Check if this is a course folder (not a file)
            if name and "." not in name:
                # Try to get course_info.json
                course_info_key = f"{user_folder}{name}/course_info.json"
                course_info = get_json_from_s3(SUPABASE_BUCKET_NAME, course_info_key)
                if course_info:
                    courses_info.append(course_info)

        logger.info(f"User courses info from storage: {courses_info}")
        return courses_info

    except Exception as e:
        logger.error(f"Error getting user courses info: {e}")
        return []


def check_and_create_user_folder(user_email: str) -> bool:
    """
    Check if user folder exists and create user_info.json if needed.

    Note: Supabase Storage doesn't need explicit folder creation.
    Folders are created implicitly when files are uploaded.

    Args:
        user_email: User's email address

    Returns:
        True if successful, False otherwise
    """
    try:
        user_folder_key = f"user_data/{user_email}/"
        user_info_key = f"{user_folder_key}user_info.json"

        # Try to get existing user_info.json
        existing_info = get_json_from_s3(SUPABASE_BUCKET_NAME, user_info_key)

        if existing_info:
            # Remove obsolete 'courses' field if present
            if "courses" in existing_info:
                del existing_info["courses"]
                existing_info["email"] = user_email
                existing_info["updated_at"] = datetime.now().isoformat()
                upload_json_to_s3(existing_info, SUPABASE_BUCKET_NAME, user_info_key)
                logger.info(f"Updated existing user_info.json for {user_email}")
            return True

        # Create new user_info.json
        user_info_content = {"email": user_email, "created_at": datetime.now().isoformat()}

        success = upload_json_to_s3(user_info_content, SUPABASE_BUCKET_NAME, user_info_key)
        if success:
            logger.info(f"Created new user_info.json for {user_email}")
        return success

    except Exception as e:
        logger.error(f"Failed checking/creating user folder for {user_email}: {e}")
        return False


# ============================================================================
# ASSISTANT DATA FUNCTIONS
# ============================================================================


def load_user_assistant_from_s3(username: str) -> Dict[str, Any]:
    """
    Load the user's assistant info from storage.

    Args:
        username: Username of the user

    Returns:
        Assistant data dict or empty dict if not found
    """
    s3_key = get_assistant_s3_path(username)
    try:
        data = get_json_from_s3(SUPABASE_BUCKET_NAME, s3_key)
        return data if data else {}
    except Exception as e:
        logger.error(f"Error loading assistant for {username}: {e}")
        return {}


def save_user_assistant_to_s3(username: str, course_id: str, data: Dict[str, Any]) -> None:
    """
    Save a user's assistant info to storage and update reverse lookup table.

    Args:
        username: Username of the user
        course_id: Course ID associated with the assistant
        data: Assistant data to save
    """
    try:
        # 1) Save user's assistant info
        user_s3_key = get_assistant_s3_path(username)
        upload_json_to_s3(data, SUPABASE_BUCKET_NAME, user_s3_key)

        # 2) Load and update reverse lookup table
        reverse_s3_key = get_reverse_mapping_s3_path()
        reverse_mapping = get_json_from_s3(SUPABASE_BUCKET_NAME, reverse_s3_key) or {}

        # 3) Remove old assistant_id for this user
        old_id_to_remove = None
        for existing_id, info in reverse_mapping.items():
            if info.get("username") == username:
                old_id_to_remove = existing_id
                break

        if old_id_to_remove:
            reverse_mapping.pop(old_id_to_remove, None)

        # 4) Add new assistant_id if present
        if "assistant_id" in data:
            reverse_mapping[data["assistant_id"]] = {"username": username, "course_id": course_id}

        # 5) Save updated reverse lookup table
        upload_json_to_s3(reverse_mapping, SUPABASE_BUCKET_NAME, reverse_s3_key)

    except Exception as e:
        logger.error(f"Error saving assistant to storage: {e}")


def load_assistant_user_from_s3(assistant_id: str) -> Optional[Dict[str, Any]]:
    """
    Given an assistant ID, find the associated username and course ID.

    Args:
        assistant_id: The assistant ID to look up

    Returns:
        Dict with 'username' and 'course_id' or None if not found
    """
    try:
        reverse_s3_key = get_reverse_mapping_s3_path()
        reverse_mapping = get_json_from_s3(SUPABASE_BUCKET_NAME, reverse_s3_key)

        if reverse_mapping:
            return reverse_mapping.get(assistant_id)
        return None

    except Exception as e:
        logger.error(f"Error retrieving user from assistant ID: {e}")
        return None


def get_assistant_last_position(username: str, course_id: str) -> int:
    """
    Get the last position where an assistant was explaining for a course.

    Args:
        username: Username of the user
        course_id: Course ID

    Returns:
        Last position number or 0 if not found
    """
    try:
        s3_path = get_s3_file_path(username, course_id, "assistant_position.json")
        position_data = get_json_from_s3(SUPABASE_BUCKET_NAME, s3_path)

        if position_data:
            return position_data.get("last_position", 0)
        return 0

    except Exception as e:
        logger.error(f"Error getting assistant last position: {e}")
        return 0


# ============================================================================
# LEGACY COMPATIBILITY EXPORTS
# ============================================================================

# Export ACCESS_KEY and SECRET_KEY as None for backwards compatibility
# These are no longer needed but some files might import them
ACCESS_KEY = None
SECRET_KEY = None
REGION_NAME = None
