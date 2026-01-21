# PowerShell script to set up pre-commit hooks
# Run this script to install and configure pre-commit
# Uses uv for package management

Write-Host "Setting up pre-commit hooks..." -ForegroundColor Cyan

# Check if uv is available
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: uv is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install uv: https://github.com/astral-sh/uv" -ForegroundColor Yellow
    Write-Host "Or run: pip install uv" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the backend directory or root
$backendDir = if (Test-Path "backend\pyproject.toml") { "backend" } else { "." }

# Install dev dependencies (includes pre-commit and hook tools)
Write-Host "Installing dev dependencies with uv..." -ForegroundColor Green
Push-Location $backendDir
uv sync --group dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install dev dependencies." -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Check if pre-commit is available
Write-Host "Checking for pre-commit..." -ForegroundColor Green
$preCommitAvailable = & uv run --directory $backendDir pre-commit --version 2>$null

if (-not $preCommitAvailable) {
    Write-Host "ERROR: pre-commit is not available after installation." -ForegroundColor Red
    exit 1
} else {
    Write-Host "pre-commit is available." -ForegroundColor Green
}

# Install pre-commit hooks
Write-Host "Installing pre-commit hooks..." -ForegroundColor Green
& uv run --directory $backendDir pre-commit install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install pre-commit hooks." -ForegroundColor Red
    exit 1
}

# Initialize detect-secrets baseline if it doesn't exist
if (-not (Test-Path ".secrets.baseline")) {
    Write-Host "Creating detect-secrets baseline..." -ForegroundColor Green
    & uv run --directory $backendDir detect-secrets create --baseline .secrets.baseline
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Baseline created. Review .secrets.baseline and commit it." -ForegroundColor Yellow
    } else {
        Write-Host "Warning: Could not create baseline. You can create it manually later." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Pre-commit hooks are now active. They will run automatically on commit." -ForegroundColor Cyan
Write-Host ""
Write-Host "To run hooks manually on all files:" -ForegroundColor Yellow
Write-Host "  uv run --directory $backendDir pre-commit run --all-files" -ForegroundColor Yellow
Write-Host ""
Write-Host "To skip hooks for a single commit:" -ForegroundColor Yellow
Write-Host "  git commit --no-verify" -ForegroundColor Yellow
