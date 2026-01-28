# Backend Framework Migration Summary

> **Current status:** The active backend framework is **Robyn**. References to Flask and FastAPI below describe the historical migration path only; the Flask app and FastAPI entrypoint/routers have been removed from the runtime codebase.

## Migration Path

```
Flask → FastAPI → Robyn
```

## Current Framework: Robyn

**Robyn** is a high-performance Python web framework powered by a Rust runtime (Actix).

### Key Benefits

- **Rust-powered performance**: Up to 4x faster than FastAPI in some benchmarks
- **Native async support**: Built-in async/await without ASGI overhead
- **Automatic OpenAPI docs**: Available at `/docs`
- **Type-safe routing**: Similar to FastAPI with request/response models
- **WebSocket support**: Native WebSocket handling

### File Structure

```
backend/
├── main.py              # Robyn app entry point
├── robyn_routers/       # Robyn routers
│   ├── __init__.py
│   ├── auth.py          # Supabase authentication handler
│   ├── course.py        # Course management routes
│   ├── tutor_session.py # Tutor session routes
│   ├── assistant.py     # Chatbot/AI assistant routes
│   └── websocket_router.py  # WebSocket handling
├── utils/               # Shared utilities
├── functions/           # Business logic
└── (legacy FastAPI/Flask code removed from runtime)
```

## Running the Server

### Development
```bash
cd backend
uv run python main.py
```

Or using the PowerShell script:
```powershell
.\pwsh-runner\start-backend.ps1
```

### Production
```bash
cd backend
uv run python main.py --log-level WARN
```

## API Documentation

- **Swagger UI**: http://localhost:5000/docs
- **OpenAPI JSON**: http://localhost:5000/openapi.json

## Authentication

Authentication uses Supabase JWT tokens:

1. Client sends `Authorization: Bearer <token>` header
2. Robyn's `AuthenticationHandler` validates via Supabase client
3. User info available in `request.identity.claims`

### Example Protected Route

```python
from robyn import SubRouter, Request
from robyn_routers.auth import get_auth_handler, require_auth

router = SubRouter(__file__, prefix="/api/example")
router.configure_authentication(get_auth_handler())

@router.get("/protected", auth_required=True)
async def protected_route(request: Request):
    user = require_auth(request)
    return {"email": user["email"]}
```

## Key Differences from FastAPI

| Feature | FastAPI | Robyn |
|---------|---------|-------|
| Server | uvicorn (ASGI) | Actix (Rust) |
| Path params | `{param}` | `:param` |
| Request body | Pydantic models | `request.json()` |
| Responses | Direct return | Dict with `status_code` for errors |
| WebSocket | `@app.websocket()` | `WebSocket(app, "/path")` |

## Rollback to FastAPI

If needed, you can rollback to FastAPI:

1. Rename `main_fastapi.py` to `main.py`
2. Update `pyproject.toml` to add back FastAPI/uvicorn:
   ```toml
   "fastapi>=0.104.0",
   "uvicorn[standard]>=0.24.0",
   ```
3. Remove `robyn` from dependencies
4. Run `uv sync`
5. Start with: `uv run uvicorn main:app --reload`

## Environment Variables

Same as before - see `.env.example`. The main change is that `FLASK_SECRET_KEY` is no longer needed.

---

# Previous Migration: Flask to FastAPI

## Completed Tasks

### 1. FastAPI Structure Setup
- Created `backend/main_fastapi.py` - FastAPI application entry point
- Created `backend/dependencies/auth.py` - Authentication dependency using Supabase client
- Created `backend/routers/` directory structure
- Updated `backend/pyproject.toml` - Added FastAPI, removed Flask dependencies

### 2. Authentication Migration
- Created `get_current_user` dependency that uses Supabase client
- Eliminated manual JWT verification (`verify_supabase_token`)
- Uses `SUPABASE_ANON_KEY` instead of `SUPABASE_JWT_SECRET`

### 3. Route Migration
- Migrated course routes (`backend/routers/course.py`)
- Migrated tutor session routes (`backend/routers/tutor_session.py`)
- Migrated assistant routes (`backend/routers/assistant.py`)

### 4. WebSocket Migration
- Created FastAPI WebSocket router (`backend/routers/websocket.py`)
- Updated socket utilities for FastAPI compatibility

## Breaking Changes (from Flask)

1. **WebSocket Protocol**: Frontend needs to use native WebSocket instead of Socket.IO
2. **Environment Variables**: `SUPABASE_JWT_SECRET` → `SUPABASE_ANON_KEY`
3. **Server Entry Point**: `app.py` → `main.py`

## Additional Resources

- Robyn Documentation: https://robyn.tech/
- FastAPI Documentation: https://fastapi.tiangolo.com/
- Supabase Python Client: https://supabase.com/docs/reference/python/introduction
