# Start Robyn Backend Server
# This script starts the Python Robyn backend using uv
# Robyn is a high-performance web framework powered by Rust

param(
    [switch]$Debug = $true,
    [int]$Port = 5000,
    [string]$BindAddress = "0.0.0.0"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"

# Function to import .env file and set environment variables
function Import-EnvFile {
    param(
        [string]$FilePath
    )

    if (-not (Test-Path $FilePath)) {
        return
    }

    Get-Content $FilePath | ForEach-Object {
        $line = $_.Trim()

        # Skip empty lines and comments
        if ([string]::IsNullOrWhiteSpace($line) -or $line.StartsWith('#')) {
            return
        }

        # Split on first = sign to handle values with = in them
        $equalIndex = $line.IndexOf('=')
        if ($equalIndex -gt 0) {
            $key = $line.Substring(0, $equalIndex).Trim()
            $value = $line.Substring($equalIndex + 1).Trim()

            # Remove quotes if present (single or double)
            if ($value.Length -ge 2) {
                if (($value.StartsWith('"') -and $value.EndsWith('"')) -or
                    ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
            }

            # Set environment variable
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Starting Robyn Backend Server" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if uv is available
try {
    $null = Get-Command uv -ErrorAction Stop
    $uvVersion = uv --version
    Write-Host "Using uv: $uvVersion" -ForegroundColor Gray
}
catch {
    Write-Host "ERROR: uv not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install uv:" -ForegroundColor Yellow
    Write-Host "  winget install astral-sh.uv" -ForegroundColor Gray
    Write-Host "  # or" -ForegroundColor Gray
    Write-Host "  scoop install uv" -ForegroundColor Gray
    exit 1
}

# Check if backend .env exists (prefer .env.local, fallback to .env)
$envLocalFile = Join-Path $backendDir ".env.local"
$envFile = Join-Path $backendDir ".env"

if (Test-Path $envLocalFile) {
    Write-Host "Using backend/.env.local" -ForegroundColor Green
    $envFile = $envLocalFile
}
elseif (Test-Path $envFile) {
    Write-Host "Using backend/.env (fallback)" -ForegroundColor Yellow
}
else {
    Write-Host "ERROR: backend/.env.local or backend/.env file not found!" -ForegroundColor Red
    Write-Host "Please create one of these files before starting the backend server." -ForegroundColor Yellow
    exit 1
}

# Import environment variables from the selected .env file
Write-Host "Loading environment variables from $(Split-Path -Leaf $envFile)..." -ForegroundColor Gray
Import-EnvFile -FilePath $envFile

# Check if port is in use
$portInUse = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "`nWARNING: Port $Port is already in use!" -ForegroundColor Yellow
    $response = Read-Host "Kill existing process? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        $processId = $portInUse.OwningProcess
        Stop-Process -Id $processId -Force
        Write-Host "Killed process $processId" -ForegroundColor Yellow
        Start-Sleep -Seconds 1
    }
    else {
        Write-Host "Aborting..." -ForegroundColor Red
        exit 1
    }
}

# Change to backend directory
Push-Location $backendDir

try {
    Write-Host "`nStarting Robyn server on $BindAddress`:$Port..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray

    # Use Python 3.12 to avoid LangChain/Pydantic V1 deprecation warning on 3.14+
    # (run `uv python install 3.12` if missing)
    # Robyn uses its own Rust-based server, not uvicorn
    uv run --python 3.12 robyn main.py
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
