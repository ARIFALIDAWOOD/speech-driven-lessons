# AI Agents Guide

This document provides essential information for AI agents working on this codebase.

## Project Overview

**Anantra LMS - Speech-Driven Lessons** is a comprehensive Learning Management System (LMS) designed to revolutionize online education through AI-powered course creation and delivery. The platform empowers educators to create, manage, and deliver high-quality courses with intelligent automation and real-time student engagement.

## Architecture

### Monorepo Structure

```
anantra-lms-speech-driven-lessons/
├── app/                    # Next.js frontend (App Router)
│   ├── auth/               # Authentication pages
│   ├── my-courses/         # Course management pages
│   ├── courses/            # Course viewing pages
│   └── ...
├── backend/                # Python Robyn backend (Rust-powered)
│   ├── robyn_routers/      # API routers (Robyn)
│   ├── utils/              # Utility functions
│   └── functions/          # Business logic functions
├── components/             # React components (Shadcn UI)
├── hooks/                  # Custom React hooks
├── lib/                    # Shared libraries
├── public/                 # Static assets
├── scripts/                # Setup and utility scripts
└── supabase/               # Supabase configuration
```

### Technology Stack

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- React
- Tailwind CSS
- Shadcn UI components
- Supabase Auth

**Backend:**
- Python 3.10+
- Robyn (high-performance web framework powered by Rust)
- Native WebSockets (real-time communication)
- OpenAI API (chat/assistant)
- Google Gemini (content generation)
- Supabase Storage (file storage)
- Supabase pgvector (vector store for RAG)
- Supabase (authentication)

**Development Tools:**
- uv (Python package manager)
- pre-commit (code quality hooks)
- detect-secrets (secret scanning)
- Black, Flake8, isort (Python formatting/linting)

## Key Features

1. **AI-Powered Course Creation**
   - Upload documents → Generate course outline → Generate slides with speech
   - Uses Google Gemini for content generation

2. **RAG-Based AI Tutor**
   - Retrieval-Augmented Generation using Supabase's native pgvector extension
   - Context-aware responses based on course content
   - Conversation history stored in Supabase Storage

3. **Real-Time In-Class Experience**
   - Native WebSockets for live slide synchronization
   - Real-time student engagement
   - Voice-driven interactions

4. **Authentication**
   - Supabase Authentication (migrated from Firebase)
   - Session-based token management
   - Protected API routes

## Important Patterns

### Authentication

**Frontend:**
```typescript
// Use Supabase session tokens (NOT Firebase getIdToken)
const { user, session, loading } = useAuth();
const idToken = session?.access_token ?? "";

// For direct Supabase database operations (preferred):
const { data, error } = await supabase
  .from('tutor_sessions')
  .select('*')
  .eq('user_id', user.id);
```

**Backend (Robyn):**
```python
# Robyn authentication - uses auth_required decorator
from robyn import SubRouter, Request
from robyn_routers.auth import get_auth_handler, require_auth

router = SubRouter(__file__, prefix="/api/course")
router.configure_authentication(get_auth_handler())

@router.post("/create-course", auth_required=True)
async def create_course(request: Request):
    user = require_auth(request)
    user_email = user["email"]  # Automatically authenticated
    user_id = user["id"]  # User UUID from Supabase
    body = request.json()  # Access request body
    # No manual JWT verification needed!
```

### API Endpoints

- Backend API base: `http://localhost:5000/api` (Robyn)
- Frontend API routes: `/api/*` (Next.js API routes)
- Authentication: Include `Authorization: Bearer <token>` header with Supabase access token
- API Documentation: http://localhost:5000/docs (Swagger UI)

### Environment Variables

**Frontend (.env.local):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPI_API_KEY`

**Backend (backend/.env):**
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (for authentication - replaces SUPABASE_JWT_SECRET)
- `SUPABASE_SERVICE_ROLE_KEY` (for storage operations)
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `SUPABASE_BUCKET_NAME` (Supabase Storage bucket name)

## Code Quality Standards

### Pre-commit Hooks

The project uses pre-commit hooks for:
- **Black**: Python code formatting (100 char line length)
- **Flake8**: Python linting (with bugbear and docstrings)
- **isort**: Import sorting (Black-compatible)
- **detect-secrets**: Secret scanning (monorepo-wide)

### Running Checks

```powershell
# Setup (using uv)
cd backend
uv sync --group dev
uv run pre-commit install

# Run checks
uv run pre-commit run --all-files

# Manual secret scan
.\scripts\manual-secret-check.ps1
```

## Common Tasks

### Adding a New Page

1. Create file in `app/[route]/page.tsx`
2. Use `useAuth()` hook for authentication
3. Use `session?.access_token` for API calls
4. Follow existing patterns for API integration

### Adding a New API Endpoint

1. Create route in `backend/robyn_routers/` (Robyn router)
2. Use `auth_required=True` and `require_auth(request)` for authentication
3. Register router in `backend/main.py` with `app.include_router()`
4. Access request body with `request.json()`, path params with `request.path_params`
5. Update frontend API utilities in `components/my-courses/utils/`

### Adding a New Component

1. Use Shadcn UI components from `components/ui/`
2. Follow TypeScript patterns
3. Use Tailwind CSS for styling
4. Export from appropriate index file

## File Organization

### Frontend Components

- `components/ui/` - Shadcn UI base components
- `components/my-courses/` - Course management components
- `components/creator-edit/` - Course editing components
- `components/dashboard/` - Dashboard components

### Backend Structure

- `backend/robyn_routers/` - API routers (Robyn SubRouters)
- `backend/utils/` - Utility functions (S3, auth, etc.)
- `backend/functions/` - Business logic functions
- `backend/main.py` - Robyn app entry point

## Data Storage

- **Supabase Storage**: Course files, conversation history
- **Supabase Database (pgvector)**: Vector embeddings for RAG
- **Supabase**: User authentication and metadata
- **Local Storage**: User preferences, session data

## Development Workflow

1. **Setup:**
   ```powershell
   # Backend
   cd backend
   uv sync --group dev
   uv run pre-commit install
   
   # Frontend
   npm install
   ```

2. **Running:**
   ```powershell
   # Backend (port 5000) - Robyn
   cd backend
   uv run python main.py

   # Frontend (port 3391)
   npm run dev
   ```

3. **Before Committing:**
   - Run `uv run pre-commit run --all-files`
   - Check for secrets: `.\scripts\manual-secret-check.ps1`
   - Ensure all tests pass

## Important Notes

- **Never commit secrets** - Use environment variables
- **Always use `session?.access_token`** - Not `user.getIdToken()`
- **Backend uses Robyn** - High-performance Rust-powered framework (see `backend/main.py`)
- **Authentication via decorator** - Use `auth_required=True` and `require_auth(request)` in routes
- **No manual JWT verification** - Supabase client handles it automatically
- **Run pre-commit checks** - Before pushing code
- **Update .secrets.baseline** - When adding test fixtures with secrets
- **Use uv** - Not pip for Python package management

## Troubleshooting

### Authentication Issues
- Verify Supabase credentials in `.env.local` and `backend/.env`
- Check token expiration (Supabase tokens expire)
- Ensure `useAuth()` hook is properly configured

### Pre-commit Failures
- Run `uv run pre-commit run --all-files` to see all issues
- Fix formatting with `uv run black .` and `uv run isort .`
- Update secrets baseline if needed

### Module Not Found
- Run `npm install` for frontend dependencies
- Run `uv sync --group dev` for backend dependencies
- Check import paths use `@/` alias correctly

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [Robyn Documentation](https://robyn.tech/)
- [pre-commit Documentation](https://pre-commit.com/)
