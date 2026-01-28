# FastAPI Migration Guide (Archived)

> **Note:** The backend now uses Robyn as the canonical web framework. This document is retained only for historical reference about the intermediate FastAPI phase; the FastAPI code it refers to has been removed from the active codebase.

This document describes the migration from Flask to FastAPI with Supabase RLS authentication.

## Overview

The backend has been migrated from Flask to FastAPI to:
- Eliminate manual JWT token verification
- Use Supabase client for automatic authentication
- Leverage FastAPI's native Supabase integration
- Improve type safety with Pydantic models
- Support async/await natively

## Key Changes

### Authentication

**Before (Flask):**
- Manual JWT verification using `verify_supabase_token()`
- Required `SUPABASE_JWT_SECRET` environment variable
- Manual token extraction from headers

**After (FastAPI):**
- Automatic authentication via Supabase client
- Uses `SUPABASE_ANON_KEY` instead of `SUPABASE_JWT_SECRET`
- Dependency injection pattern: `user: dict = Depends(get_current_user)`

### Route Structure

**Before (Flask):**
```python
@course.route("/create-course", methods=["POST"])
def create_course():
    user_email = user_utils.get_current_user(request)
    if not user_email:
        return jsonify({"error": "Unauthorized"}), 401
    # ...
```

**After (FastAPI):**
```python
@router.post("/create-course")
async def create_course(
    course_data: CourseCreateRequest,
    user: dict = Depends(get_current_user)
):
    user_email = user["email"]
    # ...
```

### WebSocket

**Before (Flask-SocketIO):**
- Used Flask-SocketIO for real-time communication
- Event-based handlers

**After (FastAPI):**
- Native WebSocket support
- Async WebSocket handlers
- Connection management in `routers/websocket.py`

## Environment Variables

### Removed
- `SUPABASE_JWT_SECRET` - No longer needed

### Added
- `SUPABASE_ANON_KEY` - Required for Supabase client authentication

### Updated `.env.example`
```bash
# Remove this line:
# SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# Add this line:
SUPABASE_ANON_KEY=your-anon-key-here
```

## Running the Server

### Development
```bash
cd backend
uv run python main.py
```

Or using uvicorn directly:
```bash
cd backend
uv run uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

### Production
```bash
uv run uvicorn main:app --host 0.0.0.0 --port 5000 --workers 4
```

## API Documentation

FastAPI automatically generates interactive API documentation:

- Swagger UI: http://localhost:5000/docs
- ReDoc: http://localhost:5000/redoc

## Migration Status

### ✅ Completed
- FastAPI application structure (`backend/main.py`)
- Authentication dependency (`backend/dependencies/auth.py`)
- Course routes (`backend/routers/course.py`)
- Tutor session routes (`backend/routers/tutor_session.py`)
- Assistant routes (`backend/routers/assistant.py`)
- WebSocket router (`backend/routers/websocket.py`)
- Updated dependencies (`backend/pyproject.toml`)

### 🔄 In Progress
- Frontend API calls (need to update to use Supabase client directly where possible)
- Tests migration to FastAPI TestClient

### 📝 TODO
- Remove old Flask code (`backend/app.py` can be kept for reference)
- Update test fixtures
- Update frontend WebSocket client for FastAPI WebSocket
- Update documentation (AGENTS.md)

## Breaking Changes

1. **Authentication**: Frontend must send `Authorization: Bearer <token>` header (same as before, but backend handles it differently)

2. **WebSocket**: Frontend WebSocket client needs to be updated:
   - Old: `socketio.connect('http://localhost:5000')`
   - New: `new WebSocket('ws://localhost:5000/ws')`

3. **Response Format**: FastAPI returns JSON directly (no `jsonify()` needed), but format is the same

## Testing

To test the new FastAPI backend:

```bash
cd backend
uv run pytest
```

Note: Tests need to be updated to use FastAPI TestClient instead of Flask test client.

## Rollback

If you need to rollback to Flask:
1. Use `backend/app.py` (still exists)
2. Restore Flask dependencies in `pyproject.toml`
3. Restore `SUPABASE_JWT_SECRET` in `.env`

## Next Steps

1. Update frontend to use Supabase client directly for database operations
2. Migrate remaining routes if any
3. Update tests
4. Remove Flask dependencies once migration is complete
5. Update deployment configuration
