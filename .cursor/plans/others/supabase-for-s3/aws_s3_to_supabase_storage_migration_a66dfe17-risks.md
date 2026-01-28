# Risk Assessment: AWS S3 to Supabase Storage Migration

This document identifies potential risks, their impact, likelihood, and mitigation strategies.

---

## Risk Matrix

| Severity | Definition |
|----------|------------|
| **Critical** | System unusable, data loss possible |
| **High** | Major feature broken, workarounds difficult |
| **Medium** | Feature degraded, workarounds available |
| **Low** | Minor inconvenience, easy workaround |

| Likelihood | Definition |
|------------|------------|
| **High** | >70% chance of occurring |
| **Medium** | 30-70% chance of occurring |
| **Low** | <30% chance of occurring |

---

## High Risk Items

### Risk 1: Data Loss During Migration

| Attribute | Value |
|-----------|-------|
| **Severity** | Critical |
| **Likelihood** | Low |
| **Impact** | Loss of user course materials, configurations, and assistant data |

**Description:**
If the migration script fails mid-execution or data is corrupted during transfer, users may lose access to their courses and materials.

**Mitigation:**
1. Keep AWS S3 bucket intact until migration is fully verified
2. Run migration script with `--dry-run` first
3. Implement file integrity checks (compare file sizes/checksums)
4. Create S3 bucket snapshot before migration
5. Migrate in batches with verification between each batch

**Detection:**
- File count mismatch between S3 and Supabase
- API errors when loading existing courses
- User reports of missing content

**Recovery:**
- Restore from S3 backup
- Re-run migration for failed files
- Implement S3-to-Supabase sync script

---

### Risk 2: API Compatibility Breaking Changes

| Attribute | Value |
|-----------|-------|
| **Severity** | High |
| **Likelihood** | Medium |
| **Impact** | 18 files that import s3_utils may break |

**Description:**
If function signatures or return types change in s3_utils.py, all 18 dependent files will fail at runtime.

**Mitigation:**
1. Maintain exact function signatures (names, parameters, return types)
2. Keep `S3_BUCKET_NAME` constant as alias for `SUPABASE_BUCKET_NAME`
3. Export legacy constants (`ACCESS_KEY`, `SECRET_KEY`) as None
4. Add deprecation warnings for legacy usage
5. Comprehensive testing of all dependent modules

**Detection:**
- Import errors on application startup
- AttributeError exceptions
- Type mismatches in return values

**Recovery:**
- Git revert to previous version
- Add missing aliases/exports
- Update dependent code if necessary

---

### Risk 3: Supabase Service Outage

| Attribute | Value |
|-----------|-------|
| **Severity** | High |
| **Likelihood** | Low |
| **Impact** | Complete storage unavailability |

**Description:**
Unlike self-hosted S3, Supabase is a third-party service that could experience outages.

**Mitigation:**
1. Implement retry logic with exponential backoff
2. Add circuit breaker pattern for storage calls
3. Cache frequently accessed files locally (e.g., Redis)
4. Monitor Supabase status page
5. Have rollback to S3 documented and tested

**Detection:**
- Connection timeout errors
- 503 Service Unavailable responses
- Supabase status page alerts

**Recovery:**
- Wait for Supabase recovery
- Switch to local cache if available
- Emergency rollback to S3 (if still configured)

---

## Medium Risk Items

### Risk 4: Performance Degradation

| Attribute | Value |
|-----------|-------|
| **Severity** | Medium |
| **Likelihood** | Medium |
| **Impact** | Slower file operations, degraded user experience |

**Description:**
Supabase Storage may have different performance characteristics than S3, especially for:
- Large file uploads (FAISS indices)
- Bulk operations (folder deletion)
- Listing many files (pagination differences)

**Mitigation:**
1. Benchmark critical operations before/after migration
2. Implement pagination properly for list operations
3. Use streaming uploads for large files
4. Consider Supabase edge functions for frequently accessed files
5. Monitor latency metrics

**Detection:**
- API response time increase >50%
- User-reported slowness
- Timeout errors for large operations

**Recovery:**
- Optimize Supabase bucket settings
- Implement caching layer
- Consider Supabase Pro plan for better performance

---

### Risk 5: Missing File in user_files_utils.py (IDENTIFIED GAP) — OBSOLETE

**Update:** `user_files_utils.py` was later removed as dead code (no imports). This risk is obsolete.

| Attribute | Value |
|-----------|-------|
| **Severity** | Medium |
| **Likelihood** | High (was missed in original plan) |
| **Impact** | Partial migration, boto3 still required |

**Description:**
The original plan missed `backend/user_files_utils.py` which had its own standalone boto3 client. The file was refactored then removed as dead code.

**Mitigation:**
1. **Already addressed** in enhanced plan
2. Task 5 specifically handles this file
3. Remove standalone boto3 client
4. Import from centralized s3_utils

**Detection:**
- grep for "boto3" after migration should return 0 results
- Import errors if boto3 removed from requirements

**Recovery:**
- Apply Task 5 changes
- Update any dependent code

---

### Risk 6: Supabase List API Differences

| Attribute | Value |
|-----------|-------|
| **Severity** | Medium |
| **Likelihood** | Medium |
| **Impact** | Incorrect file listings, missing files in UI |

**Description:**
Supabase `list()` API has different behavior than S3 `list_objects_v2()`:
- No automatic pagination (limited results)
- Different response structure
- Folder handling differs (Supabase treats folders differently)

**Mitigation:**
1. Implement pagination wrapper for large directories
2. Transform response to match expected structure
3. Add `Key` field to objects for compatibility
4. Handle folder vs file detection properly
5. Test with directories containing >100 items

**Detection:**
- Incomplete course listings
- `list_user_course_ids()` returns incomplete results
- Folder deletion leaves files behind

**Recovery:**
- Implement recursive listing if needed
- Add pagination with offset/limit
- Fix response transformation

---

### Risk 7: Authentication Token Expiry

| Attribute | Value |
|-----------|-------|
| **Severity** | Medium |
| **Likelihood** | Low |
| **Impact** | Intermittent 401 errors |

**Description:**
Supabase service role keys don't expire, but if configuration is incorrect or key is rotated, storage operations will fail.

**Mitigation:**
1. Use service role key (not anon key)
2. Validate credentials on application startup
3. Add health check endpoint for storage
4. Document key rotation procedure

**Detection:**
- 401 Unauthorized errors
- JWT validation errors
- Application startup failures

**Recovery:**
- Generate new service role key in Supabase dashboard
- Update `.env` with new key
- Restart application

---

## Low Risk Items

### Risk 8: Local Development Setup Complexity

| Attribute | Value |
|-----------|-------|
| **Severity** | Low |
| **Likelihood** | Medium |
| **Impact** | Developer onboarding friction |

**Description:**
Local Supabase setup requires Docker or Supabase CLI, which adds complexity compared to using cloud S3 with local AWS credentials.

**Mitigation:**
1. Create comprehensive SUPABASE_SETUP.md documentation
2. Provide Docker Compose file for quick setup
3. Document Supabase CLI installation steps
4. Create setup verification script

**Detection:**
- Developer complaints
- Onboarding time increases
- Local development environment issues

**Recovery:**
- Improve documentation
- Provide alternative cloud Supabase option for development

---

### Risk 9: Bucket Policy/Permission Issues

| Attribute | Value |
|-----------|-------|
| **Severity** | Low |
| **Likelihood** | Low |
| **Impact** | Upload/download failures for specific operations |

**Description:**
Supabase Storage uses Row Level Security (RLS) policies. If misconfigured, some operations may fail.

**Mitigation:**
1. Use service role key which bypasses RLS
2. Document bucket policies in setup guide
3. Disable RLS for storage bucket (when using service key)
4. Test all CRUD operations after setup

**Detection:**
- Policy violation errors
- Permission denied errors
- Inconsistent behavior (some files work, others don't)

**Recovery:**
- Review bucket policies in Supabase dashboard
- Ensure service role key is used
- Temporarily disable RLS to debug

---

### Risk 10: Content-Type Handling Differences

| Attribute | Value |
|-----------|-------|
| **Severity** | Low |
| **Likelihood** | Low |
| **Impact** | Incorrect file serving, download issues |

**Description:**
If content-type is not properly set during upload, files may not be served correctly.

**Mitigation:**
1. Always specify content-type in file_options
2. Map common extensions to MIME types
3. Default to `application/octet-stream` for unknown types
4. Test download of various file types

**Detection:**
- Browser renders files incorrectly
- Download prompts for wrong file type
- PDF/image files don't display properly

**Recovery:**
- Re-upload files with correct content-type
- Update upload function to detect MIME type

---

## Rollback Plan

If critical issues arise during or after migration, follow this rollback procedure:

### Immediate Rollback (Within 24 hours of deployment)

1. **Stop the application**
   ```bash
   # Stop Flask/Gunicorn
   sudo systemctl stop speech-driven-lessons
   ```

2. **Revert code changes**
   ```bash
   git checkout main
   git pull origin main  # Get pre-migration state
   ```

3. **Restore environment variables**
   ```bash
   # Edit .env
   # Uncomment AWS credentials
   # Comment out Supabase credentials
   ```

4. **Reinstall dependencies**
   ```bash
   pip install boto3  # If removed
   pip install -r backend/requirements.txt
   ```

5. **Restart application**
   ```bash
   sudo systemctl start speech-driven-lessons
   ```

6. **Verify S3 connectivity**
   - Test file upload
   - Test file download
   - Verify course listings

### Delayed Rollback (If data was written to Supabase)

1. Follow immediate rollback steps above

2. **Sync new data back to S3** (if any was created in Supabase)
   ```bash
   python scripts/sync_supabase_to_s3.py --created-after "2024-01-15"
   ```

3. **Verify data integrity**
   - Compare file counts
   - Test affected courses

---

## Risk Monitoring

### Pre-Migration Checklist
- [ ] All risks reviewed and accepted
- [ ] Mitigation strategies in place
- [ ] Rollback plan tested
- [ ] Monitoring alerts configured
- [ ] Team notified of migration window

### During Migration
- [ ] Monitor error logs
- [ ] Check Supabase dashboard for errors
- [ ] Verify file counts periodically
- [ ] Test critical paths after each phase

### Post-Migration (First 7 Days)
- [ ] Monitor error rates daily
- [ ] Check storage costs
- [ ] Gather user feedback
- [ ] Keep S3 bucket as backup
- [ ] Review performance metrics

---

## Approval

| Role | Name | Date | Accepted Risks |
|------|------|------|----------------|
| Tech Lead | | | [ ] Yes |
| Product Owner | | | [ ] Yes |
| DevOps | | | [ ] Yes |
