# Quick Setup: Commit Checks

## One-Command Setup (Recommended)

```powershell
# Run the automated setup script
.\scripts\setup-pre-commit.ps1
```

This will:
- Install pre-commit if needed
- Install all hook dependencies
- Set up the git hooks
- Create the secrets baseline

## Manual Setup

### Step 1: Install Pre-commit

```powershell
# Using uv (recommended for this project)
cd backend
uv sync --group dev

# Or with pip:
pip install pre-commit
```

### Step 2: Install Git-secrets (Optional)

```powershell
# Via Chocolatey
choco install git-secrets

# Then run setup
.\scripts\setup-git-secrets.ps1
```

### Step 3: Initialize Pre-commit

```powershell
# Using uv (recommended)
cd backend
uv run pre-commit install

# Or if pre-commit is in PATH:
pre-commit install
```

### Step 4: Create Secrets Baseline

```powershell
# Using uv (recommended)
cd backend
uv run detect-secrets create --baseline .secrets.baseline

# Or with pip:
pip install detect-secrets
detect-secrets create --baseline .secrets.baseline
```

## Verify Setup

```powershell
# Test pre-commit (using uv)
cd backend
uv run pre-commit run --all-files

# Or if pre-commit is in PATH:
pre-commit run --all-files

# Test git-secrets (if installed)
echo 'password = "test"' > test.py
git add test.py
git commit -m "test"  # Should be blocked
rm test.py
```

## What's Included

✅ **Pre-commit hooks** - Runs automatically on commit
✅ **Git-secrets** - Additional pattern-based detection  
✅ **Manual scan script** - `.\scripts\manual-secret-check.ps1` (scans entire monorepo)
✅ **Code formatting** - Black, isort, flake8 (Python)
✅ **Monorepo coverage** - Checks both backend (Python) and frontend (Next.js/TypeScript)

See `README-COMMIT-CHECKS.md` for full documentation.
