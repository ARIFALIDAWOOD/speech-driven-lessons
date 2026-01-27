# Phase 2 Acceptance Tests

Tests for Phase 2: Gap Resolution - Course Outline & Embeddings

## Running Tests

```bash
# From backend directory
uv run pytest tests/phase02/ -v

# Run only unit tests
uv run pytest tests/phase02/ -v -m unit

# Run with coverage
uv run pytest tests/phase02/ -v --cov=.
```

## Test Coverage

| ID | Criteria | Test File | Status |
|----|----------|-----------|--------|
| P2-1 | Event system works | `test_events.py` | Automated |
| P2-2 | Event bus pub/sub | `test_events.py` | Automated |
| P2-3 | Embedding worker debouncing | `test_embedding_worker.py` | Automated |
| P2-4 | Course plan schema | `test_course_plan.py` | Automated |
| P2-5 | Plan serialization | `test_course_plan.py` | Automated |
| P2-6 | File upload triggers embedding rebuild | Manual | Manual |
| P2-7 | UI shows embeddings status | Manual | Manual |
| P2-8 | UI shows plan status | Manual | Manual |

## Manual Test Checklist

### P2-6: File Upload Triggers Embedding Rebuild
1. Upload a PDF file to a course
2. Check that `embeddings_status` changes to "building"
3. Wait for rebuild to complete
4. Verify `embeddings_status` is "ready"

### P2-7: UI Shows Embeddings Status
1. Open course settings page
2. Verify embeddings status indicator is visible
3. Upload a new file
4. Verify status changes to "building" with spinner
5. Wait for completion and verify status shows "ready"

### P2-8: UI Shows Plan Status
1. Open course settings page
2. Verify plan status indicator is visible
3. Click "Generate Plan" button
4. Verify status changes to "generating" with spinner
5. Wait for completion and verify shows version number
