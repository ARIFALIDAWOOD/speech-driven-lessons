# Start Flask Backend Server
# This script starts the Python Flask backend with SocketIO using uv

param(
    [switch]$Debug = $true,
    [int]$Port = 5000,
    [string]$BindAddress = "0.0.0.0"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot "backend"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Starting Flask Backend Server" -ForegroundColor Cyan
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

# Check if backend .env exists
$envFile = Join-Path $backendDir ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "WARNING: backend/.env file not found!" -ForegroundColor Yellow
    Write-Host "Creating from .env.example..." -ForegroundColor Yellow

    $exampleEnv = Join-Path $backendDir ".env.example"
    if (Test-Path $exampleEnv) {
        Copy-Item $exampleEnv $envFile
        Write-Host "Created .env file. Please update it with your actual values!" -ForegroundColor Yellow
    }
    else {
        Write-Host "ERROR: No .env.example found. Please create backend/.env manually." -ForegroundColor Red
        exit 1
    }
}

# Check if port is in use
$portInUse = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "`nWARNING: Port $Port is already in use!" -ForegroundColor Yellow
    $response = Read-Host "Kill existing process? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        $pid = $portInUse.OwningProcess
        Stop-Process -Id $pid -Force
        Write-Host "Killed process $pid" -ForegroundColor Yellow
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
    Write-Host "`nStarting Flask server on $BindAddress`:$Port..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray

    # Set environment variables
    $env:FLASK_APP = "app.py"
    $env:FLASK_ENV = if ($Debug) { "development" } else { "production" }
    $env:FLASK_DEBUG = if ($Debug) { "1" } else { "0" }

    # Run the Flask app using uv
    uv run python app.py
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
