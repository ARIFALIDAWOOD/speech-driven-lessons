# Start Supabase Local Development Stack
# This script starts the Supabase services using Docker

param(
    [switch]$Detached = $true,
    [switch]$NoSeed = $false
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Starting Supabase Local Stack" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if Docker is running
try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker is not running"
    }
}
catch {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Change to project root where supabase folder is located
Push-Location $projectRoot

try {
    # Check if Supabase is already running
    $status = supabase status 2>&1
    if ($LASTEXITCODE -eq 0 -and $status -match "supabase local development setup is running") {
        Write-Host "Supabase is already running!" -ForegroundColor Yellow
        Write-Host "`nServices:" -ForegroundColor Green
        supabase status
        exit 0
    }

    # Start Supabase
    Write-Host "Starting Supabase services..." -ForegroundColor Yellow

    if ($NoSeed) {
        supabase start --ignore-health-check
    }
    else {
        supabase start
    }

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to start Supabase"
    }

    Write-Host "`nSupabase started successfully!" -ForegroundColor Green
    Write-Host "`nService URLs:" -ForegroundColor Cyan
    supabase status

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Supabase is ready!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
