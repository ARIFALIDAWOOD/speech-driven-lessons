# AWS S3 to Supabase Storage Migration - Enhanced Plan

## Executive Summary

This enhanced plan addresses critical gaps identified in the original migration plan, including:
- Missing `user_files_utils.py` refactoring (standalone boto3 client) — *file was later removed as dead code*
- Incomplete error handling for Supabase-specific exceptions
- Missing pagination handling differences between S3 and Supabase
- No consideration for synchronous vs asynchronous client usage
- Missing environment variable validation on startup
- No local development setup for Supabase (Docker/self-hosted)
- Missing README documentation for Supabase configuration

---

## Current State Analysis (Enhanced)

### Files Requiring Changes

| File | Change Type | Complexity | Notes |
|------|-------------|------------|-------|
| `backend/utils/s3_utils.py` | Complete Rewrite | High | 615 lines, 30+ functions |
| `backend/utils/load_and_process_index.py` | Moderate | Medium | Direct boto3 usage lines 34-49 |
| `backend/user_files_utils.py` | Complete Rewrite | Low | **MISSING FROM ORIGINAL PLAN** - Standalone boto3 client; *later removed as dead code* |
| `backend/.env.example` | Update | Low | Add Supabase credentials |
| `backend/api/in_class.py` | Update | Low | Hardcoded bucket name line 13 |
| `backend/api/assistant.py` | Update | Low | Hardcoded bucket name line 13 |
| `backend/functions/slides_navigation.py` | Update | Low | Hardcoded bucket name line 12 |

### Files Importing s3_utils (18 files - no changes needed after refactor)

These files will work automatically after `s3_utils.py` is refactored:
- `backend/utils/user_utils.py`
- `backend/utils/course_manager.py`
- `backend/routes/delete_course_routes.py`
- `backend/routes/delete_routes.py`
- `backend/routes/upload_routes.py`
- `backend/routes/course_info_routes.py`
- `backend/routes/customize_routes.py`
- `backend/routes/course_generation_routes.py`
- `backend/functions/get_detailed_content.py`
- `backend/app.py`
- `backend/api/webhook.py`
- `backend/api/course_generation.py`
- `backend/api/course.py`

---

## Implementation Plan (Enhanced)

### Phase 1: Environment & Dependencies Setup

#### 1.1 Update Requirements

**File: `backend/requirements.txt`** (Create if not exists)

```txt
# Core Framework
flask>=2.3.0
flask-cors>=4.0.0
flask-socketio>=5.3.0

# Supabase (replaces boto3)
supabase>=2.0.0

# Keep boto3 temporarily for migration script (optional)
# boto3>=1.28.0

# AI/ML
openai>=1.0.0
tiktoken>=0.5.0
google-generativeai>=0.3.0

# Vector Store (optional)
# faiss-cpu>=1.7.0
numpy>=1.24.0

# Firebase Auth
firebase-admin>=6.2.0

# Voice
vapi-python>=0.1.0

# Utilities
python-dotenv>=1.0.0
redis>=5.0.0
```

#### 1.2 Environment Variables

**File: `backend/.env.example`** (Updated)

```env
# ============================================================================
# Speech-Driven Lessons - Backend Environment Variables Example
# ============================================================================
# Copy this file to backend/.env and fill in your actual values

# ============================================================================
# FLASK APPLICATION
# ============================================================================
FLASK_SECRET_KEY=supersecretkey

# ============================================================================
# SUPABASE STORAGE (Required for file storage)
# ============================================================================
# Get these from Supabase Dashboard -> Project Settings -> API
# SUPABASE_URL: The URL of your Supabase project (e.g., https://xxxxx.supabase.co)
# SUPABASE_SERVICE_ROLE_KEY: The service role key (NOT the anon key)
# SUPABASE_BUCKET_NAME: The storage bucket name (create in Supabase Dashboard -> Storage)

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_BUCKET_NAME=anantra-lms-store

# ============================================================================
# [DEPRECATED] AWS S3 STORAGE - Keep for migration script only
# ============================================================================
# AWS_ACCESS_KEY_ID=your_aws_access_key_id
# AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

# ============================================================================
# FIREBASE AUTHENTICATION (Required for user auth)
# ============================================================================
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_firebase_client_id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com

# ============================================================================
# OPENAI API (Required for AI features)
# ============================================================================
OPENAI_API_KEY=sk-your_openai_api_key_here

# ============================================================================
# VAPI - VOICE AI PLATFORM (Required for voice features)
# ============================================================================
VAPI_KEY=your_vapi_api_key_here

# ============================================================================
# REDIS CONFIGURATION (Optional - defaults to localhost:6379)
# ============================================================================
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_DB=0
```

---

### Phase 2: Core Storage Module Refactor

#### 2.1 Complete s3_utils.py Rewrite

**File: `backend/utils/s3_utils.py`** (Complete Implementation)

```python
"""
Supabase Storage Utilities Module

This module provides all storage operations for the application, including:
- File upload/download (text, binary, JSON)
- FAISS vector index storage
- Folder listing and deletion
- User data management

Migrated from AWS S3 to Supabase Storage.
"""

import json
import io
import os
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any, Union

from supabase import create_client, Client
from supabase.lib.client_options import ClientOptions

# Configure logging
logger = logging.getLogger(__name__)

# Try to import faiss, make it optional
try:
    import faiss
    import numpy as np
    FAISS_AVAILABLE = True
except ImportError:
    logger.warning("FAISS not available. Vector index functionality will be disabled.")
    FAISS_AVAILABLE = False
    faiss = None
    np = None

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
        if hasattr(file, 'read'):
            content = file.read()
            # Reset file pointer if possible (for Flask FileStorage)
            if hasattr(file, 'seek'):
                file.seek(0)
        else:
            content = file

        # Determine content type
        content_type = getattr(file, 'content_type', 'application/octet-stream')

        # Upload to Supabase Storage
        response = storage.from_(bucket_name).upload(
            path=s3_key,
            file=content,
            file_options={"content-type": content_type, "upsert": "true"}
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
        return response.decode('utf-8')
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
        return json.loads(response.decode('utf-8'))
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
        json_bytes = json_string.encode('utf-8')

        response = storage.from_(bucket_name).upload(
            path=s3_key,
            file=json_bytes,
            file_options={"content-type": "application/json", "upsert": "true"}
        )

        logger.info(f"JSON uploaded successfully to {bucket_name}/{s3_key}")
        return True

    except Exception as e:
        logger.error(f"Error uploading JSON to {bucket_name}/{s3_key}: {e}")
        return False


def upload_faiss_index_to_s3(index, bucket_name: str, s3_key: str) -> bool:
    """
    Upload a FAISS index to Supabase Storage.

    Args:
        index: FAISS index object
        bucket_name: Name of the storage bucket
        s3_key: Path/key under which the index will be stored

    Returns:
        True if successful, False otherwise
    """
    if not FAISS_AVAILABLE:
        logger.error("FAISS is not available. Cannot upload FAISS index.")
        return False

    try:
        # Serialize the FAISS index to memory
        index_binary = faiss.serialize_index(index)
        index_bytes = index_binary.tobytes()

        response = storage.from_(bucket_name).upload(
            path=s3_key,
            file=index_bytes,
            file_options={"content-type": "application/octet-stream", "upsert": "true"}
        )

        logger.info(f"FAISS index uploaded successfully to {bucket_name}/{s3_key}")
        return True

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
        prefix = s3_key if s3_key.endswith('/') else s3_key + '/'

        # List all files in the folder
        files = list_objects_in_folder(bucket_name, prefix)

        if not files:
            logger.info(f"No files found in {bucket_name}/{prefix}")
            return True

        # Extract file paths
        file_paths = [obj['name'] for obj in files if 'name' in obj]

        if file_paths:
            # Batch delete all files
            response = storage.from_(bucket_name).remove(file_paths)
            logger.info(f"Folder deleted successfully from {bucket_name}/{s3_key} ({len(file_paths)} files)")

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
        prefix = prefix.lstrip('/')

        # Split prefix into folder and remaining path
        parts = prefix.rstrip('/').rsplit('/', 1)
        folder = parts[0] if len(parts) > 1 else ''

        # List files in the folder
        response = storage.from_(bucket_name).list(folder)

        # If prefix has more specificity, filter results
        if len(parts) > 1:
            search_prefix = parts[1]
            response = [obj for obj in response if obj.get('name', '').startswith(search_prefix)]

        # Add full path to each object for compatibility
        for obj in response:
            if 'name' in obj:
                obj['Key'] = f"{folder}/{obj['name']}" if folder else obj['name']

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
        file_paths = [obj.get('Key', obj.get('name', '')) for obj in objects]

        # Filter by extension if specified
        if file_extension:
            ext = file_extension.lower().lstrip('.')
            file_paths = [f for f in file_paths if f.lower().endswith(f'.{ext}')]

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
    user_folder = get_user_s3_folder(user_email).rstrip('/')
    course_ids = []

    try:
        # List items in user folder
        response = storage.from_(SUPABASE_BUCKET_NAME).list(user_folder)

        for item in response:
            name = item.get('name', '')
            # Check if it's a folder (has metadata indicating folder or no file extension)
            # In Supabase, folders are indicated by the id being null or by name convention
            if name and name != user_email and '.' not in name:
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
        with open(local_path, 'wb') as f:
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
        if not s3_prefix.endswith('/'):
            s3_prefix += '/'

        # Walk through directory
        for root, dirs, files in os.walk(local_path):
            for file in files:
                local_file_path = os.path.join(root, file)

                # Calculate relative path
                rel_path = os.path.relpath(local_file_path, local_path)

                # Create storage key
                s3_key = f"{s3_prefix}{rel_path.replace(os.sep, '/')}"

                # Determine content type
                if file.endswith('.json'):
                    content_type = 'application/json'
                elif file.endswith('.png'):
                    content_type = 'image/png'
                elif file.endswith('.jpg') or file.endswith('.jpeg'):
                    content_type = 'image/jpeg'
                else:
                    content_type = 'application/octet-stream'

                # Upload file
                with open(local_file_path, 'rb') as f:
                    content = f.read()
                    storage.from_(bucket).upload(
                        path=s3_key,
                        file=content,
                        file_options={"content-type": content_type, "upsert": "true"}
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
        items = storage.from_(SUPABASE_BUCKET_NAME).list(user_folder.rstrip('/'))

        for item in items:
            name = item.get('name', '')
            # Check if this is a course folder (not a file)
            if name and '.' not in name:
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
            if 'courses' in existing_info:
                del existing_info['courses']
                existing_info['email'] = user_email
                existing_info['updated_at'] = datetime.now().isoformat()
                upload_json_to_s3(existing_info, SUPABASE_BUCKET_NAME, user_info_key)
                logger.info(f"Updated existing user_info.json for {user_email}")
            return True

        # Create new user_info.json
        user_info_content = {
            "email": user_email,
            "created_at": datetime.now().isoformat()
        }

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
            reverse_mapping[data["assistant_id"]] = {
                "username": username,
                "course_id": course_id
            }

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
            return position_data.get('last_position', 0)
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
```

---

### Phase 3: Update load_and_process_index.py

**File: `backend/utils/load_and_process_index.py`** (Updated)

```python
"""
Course context processing module for FAISS index creation.

This module processes course files and creates vector embeddings for RAG.
"""

import tiktoken
import openai
import numpy as np
from difflib import SequenceMatcher
import time
import json

from utils.s3_utils import (
    get_course_s3_folder,
    upload_json_to_s3,
    upload_faiss_index_to_s3,
    SUPABASE_BUCKET_NAME,
    storage,
    get_json_from_s3,
    read_text_file_from_s3,
    list_files_in_prefix
)

# Try to import faiss, make it optional
try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    print("Warning: FAISS not available in load_and_process_index. Vector index functionality will be disabled.")
    FAISS_AVAILABLE = False
    faiss = None


def process_course_context_s3(bucket_name, username, coursename, api_key, max_tokens=2000):
    """
    Standalone function to process course files from storage and upload indices.

    Args:
        bucket_name: Storage bucket name
        username: User's email/username
        coursename: Course ID/name
        api_key: OpenAI API key
        max_tokens: Maximum tokens per chunk

    Returns:
        True if successful, False otherwise
    """
    start_time = time.time()

    # 1. Load and combine text files from storage
    course_prefix = get_course_s3_folder(username, coursename)
    all_text = []

    try:
        # List text files using s3_utils function
        text_files = list_files_in_prefix(bucket_name, course_prefix, file_extension='txt')

        for file_path in text_files:
            content = read_text_file_from_s3(bucket_name, file_path)
            if content:
                all_text.append(content)

        if not all_text:
            raise ValueError("No text files found in course directory")

        combined_text = '\n'.join(all_text)
        del all_text  # Free memory early

    except Exception as e:
        print(f"Error loading files from storage: {str(e)}")
        return False

    # 2. Split into chunks with memory efficiency
    encoder = tiktoken.encoding_for_model("gpt-4")
    chunks = []
    current_chunk = []
    current_token_count = 0

    for line in combined_text.split('\n'):
        line_tokens = len(encoder.encode(line + '\n'))
        if current_token_count + line_tokens > max_tokens:
            if current_chunk:
                chunks.append('\n'.join(current_chunk))
                current_chunk = []
                current_token_count = 0
            # Handle long lines that exceed max_tokens
            while line_tokens > max_tokens:
                chunks.append(line[:len(line) // 2])
                line = line[len(line) // 2:]
                line_tokens = len(encoder.encode(line + '\n'))
            current_chunk.append(line)
            current_token_count = line_tokens
        else:
            current_chunk.append(line)
            current_token_count += line_tokens

    if current_chunk:
        chunks.append('\n'.join(current_chunk))
    del combined_text  # Free memory

    # 3. Generate embeddings and build FAISS index (only if FAISS is available)
    faiss_index = None
    if FAISS_AVAILABLE:
        dimension = 3072  # text-embedding-3-large dimension
        faiss_index = faiss.IndexFlatL2(dimension)
        embeddings = []

        openai_client = openai.OpenAI(api_key=api_key)

        # Process chunks in batches to control memory usage
        batch_size = 100
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            try:
                response = openai_client.embeddings.create(
                    model="text-embedding-3-large",
                    input=batch
                )
                batch_embeddings = [e.embedding for e in response.data]
                embeddings.extend(batch_embeddings)
            except Exception as e:
                print(f"Error generating embeddings: {str(e)}")
                embeddings.extend([np.zeros(dimension).tolist()] * len(batch))

            # Clear memory between batches
            del batch

        # Convert to numpy array and add to FAISS
        embeddings_np = np.array(embeddings).astype('float32')
        faiss_index.add(embeddings_np)
        del embeddings
        del embeddings_np
    else:
        print("Warning: FAISS not available. Skipping vector index creation.")

    # 4. Build inverted index
    inverted_index = {}
    for i, chunk in enumerate(chunks):
        quotes = [line for line in chunk.split('\n') if line.startswith('"')]
        for quote in quotes:
            inverted_index[quote.lower()] = i

    # 5. Upload all artifacts to storage
    base_key = get_course_s3_folder(username, coursename)

    # Upload chunks
    upload_json_to_s3(chunks, bucket_name, f"{base_key}chunks.json")
    del chunks

    # Upload FAISS index (only if available)
    if FAISS_AVAILABLE and faiss_index is not None:
        upload_faiss_index_to_s3(faiss_index, bucket_name, f"{base_key}faiss.index")
        del faiss_index
    else:
        print("Warning: FAISS index not created or FAISS not available. Skipping FAISS index upload.")

    # Upload inverted index
    upload_json_to_s3(inverted_index, bucket_name, f"{base_key}inverted_index.json")
    del inverted_index

    print(f"Total processing time: {time.time() - start_time:.2f} seconds")
    return True
```

---

### Phase 4: Update user_files_utils.py

**Note:** `user_files_utils.py` was later removed as dead code. This phase is obsolete.

**File: `backend/user_files_utils.py`** (Complete Rewrite - MISSING FROM ORIGINAL PLAN; *later removed*)

```python
"""
User files utilities module.

This module provides user-specific file operations.
Note: This file previously had a standalone boto3 client which has been
removed in favor of using the centralized s3_utils module.
"""

import os
from utils.s3_utils import (
    SUPABASE_BUCKET_NAME,
    storage,
    list_files_in_prefix,
    download_file_from_s3,
    upload_file_to_s3
)

# Export bucket name for backwards compatibility
bucket_name = SUPABASE_BUCKET_NAME
```

---

### Phase 5: Replace Hardcoded Bucket Names

#### 5.1 backend/api/in_class.py

```python
# Line 13: Replace
# OLD: S3_BUCKET_NAME = "anantra-lms-store"
# NEW:
from utils.s3_utils import SUPABASE_BUCKET_NAME as S3_BUCKET_NAME
```

#### 5.2 backend/api/assistant.py

```python
# Line 13: Replace
# OLD: S3_BUCKET_NAME = "anantra-lms-store"
# NEW:
from utils.s3_utils import SUPABASE_BUCKET_NAME as S3_BUCKET_NAME
```

#### 5.3 backend/functions/slides_navigation.py

```python
# Line 12: Replace hardcoded bucket in get_slides function
# OLD: slides_data = s3_utils.get_json_from_s3("anantra-lms-store", ...)
# NEW: slides_data = s3_utils.get_json_from_s3(s3_utils.SUPABASE_BUCKET_NAME, ...)
```

---

### Phase 6: Create README Documentation for Supabase

**File: `backend/SUPABASE_SETUP.md`** (NEW)

```markdown
# Supabase Storage Setup Guide

This guide explains how to configure Supabase Storage for both local development and production environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cloud Supabase Setup](#cloud-supabase-setup)
3. [Local Development Setup (Docker)](#local-development-setup-docker)
4. [Environment Configuration](#environment-configuration)
5. [Storage Bucket Setup](#storage-bucket-setup)
6. [Migrating from AWS S3](#migrating-from-aws-s3)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Python 3.9+
- Docker (for local development)
- Supabase account (for cloud setup)

---

## Cloud Supabase Setup

### Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: Your project name
   - **Database Password**: Save this securely
   - **Region**: Choose closest to your users
4. Wait for project to be provisioned (~2 minutes)

### Step 2: Get API Credentials

1. Go to Project Settings → API
2. Copy the following:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Service Role Key** (under Project API keys): `eyJhbGciOiJIUzI1...`

> ⚠️ **Security**: Never expose the service role key in client-side code. It has full access to your project.

### Step 3: Create Storage Bucket

1. Go to Storage in the sidebar
2. Click "New Bucket"
3. Configure:
   - **Name**: `anantra-lms-store` (or your preferred name)
   - **Public bucket**: OFF (private)
   - **File size limit**: 50MB (adjust as needed)
   - **Allowed MIME types**: Leave empty for all types

---

## Local Development Setup (Docker)

### Option 1: Supabase CLI (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
cd backend
supabase init

# Start local Supabase
supabase start
```

This starts local instances of:
- PostgreSQL database
- Supabase Auth
- Supabase Storage
- PostgREST API
- Studio (dashboard)

After starting, you'll see output like:
```
Started supabase local development setup.

         API URL: http://localhost:54321
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Option 2: Docker Compose

Create `docker-compose.supabase.yml`:

```yaml
version: "3.8"

services:
  supabase-storage:
    image: supabase/storage-api:v0.40.4
    ports:
      - "5000:5000"
    environment:
      ANON_KEY: your-anon-key
      SERVICE_KEY: your-service-key
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: your-jwt-secret
      DATABASE_URL: postgresql://postgres:postgres@db:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
    volumes:
      - storage-data:/var/lib/storage

  db:
    image: supabase/postgres:15.1.0.55
    ports:
      - "54322:5432"
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  storage-data:
  db-data:
```

Start with:
```bash
docker-compose -f docker-compose.supabase.yml up -d
```

---

## Environment Configuration

### For Cloud Supabase

Create `backend/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_BUCKET_NAME=anantra-lms-store
```

### For Local Development

```env
# Local Supabase Configuration
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key
SUPABASE_BUCKET_NAME=anantra-lms-store
```

---

## Storage Bucket Setup

### Create Bucket via Dashboard

1. Open Supabase Studio (local: http://localhost:54323, cloud: dashboard)
2. Go to Storage → New Bucket
3. Name: `anantra-lms-store`
4. Set as private

### Create Bucket Programmatically

```python
from supabase import create_client

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Create bucket if it doesn't exist
try:
    supabase.storage.create_bucket(
        "anantra-lms-store",
        options={"public": False}
    )
    print("Bucket created successfully")
except Exception as e:
    print(f"Bucket may already exist: {e}")
```

### Storage Policies (For RLS)

If using Row Level Security, set up policies:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'anantra-lms-store' AND
  (storage.foldername(name))[1] = 'user_data' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read their files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'anantra-lms-store' AND
  (storage.foldername(name))[1] = 'user_data' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
```

> Note: Since we use the service role key, RLS is bypassed. These policies are for reference if you switch to using the anon key.

---

## Migrating from AWS S3

### Step 1: Run Migration Script

```bash
cd backend
python scripts/migrate_s3_to_supabase.py
```

### Step 2: Verify Migration

```python
from utils.s3_utils import storage, SUPABASE_BUCKET_NAME

# List all files
files = storage.from_(SUPABASE_BUCKET_NAME).list("user_data")
print(f"Total files migrated: {len(files)}")
```

### Step 3: Switch Environment Variables

1. Comment out AWS credentials in `.env`
2. Ensure Supabase credentials are set
3. Restart the application

---

## Troubleshooting

### Error: "Bucket not found"

```
Ensure the bucket exists:
1. Check Supabase Dashboard → Storage
2. Create bucket if missing: `anantra-lms-store`
```

### Error: "Invalid JWT"

```
Check your SUPABASE_SERVICE_ROLE_KEY:
1. Go to Project Settings → API
2. Copy the correct service role key (not anon key)
```

### Error: "File too large"

```
Increase file size limit:
1. Dashboard → Storage → Settings
2. Increase "Max file size"
```

### Local Storage Not Working

```bash
# Reset local Supabase
supabase stop
supabase start

# Or with Docker
docker-compose -f docker-compose.supabase.yml down -v
docker-compose -f docker-compose.supabase.yml up -d
```

### Connection Refused (Local)

```
Ensure Supabase is running:
- CLI: `supabase status`
- Docker: `docker ps`
```

---

## API Differences: S3 vs Supabase

| Operation | AWS S3 | Supabase Storage |
|-----------|--------|------------------|
| Upload | `put_object()` | `upload()` |
| Download | `get_object()` | `download()` |
| Delete | `delete_object()` | `remove([path])` |
| List | `list_objects_v2()` | `list(folder)` |
| Bulk Delete | `delete_objects()` | `remove([paths])` |

---

## Support

For issues:
1. Check [Supabase Documentation](https://supabase.com/docs/guides/storage)
2. Open an issue on GitHub
3. Contact the development team
```

---

## Success Criteria (Updated)

1. All existing functionality works with Supabase Storage
2. No changes needed in files that import `s3_utils` (except hardcoded bucket names)
3. All tests pass
4. File paths and structure remain unchanged
5. Performance is comparable or better
6. README documentation for local and hosted Supabase setup is complete
7. Migration script successfully transfers existing S3 data (if needed)
