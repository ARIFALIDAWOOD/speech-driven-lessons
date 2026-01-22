# Start All Services
# This script starts the entire Anantra LMS stack

param(
    [switch]$SkipSupabase = $false,
    [switch]$SkipBackend = $false,
    [switch]$SkipFrontend = $false,
    [switch]$CheckDeps = $true
)

$ErrorActionPreference = "Continue"
$scriptDir = $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir

Write-Host @"

    _                        _               _     __  __  ____
   / \   _ __   __ _ _ __  | |_ _ __ __ _  | |   |  \/  |/ ___|
  / _ \ | '_ \ / _` | '_ \ | __| '__/ _` | | |   | |\/| |\___ \
 / ___ \| | | | (_| | | | || |_| | | (_| | | |___| |  | | ___) |
/_/   \_\_| |_|\__,_|_| |_| \__|_|  \__,_| |_____|_|  |_||____/

"@ -ForegroundColor Cyan

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Anantra LMS Full Stack" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Function to test for .env files (prefer .env.local, fallback to .env)
function Test-EnvFile {
    param(
        [string]$Directory,
        [string]$Name
    )

    # Check for .env.local first, then .env as fallback
    $envLocalFile = Join-Path $Directory ".env.local"
    $envFile = Join-Path $Directory ".env"

    if (Test-Path $envLocalFile) {
        Write-Host "  Found: $Name/.env.local" -ForegroundColor Green
        return $envLocalFile
    }
    elseif (Test-Path $envFile) {
        Write-Host "  Found: $Name/.env (fallback)" -ForegroundColor Yellow
        return $envFile
    }
    else {
        Write-Host "  Missing: $Name/.env.local or $Name/.env" -ForegroundColor Red
        return $null
    }
}

# Run dependency check
if ($CheckDeps) {
    Write-Host "Running dependency check..." -ForegroundColor Yellow
    $checkScript = Join-Path $scriptDir "check-dependencies.ps1"
    & $checkScript

    $response = Read-Host "`nContinue with startup? (Y/n)"
    if ($response -eq "n" -or $response -eq "N") {
        Write-Host "Startup cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Check for required .env files
Write-Host "`n--- Checking Environment Files ---" -ForegroundColor Magenta
$envFilesMissing = $false
$backendDir = Join-Path $projectRoot "backend"

# Check backend .env files
if (-not $SkipBackend) {
    $backendEnvFile = Test-EnvFile -Directory $backendDir -Name "backend"
    if (-not $backendEnvFile) {
        $envFilesMissing = $true
    }
}

# Check frontend .env files
if (-not $SkipFrontend) {
    $frontendEnvFile = Test-EnvFile -Directory $projectRoot -Name "frontend"
    if (-not $frontendEnvFile) {
        $envFilesMissing = $true
    }
}

# Exit if required env files are missing
if ($envFilesMissing) {
    Write-Host "`nERROR: Required environment files are missing!" -ForegroundColor Red
    Write-Host "Please create the required .env or .env.local files before starting services." -ForegroundColor Yellow
    Write-Host "`nRequired files:" -ForegroundColor Yellow
    if (-not $SkipBackend) {
        Write-Host "  - backend/.env.local (or backend/.env)" -ForegroundColor White
    }
    if (-not $SkipFrontend) {
        Write-Host "  - .env.local (or .env)" -ForegroundColor White
    }
    exit 1
}

Write-Host "`nAll required environment files found!" -ForegroundColor Green

# Store PIDs for cleanup
$script:pids = @()

function Start-ServiceInNewWindow {
    param(
        [string]$Name,
        [string]$Script,
        [string]$Arguments = ""
    )

    Write-Host "Starting $Name..." -ForegroundColor Yellow

    $scriptPath = Join-Path $scriptDir $Script

    if (-not (Test-Path $scriptPath)) {
        Write-Host "ERROR: Script not found: $scriptPath" -ForegroundColor Red
        return $null
    }

    $process = Start-Process powershell -ArgumentList "-NoExit", "-File", $scriptPath, $Arguments -PassThru
    $script:pids += $process.Id

    Write-Host "$Name started (PID: $($process.Id))" -ForegroundColor Green
    return $process.Id
}

try {
    # 1. Start Supabase (in background, wait for it)
    if (-not $SkipSupabase) {
        Write-Host "`n--- Starting Supabase ---" -ForegroundColor Magenta
        $supabaseScript = Join-Path $scriptDir "start-supabase.ps1"
        & $supabaseScript

        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: Supabase may not have started correctly" -ForegroundColor Yellow
        }

        # Give Supabase a moment to fully initialize
        Start-Sleep -Seconds 3
    }
    else {
        Write-Host "Skipping Supabase (--SkipSupabase)" -ForegroundColor Gray
    }

    # 2. Start Backend in new window
    if (-not $SkipBackend) {
        Write-Host "`n--- Starting Backend ---" -ForegroundColor Magenta
        Start-ServiceInNewWindow -Name "Flask Backend" -Script "start-backend.ps1"
        Start-Sleep -Seconds 2
    }
    else {
        Write-Host "Skipping Backend (--SkipBackend)" -ForegroundColor Gray
    }

    # 3. Start Frontend in new window
    if (-not $SkipFrontend) {
        Write-Host "`n--- Starting Frontend ---" -ForegroundColor Magenta
        Start-ServiceInNewWindow -Name "Next.js Frontend" -Script "start-frontend.ps1"
    }
    else {
        Write-Host "Skipping Frontend (--SkipFrontend)" -ForegroundColor Gray
    }

    # Summary
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  All Services Started!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan

    Write-Host "`nService URLs:" -ForegroundColor Yellow
    if (-not $SkipFrontend) {
        Write-Host "  Frontend:        http://localhost:3391" -ForegroundColor White
    }
    if (-not $SkipBackend) {
        Write-Host "  Backend API:     http://localhost:5000" -ForegroundColor White
    }
    if (-not $SkipSupabase) {
        Write-Host "  Supabase Studio: http://localhost:55323" -ForegroundColor White
        Write-Host "  Supabase API:    http://localhost:55321" -ForegroundColor White
    }

    Write-Host "`nProcess IDs:" -ForegroundColor Yellow
    foreach ($processId in $script:pids) {
        Write-Host "  PID: $processId" -ForegroundColor Gray
    }

    Write-Host "`nTo stop all services, run:" -ForegroundColor Yellow
    Write-Host "  .\pwsh-runner\stop-all.ps1" -ForegroundColor White
    Write-Host ""

}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red

    # Cleanup on error
    foreach ($processId in $script:pids) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
        catch { }
    }

    exit 1
}
