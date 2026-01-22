# PowerShell Runner Scripts

This directory contains PowerShell scripts to manage the Anantra LMS development stack.

## Quick Start

```powershell
# First time setup
.\pwsh-runner\install-dependencies.ps1

# Start all services
.\pwsh-runner\start-all.ps1

# Check status
.\pwsh-runner\status.ps1

# Stop all services
.\pwsh-runner\stop-all.ps1
```

## Available Scripts

### `start-all.ps1`
Starts the entire stack (Supabase, Backend, Frontend) in the correct order.

```powershell
# Start everything
.\pwsh-runner\start-all.ps1

# Skip specific services
.\pwsh-runner\start-all.ps1 -SkipSupabase
.\pwsh-runner\start-all.ps1 -SkipBackend
.\pwsh-runner\start-all.ps1 -SkipFrontend

# Skip dependency check
.\pwsh-runner\start-all.ps1 -CheckDeps:$false
```

### `stop-all.ps1`
Stops all running services.

```powershell
# Stop all services gracefully
.\pwsh-runner\stop-all.ps1

# Force stop (kills orphaned processes)
.\pwsh-runner\stop-all.ps1 -Force
```

### `status.ps1`
Shows the status of all services.

```powershell
.\pwsh-runner\status.ps1
```

### `check-dependencies.ps1`
Verifies all required dependencies are installed.

```powershell
.\pwsh-runner\check-dependencies.ps1
```

### `install-dependencies.ps1`
Installs all required dependencies using `npm` for Node.js and `uv` for Python.

```powershell
# Install everything
.\pwsh-runner\install-dependencies.ps1

# Skip specific installations
.\pwsh-runner\install-dependencies.ps1 -SkipNode
.\pwsh-runner\install-dependencies.ps1 -SkipPython
```

### Individual Service Scripts

```powershell
# Start Supabase only
.\pwsh-runner\start-supabase.ps1

# Start Backend only (runs in current window)
.\pwsh-runner\start-backend.ps1
.\pwsh-runner\start-backend.ps1 -Port 5001  # Custom port

# Start Frontend only (runs in current window)
.\pwsh-runner\start-frontend.ps1
.\pwsh-runner\start-frontend.ps1 -Port 3001  # Custom port
.\pwsh-runner\start-frontend.ps1 -Turbo      # Use Turbopack
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Next.js Frontend | 3000 | http://localhost:3000 |
| Flask Backend | 5000 | http://localhost:5000 |
| Supabase API | 55321 | http://localhost:55321 |
| Supabase DB | 55322 | postgresql://localhost:55322 |
| Supabase Studio | 55323 | http://localhost:55323 |
| Supabase Inbucket | 55324 | http://localhost:55324 |
| Supabase Analytics | 55327 | http://localhost:55327 |

## Prerequisites

- **Node.js** (v18+) and npm
- **uv** (Python package manager by Astral) - `winget install astral-sh.uv` or `scoop install uv`
- **Docker Desktop** (for Supabase)
- **Supabase CLI** (`scoop install supabase` or `npm install -g supabase`)

## Platform-Specific Notes

### Windows
Some features are not available on Windows:
- **Voice Assistant (vapi)**: Requires `vapi-python` which depends on `daily-python` (Linux/macOS only)
- **Course Generation**: Requires `course_content_generation` module (may need manual installation)

The backend will start with warnings about these disabled features, but core functionality works.

## Troubleshooting

### Docker not running
Start Docker Desktop before running the scripts.

### Port already in use
The scripts will prompt you to kill existing processes. You can also manually check:
```powershell
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5000"
```

### Python packages missing
Run the install script (uses `uv sync`):
```powershell
.\pwsh-runner\install-dependencies.ps1 -SkipNode
```

### uv not installed
Install uv first:
```powershell
winget install astral-sh.uv
# or
scoop install uv
```

### Environment variables not set
Make sure to create and configure:
- `.env.local` (frontend)
- `backend/.env` (backend)

Copy from the `.env.example` files and fill in your values.
