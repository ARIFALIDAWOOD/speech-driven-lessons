# Stop All Services
# This script stops all Anantra LMS services

param(
    [switch]$Force = $false
)

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Stopping Anantra LMS Services" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Define ports to check
$services = @(
    @{ Name = "Next.js Frontend"; Port = 3000 },
    @{ Name = "Flask Backend"; Port = 5000 }
)

# Stop processes on known ports
foreach ($service in $services) {
    Write-Host "Checking $($service.Name) on port $($service.Port)..." -ForegroundColor Yellow

    $connections = Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue

    if ($connections) {
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

            if ($process) {
                Write-Host "  Stopping $($process.ProcessName) (PID: $processId)..." -ForegroundColor Yellow

                if ($Force) {
                    Stop-Process -Id $processId -Force
                }
                else {
                    Stop-Process -Id $processId
                }

                Write-Host "  $($service.Name) stopped." -ForegroundColor Green
            }
        }
    }
    else {
        Write-Host "  $($service.Name) not running." -ForegroundColor Gray
    }
}

# Stop Supabase
Write-Host "`nStopping Supabase..." -ForegroundColor Yellow
Push-Location $projectRoot
try {
    $status = supabase status 2>&1
    if ($LASTEXITCODE -eq 0) {
        supabase stop
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Supabase stopped." -ForegroundColor Green
        }
        else {
            Write-Host "Warning: Supabase stop command returned an error" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "Supabase not running." -ForegroundColor Gray
    }
}
catch {
    Write-Host "Warning: Could not stop Supabase: $_" -ForegroundColor Yellow
}
finally {
    Pop-Location
}

# Kill any orphaned node processes (optional, be careful)
if ($Force) {
    Write-Host "`nKilling orphaned Node.js processes..." -ForegroundColor Yellow
    Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "  Killing node process (PID: $($_.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  All Services Stopped" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
