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
├── backend/                # Python Flask backend
│   ├── api/                # API endpoints
│   ├── routes/             # Route handlers
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
- Flask
- Flask-SocketIO (real-time communication)
- OpenAI API (chat/assistant)
- Google Gemini (content generation)
- AWS S3 (file storage)
- FAISS (vector store for RAG)
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
   - Retrieval-Augmented Generation using FAISS vector store
   - Context-aware responses based on course content
   - Conversation history stored on S3

3. **Real-Time In-Class Experience**
   - Flask-SocketIO for live slide synchronization
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
```

**Backend:**
```python
# Verify Supabase tokens
from backend.utils.supabase_auth import verify_supabase_token
user_id = verify_supabase_token(id_token)
```

### API Endpoints

- Backend API base: `http://localhost:5000/api`
- Frontend API routes: `/api/*` (Next.js API routes)
- Authentication: Include `Authorization` header with Supabase access token

### Environment Variables

**Frontend (.env.local):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPI_API_KEY`

**Backend (backend/.env):**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_S3_BUCKET_NAME`

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

1. Create route in `backend/routes/` or `backend/api/`
2. Use `verify_supabase_token()` for authentication
3. Register route in `backend/app.py`
4. Update frontend API utilities in `components/my-courses/utils/`

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

- `backend/api/` - API endpoint definitions
- `backend/routes/` - Route handlers (blueprints)
- `backend/utils/` - Utility functions (auth, S3, etc.)
- `backend/functions/` - Business logic functions

## Data Storage

- **AWS S3**: Course files, vector indices, conversation history
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
   # Backend (port 5000)
   cd backend
   uv run python app.py
   
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
- [Flask Documentation](https://flask.palletsprojects.com/)
- [pre-commit Documentation](https://pre-commit.com/)
