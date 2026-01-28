---
name: AWS S3 to Supabase Storage Migration
overview: Replace AWS S3 with Supabase Storage by refactoring backend/utils/s3_utils.py to use Supabase Python client, updating direct boto3 usage in load_and_process_index.py, replacing hardcoded bucket names with environment variables, and updating error handling throughout.
todos:
  - id: setup-supabase
    content: Install Supabase Python client and update environment variables documentation
    status: pending
  - id: refactor-s3-utils
    content: Refactor backend/utils/s3_utils.py to use Supabase Storage client instead of boto3
    status: pending
    dependencies:
      - setup-supabase
  - id: update-load-process-index
    content: Remove direct boto3 usage from backend/utils/load_and_process_index.py and use s3_utils functions
    status: pending
    dependencies:
      - refactor-s3-utils
  - id: replace-hardcoded-buckets
    content: Replace all hardcoded bucket name strings with s3_utils.SUPABASE_BUCKET_NAME constant across all files
    status: pending
    dependencies:
      - refactor-s3-utils
  - id: update-error-handling
    content: Update error handling to use Supabase exceptions instead of boto3 ClientError
    status: pending
    dependencies:
      - refactor-s3-utils
  - id: test-storage-operations
    content: Test all storage operations (upload, download, list, delete) with Supabase Storage
    status: pending
    dependencies:
      - refactor-s3-utils
      - update-load-process-index
      - replace-hardcoded-buckets
  - id: create-migration-script
    content: Create optional data migration script to move existing S3 data to Supabase Storage
    status: pending
    dependencies:
      - test-storage-operations
---

# AWS S3 to Supabase Storage Migration Plan

## Overview

Replace AWS S3 storage backend with Supabase Storage while maintaining the same API interface. This will involve refactoring the storage utilities module and updating direct boto3 usage.

## Current State Analysis

**Files using S3:**

- Primary module: `backend/utils/s3_utils.py` (30+ functions)
- Direct boto3 usage: `backend/utils/load_and_process_index.py`
- 19 files importing `s3_utils` (will work after refactoring)
- Hardcoded bucket name "anantra-lms-store" in 50+ locations

**Key Operations:**

- File upload/download (text, binary, JSON)
- FAISS vector index storage (binary)
- List files by prefix with pagination
- Delete files and folders
- User folder structure: `user_data/{username}/{course_id}/`
- Empty folder placeholders (not needed in Supabase)

## Implementation Plan

### Phase 1: Setup and Dependencies

1. **Install Supabase Python Client**

   - Add `supabase` package to requirements
   - Update `backend/.env.example` with Supabase credentials

2. **Environment Variables**

   - Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `.env.example`
   - Create bucket "anantra-lms-store" in Supabase Storage dashboard
   - Document migration steps

### Phase 2: Refactor s3_utils.py

**File: `backend/utils/s3_utils.py`**

1. **Replace boto3 with Supabase client:**
   ```python
   # Replace boto3 imports and client initialization
   from supabase import create_client, Client
   supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
   storage = supabase.storage
   ```

2. **Update all functions to use Supabase Storage API:**

   - `upload_file_to_s3()` → `storage.from_(bucket).upload(path, file, file_options)`
   - `read_text_file_from_s3()` → `storage.from_(bucket).download(path)`
   - `read_binary_from_s3()` → `storage.from_(bucket).download(path)` (returns bytes)
   - `get_json_from_s3()` → download and parse JSON
   - `upload_json_to_s3()` → serialize and upload
   - `upload_faiss_index_to_s3()` → upload binary data
   - `delete_file_from_s3()` → `storage.from_(bucket).remove([path])`
   - `delete_folder_from_s3()` → list all files with prefix, then batch delete
   - `list_objects_in_folder()` → `storage.from_(bucket).list(path)` with prefix handling
   - `list_user_course_ids()` → use list with delimiter logic
   - `download_file_from_s3()` → download and save locally
   - `upload_directory_to_s3()` → iterate and upload files

3. **Update helper functions:**

   - Keep path helper functions unchanged (same path structure)
   - Replace `S3_BUCKET_NAME` constant with `SUPABASE_BUCKET_NAME` from env
   - Update `check_and_create_user_folder()` (Supabase doesn't need empty folder objects)

4. **Error handling:**

   - Replace `ClientError` with Supabase exceptions
   - Map "NoSuchKey" errors to Supabase file not found errors
   - Preserve same return types (True/False, None on errors)

### Phase 3: Update load_and_process_index.py

**File: `backend/utils/load_and_process_index.py`**

1. **Remove direct boto3 usage:**

   - Replace `boto3.client()` initialization with Supabase client
   - Update `s3.list_objects_v2()` → use `s3_utils.list_objects_in_folder()`
   - Update `s3.get_object()` → use `s3_utils.read_text_file_from_s3()`
   - Remove boto3 imports

2. **Use refactored s3_utils functions:**

   - All operations should go through `s3_utils` module
   - Maintain same function signatures

### Phase 4: Replace Hardcoded Bucket Names

**Files with hardcoded "anantra-lms-store":**

- `backend/utils/s3_utils.py` (define constant)
- `backend/routes/upload_routes.py`
- `backend/routes/delete_course_routes.py`
- `backend/routes/delete_routes.py`
- `backend/routes/customize_routes.py`
- `backend/routes/course_generation_routes.py`
- `backend/functions/get_detailed_content.py`
- `backend/functions/slides_navigation.py`
- `backend/app.py`
- `backend/api/course.py`
- `backend/api/in_class.py`
- `backend/api/assistant.py`
- `backend/api/course_generation.py`
- `backend/user_files_utils.py` *(removed as dead code; see backend cleanup plan)*

**Strategy:**

- Replace all hardcoded strings with `s3_utils.SUPABASE_BUCKET_NAME` (renamed constant)
- Or pass bucket name as parameter consistently

### Phase 5: Testing

1. **Unit tests for storage operations:**

   - Test each function in `s3_utils.py`
   - Mock Supabase client responses
   - Verify error handling

2. **Integration tests:**

   - Test file upload/download flow
   - Test JSON operations
   - Test FAISS index upload/download
   - Test folder listing and deletion
   - Test course creation workflow

3. **Manual testing:**

   - Create new course with file upload
   - Load existing course data
   - Test chat functionality (uses S3ContextManager)
   - Test assistant creation

### Phase 6: Data Migration (Optional)

If existing S3 data needs migration:

1. **Create migration script:**

   - List all S3 objects
   - Download from S3
   - Upload to Supabase Storage
   - Verify file integrity
   - Optionally delete from S3 after verification

2. **Run migration:**

   - Test with small subset first
   - Full migration in maintenance window
   - Keep S3 as backup initially

## File Structure Changes

```
backend/utils/s3_utils.py          # Complete refactor to Supabase
backend/utils/load_and_process_index.py  # Remove boto3, use s3_utils
backend/.env.example                # Add Supabase credentials
requirements.txt                    # Add supabase package, remove boto3 (optional)
```

## Breaking Changes

- **Environment variables:** Replace AWS credentials with Supabase credentials
- **Bucket creation:** Must create bucket in Supabase dashboard first
- **Error messages:** May differ slightly (but same behavior)

## Migration Considerations

1. **Empty folders:** Supabase doesn't need placeholder objects, but path structure remains the same
2. **Pagination:** Supabase list() may handle pagination differently - test thoroughly
3. **File paths:** Same path structure works (`user_data/{username}/{course_id}/`)
4. **Content types:** Supabase supports content-type specification
5. **Binary data:** FAISS indices should work the same way

## Rollback Plan

1. Keep AWS credentials in environment variables
2. Create feature flag to switch between S3 and Supabase
3. Or revert git commit if issues arise

## Success Criteria

- All existing functionality works with Supabase Storage
- No changes needed in files that import `s3_utils`
- All tests pass
- File paths and structure remain unchanged
- Performance is comparable or better
