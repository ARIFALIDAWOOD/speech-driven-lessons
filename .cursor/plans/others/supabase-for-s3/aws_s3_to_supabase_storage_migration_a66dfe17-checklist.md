# Implementation Checklist: AWS S3 to Supabase Storage Migration

Use this checklist to track progress during implementation.

---

## Pre-Implementation

### Environment Setup
- [ ] Supabase account created (or local Docker setup ready)
- [ ] Supabase project created
- [ ] Service role key obtained and saved securely
- [ ] Storage bucket created: `anantra-lms-store`
- [ ] Git branch created for migration work
- [ ] Local `.env` file updated with Supabase credentials

### Backup & Safety
- [ ] Current S3 data backed up (if applicable)
- [ ] Database state documented
- [ ] All current tests passing before migration
- [ ] Local development environment tested

---

## Phase 1: Dependencies & Configuration

### Task 1: Environment Variables
- [ ] Updated `backend/.env.example` with Supabase variables
- [ ] Documented how to get Supabase credentials
- [ ] Marked AWS credentials as deprecated

### Task 2: Requirements
- [ ] Created `backend/requirements.txt`
- [ ] Added `supabase>=2.0.0` dependency
- [ ] Installed dependencies: `pip install -r backend/requirements.txt`
- [ ] Verified Supabase package imports correctly

---

## Phase 2: Core Module Refactor

### Task 3: s3_utils.py (CRITICAL)
- [ ] Replaced boto3 imports with Supabase client
- [ ] Updated client initialization
- [ ] Added environment variable validation
- [ ] Refactored `upload_file_to_s3()`
- [ ] Refactored `read_text_file_from_s3()`
- [ ] Refactored `read_binary_from_s3()`
- [ ] Refactored `get_json_from_s3()`
- [ ] Refactored `upload_json_to_s3()`
- [ ] Refactored `upload_faiss_index_to_s3()`
- [ ] Refactored `delete_file_from_s3()`
- [ ] Refactored `delete_folder_from_s3()`
- [ ] Refactored `list_objects_in_folder()`
- [ ] Refactored `list_files_in_prefix()`
- [ ] Refactored `list_user_course_ids()`
- [ ] Refactored `download_file_from_s3()`
- [ ] Refactored `upload_directory_to_s3()`
- [ ] Refactored `get_s3_user_courses_info()`
- [ ] Refactored `check_and_create_user_folder()`
- [ ] Refactored `load_user_assistant_from_s3()`
- [ ] Refactored `save_user_assistant_to_s3()`
- [ ] Refactored `load_assistant_user_from_s3()`
- [ ] Refactored `get_assistant_last_position()`
- [ ] Added `SUPABASE_BUCKET_NAME` constant
- [ ] Added `S3_BUCKET_NAME` alias for backwards compatibility
- [ ] Exported legacy constants (ACCESS_KEY, SECRET_KEY, REGION_NAME) as None
- [ ] All path helper functions unchanged
- [ ] Updated logging (replaced print with logger)
- [ ] Tested module loads without errors

---

## Phase 3: Dependent Module Updates

### Task 4: load_and_process_index.py
- [ ] Removed boto3 import
- [ ] Removed direct S3 client creation
- [ ] Updated imports to use s3_utils functions
- [ ] Replaced `s3.list_objects_v2()` with `list_files_in_prefix()`
- [ ] Replaced `s3.get_object()` with `read_text_file_from_s3()`
- [ ] Verified FAISS processing still works

### Task 5: user_files_utils.py (MISSED IN ORIGINAL PLAN) — OBSOLETE
**Note:** `user_files_utils.py` was removed as dead code. Task obsolete.
- [x] File removed (dead code)

### Task 6: in_class.py
- [ ] Removed hardcoded bucket name (line 13)
- [ ] Added import from s3_utils
- [ ] Verified all bucket references work

### Task 7: assistant.py
- [ ] Removed hardcoded bucket name (line 13)
- [ ] Added import from s3_utils
- [ ] Verified all bucket references work

### Task 8: slides_navigation.py
- [ ] Updated hardcoded bucket in `get_slides()` (line 12)
- [ ] Used `s3_utils.SUPABASE_BUCKET_NAME`

---

## Phase 4: Documentation

### Task 9: Supabase Setup Guide
- [ ] Created `backend/SUPABASE_SETUP.md`
- [ ] Documented cloud Supabase setup
- [ ] Documented local development setup (Docker)
- [ ] Documented environment configuration
- [ ] Documented bucket creation
- [ ] Added troubleshooting section
- [ ] Added API differences table

---

## Phase 5: Testing & Verification

### Task 11: Unit Tests
- [ ] Created `backend/tests/test_storage.py`
- [ ] Test: environment variables validation
- [ ] Test: JSON upload/download
- [ ] Test: text file upload/download
- [ ] Test: list objects
- [ ] Test: delete folder
- [ ] All tests passing

### Integration Testing
- [ ] Application starts without errors
- [ ] User folder creation works
- [ ] File upload via API works
- [ ] File download via API works
- [ ] Course creation workflow works
- [ ] Course listing works
- [ ] Course deletion works
- [ ] Assistant creation works
- [ ] Slide navigation works

### Manual Testing
- [ ] Create new course with file upload
- [ ] Load existing course data
- [ ] Test chat functionality (if applicable)
- [ ] Test assistant creation
- [ ] Test slide navigation

---

## Phase 6: Data Migration (Optional)

### Task 10: Migration Script
- [ ] Created `backend/scripts/migrate_s3_to_supabase.py`
- [ ] Tested with `--dry-run` flag
- [ ] Ran migration (if S3 data exists)
- [ ] Verified all files transferred
- [ ] Verified file integrity

---

## Post-Implementation

### Cleanup
- [ ] Removed unused boto3 imports (if any remaining)
- [ ] Removed AWS-specific error handling
- [ ] Updated any remaining hardcoded bucket names
- [ ] Removed temporary migration code (if applicable)

### Documentation Updates
- [ ] Updated main README.md to reference Supabase
- [ ] Updated API documentation (if applicable)
- [ ] Added migration notes to changelog

### Deployment Preparation
- [ ] Production Supabase credentials ready
- [ ] Production bucket created
- [ ] Deployment scripts updated
- [ ] Rollback plan documented

### Final Verification
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Performance comparable to S3
- [ ] No regressions in existing functionality
- [ ] Code review completed
- [ ] PR created and approved

---

## Rollback Checklist (If Needed)

If migration fails, follow these steps:

1. [ ] Stop application
2. [ ] Revert git changes: `git checkout main -- backend/`
3. [ ] Restore `.env` with AWS credentials
4. [ ] Remove Supabase credentials from `.env`
5. [ ] Reinstall original dependencies
6. [ ] Restart application
7. [ ] Verify S3 connectivity
8. [ ] Document failure reason for retry

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Reviewer | | | |
| QA | | | |
