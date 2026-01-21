# Commit Checks Setup Guide

This repository uses multiple tools to prevent committing secrets and ensure code quality.

**Monorepo Coverage**: Checks both backend (Python) and frontend (Next.js/TypeScript) code. See `MONOREPO-SECRET-CHECKS.md` for frontend-specific patterns.

## Quick Setup

### 1. Install Pre-commit (Recommended)

```powershell
# Using uv (recommended for this project)
# Run the setup script (installs dev dependencies including pre-commit)
.\scripts\setup-pre-commit.ps1

# Or manually with uv:
cd backend
uv sync --group dev
uv run pre-commit install

# Or with pip (if not using uv):
pip install pre-commit
pre-commit install
```

### 2. Install Git-secrets (Optional but Recommended)

```powershell
# Install via Chocolatey
choco install git-secrets

# Run the setup script
.\scripts\setup-git-secrets.ps1

# Or manually:
git secrets --install
git secrets --register-aws
```

## What Gets Checked

### Pre-commit Hooks

The `.pre-commit-config.yaml` file configures these checks:

1. **File Quality**
   - Trailing whitespace removal
   - End of file fixes
   - YAML/JSON/TOML validation
   - Large file detection (>1MB)

2. **Python Code Quality** (backend/)
   - **Black**: Code formatting (100 char line length)
   - **Flake8**: Linting with bugbear and docstring checks
   - **isort**: Import sorting (Black-compatible)

3. **Security** (Monorepo: backend/ + app/ + components/ + lib/)
   - **detect-secrets**: Scans for hardcoded credentials in:
     - Python files (`.py`)
     - JavaScript/TypeScript files (`.js`, `.ts`, `.tsx`, `.jsx`)
     - Configuration files (`.env`, `.yaml`, `.yml`)
   - Baseline file: `.secrets.baseline` (commit this!)

### Git-secrets

Additional pattern-based secret detection for both Python and JavaScript/TypeScript:
- **Python**: `password=`, `api_key=`, `secret_key=`, etc.
- **JavaScript/TypeScript**: 
  - `NEXT_PUBLIC_*` with hardcoded values
  - `process.env.*` with hardcoded secrets
  - `apiKey:`, `secretKey:`, `accessToken:`, etc.
- **Common**: AWS credentials, API keys, passwords, access tokens, private keys, Bearer tokens

## Manual Checks

### Run Pre-commit on All Files

```powershell
# Using uv (recommended)
cd backend
uv run pre-commit run --all-files

# Or if pre-commit is in PATH:
pre-commit run --all-files
```

### Manual Secret Scan

```powershell
# Quick scan
.\scripts\manual-secret-check.ps1

# Verbose scan (shows matching lines)
.\scripts\manual-secret-check.ps1 -Verbose

# Scan specific directory
.\scripts\manual-secret-check.ps1 -Path "backend/api"
```

### Using findstr (Windows Native)

```cmd
REM Search for password patterns in Python
findstr /i /s "password" backend\*.py

REM Search for API keys in Python
findstr /i /s "api_key" backend\*.py

REM Search for secrets in JavaScript/TypeScript
findstr /i /s "NEXT_PUBLIC_" app\*.ts app\*.tsx
findstr /i /s "apiKey" app\*.ts app\*.tsx components\*.ts components\*.tsx

REM Search across entire monorepo
findstr /i /s /c:"password" /c:"api_key" /c:"secret" backend\*.py app\*.ts app\*.tsx
```

## Bypassing Checks (Use Sparingly!)

```powershell
# Skip pre-commit hooks for one commit
git commit --no-verify

# Skip git-secrets for one commit
git commit --no-verify
```

**Warning**: Only bypass if you're absolutely sure there are no secrets!

## Updating Baselines

When you add legitimate files that contain test secrets or examples:

```powershell
# Update detect-secrets baseline
detect-secrets scan --baseline .secrets.baseline

# Review the changes
git diff .secrets.baseline

# Commit the updated baseline
git add .secrets.baseline
git commit -m "Update secrets baseline"
```

## Troubleshooting

### Pre-commit Not Running

```powershell
# Reinstall hooks
pre-commit uninstall
pre-commit install

# Clear cache
pre-commit clean
```

### Git-secrets Not Working

```powershell
# Reinstall git-secrets hooks
git secrets --install --force

# Test with a dummy file
echo 'password = "test"' > test.py
git add test.py
git commit -m "test"  # Should be blocked
```

### Hook Dependencies Missing

```powershell
# Using uv (recommended)
cd backend
uv sync --group dev

# Or with pip:
pip install black flake8 isort detect-secrets flake8-docstrings flake8-bugbear
```

## Best Practices

1. **Never commit secrets** - Use environment variables or `.env` files (gitignored)
2. **Review baselines** - When `.secrets.baseline` changes, review why
3. **Fix formatting** - Let Black format your code automatically
4. **Run checks locally** - Don't wait for CI to catch issues
5. **Update baselines** - When adding test fixtures with secrets, update the baseline

## CI/CD Integration

These checks should also run in your CI pipeline:

```yaml
# Example GitHub Actions
- name: Run pre-commit
  run: pre-commit run --all-files

- name: Check for secrets
  run: git secrets --scan
```

## Files to Review

- `.pre-commit-config.yaml` - Pre-commit hook configuration
- `.secrets.baseline` - Baseline for detect-secrets (commit this!)
- `.gitignore` - Already configured for `.env`, `__pycache__`, etc.
- `scripts/setup-pre-commit.ps1` - Setup script
- `scripts/setup-git-secrets.ps1` - Git-secrets setup
- `scripts/manual-secret-check.ps1` - Manual scanning tool
