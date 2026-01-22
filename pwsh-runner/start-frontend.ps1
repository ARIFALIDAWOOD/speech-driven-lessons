# Start Next.js Frontend Development Server
# This script starts the Next.js frontend

param(
    [int]$Port = 3391,
    [switch]$Turbo = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Starting Next.js Frontend Server" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if .env files exist (prefer .env.local, fallback to .env)
$envLocalFile = Join-Path $projectRoot ".env.local"
$envFile = Join-Path $projectRoot ".env"

if (Test-Path $envLocalFile) {
    Write-Host "Using .env.local" -ForegroundColor Green
    $envFile = $envLocalFile
}
elseif (Test-Path $envFile) {
    Write-Host "Using .env (fallback)" -ForegroundColor Yellow
}
else {
    Write-Host "ERROR: .env.local or .env file not found!" -ForegroundColor Red
    Write-Host "Please create one of these files before starting the frontend server." -ForegroundColor Yellow
    exit 1
}

# Check node_modules
$nodeModules = Join-Path $projectRoot "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "node_modules not found. Installing dependencies..." -ForegroundColor Yellow
    Push-Location $projectRoot
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location
    Write-Host "Dependencies installed successfully!" -ForegroundColor Green
}

# Check if port is in use
$portInUse = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "WARNING: Port $Port is already in use!" -ForegroundColor Yellow
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

# Change to project root
Push-Location $projectRoot

try {
    Write-Host "Starting Next.js on port $Port..." -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Gray

    # Set PORT environment variable for Next.js
    $env:PORT = $Port

    if ($Turbo) {
        npx next dev --turbo
    }
    else {
        npx next dev
    }
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
