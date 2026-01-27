# Service Status Check
# This script shows the status of all Anantra LMS services

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot

# Set console output encoding to UTF-8 to properly display box-drawing characters
try {
    # Change code page to UTF-8 (65001) on Windows
    if ($IsWindows -or ($PSVersionTable.PSVersion.Major -lt 6)) {
        $null = chcp 65001 2>&1
    }
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    if ($PSVersionTable.PSVersion.Major -ge 7) {
        $OutputEncoding = [System.Text.Encoding]::UTF8
    }
} catch {
    # Fallback if encoding change fails
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Anantra LMS Service Status" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

function Get-ServiceStatus {
    param(
        [string]$Name,
        [int]$Port
    )

    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue

    if ($connection) {
        $processId = $connection.OwningProcess | Select-Object -First 1
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue

        return @{
            Name = $Name
            Port = $Port
            Status = "Running"
            PID = $processId
            Process = if ($process) { $process.ProcessName } else { "Unknown" }
        }
    }
    else {
        return @{
            Name = $Name
            Port = $Port
            Status = "Stopped"
            PID = "-"
            Process = "-"
        }
    }
}

# Check services
$services = @(
    @{ Name = "Next.js Frontend"; Port = 3391 },
    @{ Name = "Flask Backend"; Port = 5000 },
    @{ Name = "Supabase API"; Port = 55321 },
    @{ Name = "Supabase DB"; Port = 55322 },
    @{ Name = "Supabase Studio"; Port = 55323 },
    @{ Name = "Supabase Inbucket"; Port = 55324 },
    @{ Name = "Supabase Analytics"; Port = 55327 }
)

Write-Host "Service Status:" -ForegroundColor Yellow
Write-Host ("-" * 75)

# Header
$header = "{0,-25} {1,-8} {2,-10} {3,-15} {4,-10}" -f "Service", "Port", "Status", "Process", "PID"
Write-Host $header -ForegroundColor Gray
Write-Host ("-" * 75)

foreach ($svc in $services) {
    $status = Get-ServiceStatus -Name $svc.Name -Port $svc.Port

    $statusColor = if ($status.Status -eq "Running") { "Green" } else { "Red" }

    # Print name and port
    Write-Host ("{0,-25} {1,-8} " -f $status.Name, $status.Port) -NoNewline

    # Print status with color
    Write-Host ("{0,-10} " -f $status.Status) -NoNewline -ForegroundColor $statusColor

    # Print process and PID
    Write-Host ("{0,-15} {1,-10}" -f $status.Process, $status.PID)
}

Write-Host ("-" * 75)

# Supabase detailed status
Write-Host "`nSupabase Status:" -ForegroundColor Yellow
Push-Location $projectRoot
try {
    # Run supabase status and output directly with UTF-8 encoding
    $supabaseOutput = & supabase status 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -eq 0 -and $supabaseOutput) {
        # Output each line to preserve encoding
        foreach ($line in $supabaseOutput) {
            [Console]::WriteLine($line)
        }
    }
    else {
        Write-Host "Supabase local development is not running" -ForegroundColor Red
    }
}
catch {
    Write-Host "Could not get Supabase status: $_" -ForegroundColor Yellow
}
finally {
    Pop-Location
}

Write-Host "`n========================================" -ForegroundColor Cyan
