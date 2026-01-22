# Task Delegation: AWS S3 to Supabase Storage Migration

This document contains all tasks broken down for subagent execution. Tasks are ordered by dependency and can be parallelized where indicated.

---

## Task 1: Update Dependencies and Environment Configuration

**Agent Type:** code
**Dependencies:** None
**Files:**
- `backend/.env.example`

### Context

The application currently uses AWS S3 for file storage via boto3. We need to add Supabase Python client as a dependency and update environment variable documentation. The Supabase client (`supabase>=2.0.0`) replaces boto3 for storage operations.

### Instructions

1. Update `backend/.env.example` with the following changes:

```python
# Replace the AWS S3 section with:

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
```

2. Update the notes section to reflect that S3 has been replaced by Supabase.

### Success Criteria

- [ ] `.env.example` contains Supabase environment variables
- [ ] AWS credentials are marked as deprecated/optional
- [ ] Documentation comments explain how to get Supabase credentials

---

## Task 2: Create Requirements File

**Agent Type:** code
**Dependencies:** None
**Files:**
- `backend/requirements.txt` (create new)

### Context

The project currently has no centralized requirements.txt. Create one with all necessary dependencies including the new Supabase client.

### Instructions

Create `backend/requirements.txt` with the following content:

```txt
# Core Framework
flask>=2.3.0
flask-cors>=4.0.0
flask-socketio>=5.3.0
eventlet>=0.33.0

# Supabase (primary storage)
supabase>=2.0.0

# AI/ML
openai>=1.0.0
tiktoken>=0.5.0
google-generativeai>=0.3.0

# Vector Store (optional)
numpy>=1.24.0
# faiss-cpu>=1.7.0  # Uncomment if needed

# Firebase Auth
firebase-admin>=6.2.0

# Voice
vapi-python>=0.1.0

# Utilities
python-dotenv>=1.0.0
redis>=5.0.0
requests>=2.31.0

# Development
pytest>=7.4.0
```

### Success Criteria

- [ ] `backend/requirements.txt` exists
- [ ] Contains `supabase>=2.0.0`
- [ ] Does not include boto3 as a required dependency

---

## Task 3: Refactor s3_utils.py (Core Module)

**Agent Type:** code
**Dependencies:** Task 1, Task 2
**Files:**
- `backend/utils/s3_utils.py`

### Context

This is the main storage utilities module (615 lines, 30+ functions). It currently uses boto3 to interact with AWS S3. The refactor must:
1. Replace boto3 with Supabase client
2. Maintain exact same function signatures for backwards compatibility
3. Update error handling for Supabase-specific exceptions
4. Add environment variable validation on module load

### Instructions

Replace the entire content of `backend/utils/s3_utils.py` with the implementation from the enhanced plan document (`-enhanced.md`). The key changes are:

1. **Imports and Initialization:**
```python
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET_NAME = os.getenv("SUPABASE_BUCKET_NAME", "anantra-lms-store")

# Legacy alias for backwards compatibility
S3_BUCKET_NAME = SUPABASE_BUCKET_NAME

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
storage = supabase.storage
```

2. **Function Mappings:**
   - `upload_file_to_s3()` → `storage.from_(bucket).upload(path, file, file_options)`
   - `read_text_file_from_s3()` → `storage.from_(bucket).download(key).decode('utf-8')`
   - `read_binary_from_s3()` → `storage.from_(bucket).download(key)`
   - `get_json_from_s3()` → download and `json.loads()`
   - `upload_json_to_s3()` → serialize and `upload()`
   - `delete_file_from_s3()` → `storage.from_(bucket).remove([path])`
   - `delete_folder_from_s3()` → list files, then batch `remove()`
   - `list_objects_in_folder()` → `storage.from_(bucket).list(folder)`

3. **Important Differences:**
   - Supabase `upload()` uses `file_options={"upsert": "true"}` to overwrite
   - Supabase `remove()` takes a LIST of paths: `remove([path1, path2])`
   - Supabase `list()` returns different structure than S3's `list_objects_v2`

4. **Export legacy constants for compatibility:**
```python
ACCESS_KEY = None
SECRET_KEY = None
REGION_NAME = None
```

### Success Criteria

- [ ] All 30+ functions are implemented with Supabase
- [ ] Function signatures remain unchanged
- [ ] `S3_BUCKET_NAME` constant is aliased from `SUPABASE_BUCKET_NAME`
- [ ] Environment validation raises `EnvironmentError` on missing vars
- [ ] Logging is used instead of print statements

---

## Task 4: Update load_and_process_index.py

**Agent Type:** code
**Dependencies:** Task 3
**Files:**
- `backend/utils/load_and_process_index.py`

### Context

This file currently creates its own boto3 client on lines 34-37 and directly uses S3 APIs on lines 45-49. It must be updated to use the refactored `s3_utils` module instead.

### Instructions

1. **Remove boto3 import and client creation (lines 9, 34-37):**

Before:
```python
import boto3
from utils.s3_utils import (
    get_course_s3_folder,
    upload_json_to_s3,
    upload_faiss_index_to_s3,
    ACCESS_KEY,
    SECRET_KEY,
    REGION_NAME
)
...
s3 = boto3.client('s3',
                  aws_access_key_id=ACCESS_KEY,
                  aws_secret_access_key=SECRET_KEY,
                  region_name=REGION_NAME)
```

After:
```python
from utils.s3_utils import (
    get_course_s3_folder,
    upload_json_to_s3,
    upload_faiss_index_to_s3,
    SUPABASE_BUCKET_NAME,
    list_files_in_prefix,
    read_text_file_from_s3
)
```

2. **Replace direct S3 calls with s3_utils functions (lines 45-49):**

Before:
```python
response = s3.list_objects_v2(Bucket=bucket_name, Prefix=course_prefix)
for obj in response.get('Contents', []):
    if obj['Key'].endswith('.txt'):
        file_obj = s3.get_object(Bucket=bucket_name, Key=obj['Key'])
        all_text.append(file_obj['Body'].read().decode('utf-8'))
```

After:
```python
text_files = list_files_in_prefix(bucket_name, course_prefix, file_extension='txt')
for file_path in text_files:
    content = read_text_file_from_s3(bucket_name, file_path)
    if content:
        all_text.append(content)
```

### Success Criteria

- [ ] No boto3 import or usage
- [ ] Uses `s3_utils.list_files_in_prefix()` for listing
- [ ] Uses `s3_utils.read_text_file_from_s3()` for reading
- [ ] Function signature unchanged
- [ ] FAISS processing logic unchanged

---

## Task 5: Update user_files_utils.py

**Agent Type:** code
**Dependencies:** Task 3
**Files:**
- `backend/user_files_utils.py`

### Context

This file has a standalone boto3 client initialization that was **MISSED in the original plan**. It needs to be refactored to use s3_utils.

### Instructions

Replace the entire content of `backend/user_files_utils.py`:

Before (17 lines):
```python
import boto3
import os

ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
REGION_NAME = "ca-central-1"

s3_client = boto3.client(
    's3',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name=REGION_NAME
)

bucket_name = "anantra-lms-store"
```

After:
```python
"""
User files utilities module.

This module provides user-specific file operations.
Refactored to use centralized s3_utils module.
"""

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

### Success Criteria

- [ ] No boto3 import or usage
- [ ] `bucket_name` exported for backwards compatibility
- [ ] Uses centralized `s3_utils` module

---

## Task 6: Replace Hardcoded Bucket Names - in_class.py

**Agent Type:** code
**Dependencies:** Task 3
**Files:**
- `backend/api/in_class.py`

### Context

Line 13 has a hardcoded bucket name that needs to be replaced with the constant from s3_utils.

### Instructions

Change line 13:

Before:
```python
S3_BUCKET_NAME = "anantra-lms-store"
```

After:
```python
from utils.s3_utils import SUPABASE_BUCKET_NAME as S3_BUCKET_NAME
```

Remove the hardcoded string assignment and import from s3_utils instead.

### Success Criteria

- [ ] No hardcoded bucket name
- [ ] Uses imported constant from s3_utils
- [ ] All references to `S3_BUCKET_NAME` in the file still work

---

## Task 7: Replace Hardcoded Bucket Names - assistant.py

**Agent Type:** code
**Dependencies:** Task 3
**Files:**
- `backend/api/assistant.py`

### Context

Line 13 has a hardcoded bucket name that needs to be replaced.

### Instructions

Change line 13:

Before:
```python
S3_BUCKET_NAME = "anantra-lms-store"
```

After:
```python
from utils.s3_utils import SUPABASE_BUCKET_NAME as S3_BUCKET_NAME
```

### Success Criteria

- [ ] No hardcoded bucket name
- [ ] Uses imported constant from s3_utils

---

## Task 8: Replace Hardcoded Bucket Names - slides_navigation.py

**Agent Type:** code
**Dependencies:** Task 3
**Files:**
- `backend/functions/slides_navigation.py`

### Context

Line 12 inside `get_slides()` function has a hardcoded bucket name in the function call.

### Instructions

Change line 12:

Before:
```python
slides_data = s3_utils.get_json_from_s3("anantra-lms-store",
                                        s3_utils.get_s3_file_path(username, course_id, "slides.json"))
```

After:
```python
slides_data = s3_utils.get_json_from_s3(s3_utils.SUPABASE_BUCKET_NAME,
                                        s3_utils.get_s3_file_path(username, course_id, "slides.json"))
```

### Success Criteria

- [ ] No hardcoded bucket name string
- [ ] Uses `s3_utils.SUPABASE_BUCKET_NAME`

---

## Task 9: Create Supabase Setup Documentation

**Agent Type:** code
**Dependencies:** None (can run in parallel)
**Files:**
- `backend/SUPABASE_SETUP.md` (create new)

### Context

The user specifically requested README documentation for Supabase configuration covering both local development and hosted versions.

### Instructions

Create `backend/SUPABASE_SETUP.md` with the content from the enhanced plan document. The documentation must include:

1. **Prerequisites section**
2. **Cloud Supabase Setup** - Step-by-step guide to create project and get credentials
3. **Local Development Setup (Docker)** - Using Supabase CLI or Docker Compose
4. **Environment Configuration** - Sample .env for cloud and local
5. **Storage Bucket Setup** - Dashboard and programmatic bucket creation
6. **Migrating from AWS S3** - Instructions to run migration script
7. **Troubleshooting** - Common errors and solutions
8. **API Differences table** - S3 vs Supabase method mapping

### Success Criteria

- [ ] File exists at `backend/SUPABASE_SETUP.md`
- [ ] Contains local development setup with Docker
- [ ] Contains cloud setup instructions
- [ ] Contains troubleshooting section
- [ ] Contains migration instructions

---

## Task 10: Create Data Migration Script (Optional)

**Agent Type:** code
**Dependencies:** Task 3
**Files:**
- `backend/scripts/migrate_s3_to_supabase.py` (create new)

### Context

If there is existing data in S3 that needs to be migrated, this script will handle the transfer.

### Instructions

Create `backend/scripts/migrate_s3_to_supabase.py`:

```python
"""
S3 to Supabase Storage Migration Script

This script migrates all files from an AWS S3 bucket to Supabase Storage.
Run this once during migration, then remove AWS dependencies.

Usage:
    python scripts/migrate_s3_to_supabase.py [--dry-run]
"""

import os
import sys
import argparse
from typing import List, Dict

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import boto3
from supabase import create_client

# AWS Configuration
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = "ca-central-1"
S3_BUCKET = "anantra-lms-store"

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET_NAME", "anantra-lms-store")


def list_s3_objects(s3_client, bucket: str, prefix: str = "") -> List[Dict]:
    """List all objects in S3 bucket with pagination."""
    objects = []
    paginator = s3_client.get_paginator('list_objects_v2')

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        if 'Contents' in page:
            objects.extend(page['Contents'])

    return objects


def migrate_file(s3_client, supabase_storage, s3_key: str, dry_run: bool = False) -> bool:
    """Migrate a single file from S3 to Supabase."""
    try:
        if dry_run:
            print(f"[DRY RUN] Would migrate: {s3_key}")
            return True

        # Download from S3
        response = s3_client.get_object(Bucket=S3_BUCKET, Key=s3_key)
        content = response['Body'].read()
        content_type = response.get('ContentType', 'application/octet-stream')

        # Upload to Supabase
        supabase_storage.from_(SUPABASE_BUCKET).upload(
            path=s3_key,
            file=content,
            file_options={"content-type": content_type, "upsert": "true"}
        )

        print(f"[OK] Migrated: {s3_key}")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to migrate {s3_key}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='Migrate S3 files to Supabase Storage')
    parser.add_argument('--dry-run', action='store_true', help='List files without migrating')
    parser.add_argument('--prefix', default='', help='Only migrate files with this prefix')
    args = parser.parse_args()

    # Validate AWS credentials
    if not AWS_ACCESS_KEY or not AWS_SECRET_KEY:
        print("ERROR: AWS credentials not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
        sys.exit(1)

    # Validate Supabase credentials
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: Supabase credentials not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        sys.exit(1)

    # Initialize clients
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY,
        aws_secret_access_key=AWS_SECRET_KEY,
        region_name=AWS_REGION
    )

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    storage = supabase.storage

    print(f"Migrating from S3 bucket: {S3_BUCKET}")
    print(f"To Supabase bucket: {SUPABASE_BUCKET}")
    print(f"Prefix filter: '{args.prefix}' (empty = all files)")
    print("-" * 50)

    # List all S3 objects
    objects = list_s3_objects(s3_client, S3_BUCKET, args.prefix)
    print(f"Found {len(objects)} files to migrate")

    if not objects:
        print("No files to migrate.")
        return

    # Migrate each file
    success_count = 0
    error_count = 0

    for obj in objects:
        key = obj['Key']

        # Skip folder placeholders
        if key.endswith('/'):
            continue

        if migrate_file(s3_client, storage, key, args.dry_run):
            success_count += 1
        else:
            error_count += 1

    print("-" * 50)
    print(f"Migration complete: {success_count} succeeded, {error_count} failed")

    if error_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
```

### Success Criteria

- [ ] Script exists at `backend/scripts/migrate_s3_to_supabase.py`
- [ ] Supports `--dry-run` flag
- [ ] Supports `--prefix` filter
- [ ] Handles pagination for large buckets
- [ ] Reports success/failure counts

---

## Task 11: Testing and Verification

**Agent Type:** code
**Dependencies:** Tasks 3-8
**Files:**
- `backend/tests/test_storage.py` (create new)

### Context

Create basic tests to verify the storage functions work correctly with Supabase.

### Instructions

Create `backend/tests/test_storage.py`:

```python
"""
Storage utilities tests.

These tests verify the Supabase storage functions work correctly.
Requires a working Supabase connection with test bucket.
"""

import os
import sys
import pytest
import json
import uuid

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from utils import s3_utils


@pytest.fixture
def test_prefix():
    """Generate unique test prefix to avoid conflicts."""
    return f"test_data/{uuid.uuid4().hex[:8]}/"


class TestStorageFunctions:
    """Test storage utility functions."""

    def test_environment_variables_set(self):
        """Verify required environment variables are set."""
        assert s3_utils.SUPABASE_URL is not None
        assert s3_utils.SUPABASE_SERVICE_ROLE_KEY is not None
        assert s3_utils.SUPABASE_BUCKET_NAME is not None

    def test_upload_and_download_json(self, test_prefix):
        """Test JSON upload and download."""
        test_key = f"{test_prefix}test.json"
        test_data = {"message": "Hello, Supabase!", "number": 42}

        # Upload
        success = s3_utils.upload_json_to_s3(
            test_data,
            s3_utils.SUPABASE_BUCKET_NAME,
            test_key
        )
        assert success is True

        # Download
        result = s3_utils.get_json_from_s3(
            s3_utils.SUPABASE_BUCKET_NAME,
            test_key
        )
        assert result == test_data

        # Cleanup
        s3_utils.delete_file_from_s3(
            s3_utils.SUPABASE_BUCKET_NAME,
            test_key
        )

    def test_upload_and_download_text(self, test_prefix):
        """Test text file upload and download."""
        test_key = f"{test_prefix}test.txt"
        test_content = "Hello, World!\nLine 2\nLine 3"

        # Upload (create file-like object)
        class FakeFile:
            content_type = "text/plain"
            def read(self):
                return test_content.encode('utf-8')
            def seek(self, pos):
                pass

        success = s3_utils.upload_file_to_s3(
            FakeFile(),
            s3_utils.SUPABASE_BUCKET_NAME,
            test_key
        )
        assert success is True

        # Download
        result = s3_utils.read_text_file_from_s3(
            s3_utils.SUPABASE_BUCKET_NAME,
            test_key
        )
        assert result == test_content

        # Cleanup
        s3_utils.delete_file_from_s3(
            s3_utils.SUPABASE_BUCKET_NAME,
            test_key
        )

    def test_list_objects(self, test_prefix):
        """Test listing objects in a folder."""
        # Create test files
        for i in range(3):
            key = f"{test_prefix}file{i}.txt"
            s3_utils.upload_json_to_s3(
                {"id": i},
                s3_utils.SUPABASE_BUCKET_NAME,
                key
            )

        # List objects
        objects = s3_utils.list_objects_in_folder(
            s3_utils.SUPABASE_BUCKET_NAME,
            test_prefix
        )
        assert len(objects) >= 3

        # Cleanup
        s3_utils.delete_folder_from_s3(
            s3_utils.SUPABASE_BUCKET_NAME,
            test_prefix
        )

    def test_delete_folder(self, test_prefix):
        """Test deleting a folder and its contents."""
        # Create test files
        for i in range(3):
            key = f"{test_prefix}subfolder/file{i}.json"
            s3_utils.upload_json_to_s3(
                {"id": i},
                s3_utils.SUPABASE_BUCKET_NAME,
                key
            )

        # Delete folder
        success = s3_utils.delete_folder_from_s3(
            s3_utils.SUPABASE_BUCKET_NAME,
            f"{test_prefix}subfolder/"
        )
        assert success is True

        # Verify empty
        objects = s3_utils.list_objects_in_folder(
            s3_utils.SUPABASE_BUCKET_NAME,
            f"{test_prefix}subfolder/"
        )
        assert len(objects) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
```

### Success Criteria

- [ ] Test file exists at `backend/tests/test_storage.py`
- [ ] Tests cover upload, download, list, and delete operations
- [ ] Tests use unique prefixes to avoid conflicts
- [ ] Tests clean up after themselves

---

## Execution Order

### Phase 1: Setup (Parallel)
- Task 1: Update Environment Configuration
- Task 2: Create Requirements File
- Task 9: Create Supabase Setup Documentation

### Phase 2: Core Refactor (Sequential)
- Task 3: Refactor s3_utils.py (MUST complete first)

### Phase 3: Dependent Updates (Can be parallelized)
- Task 4: Update load_and_process_index.py
- Task 5: Update user_files_utils.py
- Task 6: Replace Hardcoded Bucket Names - in_class.py
- Task 7: Replace Hardcoded Bucket Names - assistant.py
- Task 8: Replace Hardcoded Bucket Names - slides_navigation.py

### Phase 4: Verification and Migration
- Task 11: Testing and Verification
- Task 10: Create Data Migration Script (if needed)

---

## Estimated Complexity

| Task | Complexity | Reason |
|------|------------|--------|
| Task 1 | Low | Simple text changes |
| Task 2 | Low | New file creation |
| Task 3 | **High** | Complete module rewrite, 30+ functions |
| Task 4 | Medium | Logic changes, remove boto3 |
| Task 5 | Low | Simple rewrite |
| Task 6-8 | Low | Single line changes each |
| Task 9 | Medium | Documentation writing |
| Task 10 | Medium | New script with error handling |
| Task 11 | Medium | Test implementation |

**Overall Migration Complexity: Medium-High**
