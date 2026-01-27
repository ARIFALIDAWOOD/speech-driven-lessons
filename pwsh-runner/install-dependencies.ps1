# Install Dependencies
# This script installs all required dependencies for the Anantra LMS project

param(
    [switch]$SkipNode = $false,
    [switch]$SkipPython = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Installing Anantra LMS Dependencies" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Install Node.js dependencies
if (-not $SkipNode) {
    Write-Host "--- Installing Node.js Dependencies ---" -ForegroundColor Magenta

    Push-Location $projectRoot

    try {
        if (-not (Test-Path "package.json")) {
            Write-Host "ERROR: package.json not found in $projectRoot" -ForegroundColor Red
            exit 1
        }

        Write-Host "Running npm install..." -ForegroundColor Yellow
        npm install

        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed"
        }

        Write-Host "Node.js dependencies installed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "Skipping Node.js dependencies (--SkipNode)" -ForegroundColor Gray
}

# Install Python dependencies using uv
if (-not $SkipPython) {
    Write-Host "`n--- Installing Python Dependencies (via uv) ---" -ForegroundColor Magenta

    # Check if uv is installed
    try {
        $null = Get-Command uv -ErrorAction Stop
        $uvVersion = uv --version
        Write-Host "Found uv: $uvVersion" -ForegroundColor Gray
    }
    catch {
        Write-Host "ERROR: uv not found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install uv first:" -ForegroundColor Yellow
        Write-Host "  winget install astral-sh.uv" -ForegroundColor Gray
        Write-Host "  # or" -ForegroundColor Gray
        Write-Host "  scoop install uv" -ForegroundColor Gray
        exit 1
    }

    Push-Location $backendDir

    try {
        # Check if pyproject.toml exists
        $pyproject = Join-Path $backendDir "pyproject.toml"

        if (Test-Path $pyproject) {
            Write-Host "Found pyproject.toml, running uv sync..." -ForegroundColor Yellow
            uv sync

            if ($LASTEXITCODE -ne 0) {
                throw "uv sync failed"
            }
        }
        else {
            Write-Host "No pyproject.toml found. Creating one..." -ForegroundColor Yellow

            # Create pyproject.toml with required dependencies
            $pyprojectContent = @"
[project]
name = "anantra-lms-backend"
version = "0.1.0"
description = "Backend for Anantra LMS Speech-Driven Lessons"
requires-python = ">=3.10"
dependencies = [
    "robyn>=0.68.0",
    "python-multipart>=0.0.6",
    "python-dotenv>=1.0.0",
    "openai>=1.0.0",
    "tiktoken>=0.5.0",
    "numpy>=1.24.0",
    "faiss-cpu>=1.7.0",
    "supabase>=2.0.0",
    "firebase-admin>=6.0.0",
    "redis>=5.0.0",
    "websockets>=12.0",
]

[tool.uv]
dev-dependencies = []
"@

            # Write without BOM
            [System.IO.File]::WriteAllText($pyproject, $pyprojectContent)
            Write-Host "Created pyproject.toml" -ForegroundColor Green

            Write-Host "Running uv sync..." -ForegroundColor Yellow
            uv sync

            if ($LASTEXITCODE -ne 0) {
                throw "uv sync failed"
            }
        }

        Write-Host "Python dependencies installed successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host "ERROR: $_" -ForegroundColor Red
        exit 1
    }
    finally {
        Pop-Location
    }
}
else {
    Write-Host "Skipping Python dependencies (--SkipPython)" -ForegroundColor Gray
}

# Create environment files if they don't exist
Write-Host "`n--- Setting Up Environment Files ---" -ForegroundColor Magenta

$envFiles = @(
    @{ Source = Join-Path $projectRoot ".env.example"; Dest = Join-Path $projectRoot ".env.local" },
    @{ Source = Join-Path $backendDir ".env.example"; Dest = Join-Path $backendDir ".env" }
)

foreach ($env in $envFiles) {
    if (-not (Test-Path $env.Dest)) {
        if (Test-Path $env.Source) {
            Copy-Item $env.Source $env.Dest
            Write-Host "Created: $($env.Dest)" -ForegroundColor Green
            Write-Host "  Please update with your actual values!" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "Exists: $($env.Dest)" -ForegroundColor Gray
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Update .env.local with your frontend configuration" -ForegroundColor White
Write-Host "2. Update backend/.env with your backend configuration" -ForegroundColor White
Write-Host "3. Run .\pwsh-runner\start-all.ps1 to start the stack" -ForegroundColor White
Write-Host ""
