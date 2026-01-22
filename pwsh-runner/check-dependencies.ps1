# Check Dependencies Script
# This script verifies all required dependencies are installed

$ErrorActionPreference = "Continue"
$script:hasErrors = $false

function Write-Status {
    param([string]$Message, [string]$Status, [string]$Color = "White")
    $statusColor = switch ($Status) {
        "OK" { "Green" }
        "MISSING" { "Red" }
        "WARNING" { "Yellow" }
        default { $Color }
    }
    Write-Host "$Message " -NoNewline
    Write-Host "[$Status]" -ForegroundColor $statusColor
}

function Test-Command {
    param([string]$Command, [string]$Name)
    try {
        $null = Get-Command $Command -ErrorAction Stop
        Write-Status "$Name" "OK"
        return $true
    }
    catch {
        Write-Status "$Name" "MISSING"
        $script:hasErrors = $true
        return $false
    }
}

function Test-Port {
    param([int]$Port, [string]$Service)
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Status "$Service (port $Port)" "IN USE" "Yellow"
        return $false
    }
    else {
        Write-Status "$Service (port $Port)" "AVAILABLE" "Green"
        return $true
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Dependency Check for Anantra LMS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check Commands
Write-Host "Checking Required Commands..." -ForegroundColor Yellow
Write-Host ("-" * 40)

Test-Command "node" "Node.js" | Out-Null
Test-Command "npm" "NPM" | Out-Null

# Check uv (Python package manager)
$uvAvailable = Test-Command "uv" "uv (Python manager)"

if ($uvAvailable) {
    # Check Python via uv
    try {
        $pythonVersion = uv run python --version 2>&1
        if ($pythonVersion -match "Python 3") {
            Write-Status "Python (via uv: $pythonVersion)" "OK"
        }
        else {
            Write-Status "Python (via uv)" "MISSING"
            Write-Host "  -> Run: uv python install" -ForegroundColor Gray
            $script:hasErrors = $true
        }
    }
    catch {
        Write-Status "Python (via uv)" "ERROR"
        $script:hasErrors = $true
    }
}

Test-Command "supabase" "Supabase CLI" | Out-Null
Test-Command "docker" "Docker" | Out-Null

# Check Docker Running
Write-Host "`nChecking Docker Status..." -ForegroundColor Yellow
Write-Host ("-" * 40)
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Docker Daemon" "RUNNING"
    }
    else {
        Write-Status "Docker Daemon" "NOT RUNNING"
        $script:hasErrors = $true
    }
}
catch {
    Write-Status "Docker Daemon" "ERROR"
    $script:hasErrors = $true
}

# Check Port Availability
Write-Host "`nChecking Port Availability..." -ForegroundColor Yellow
Write-Host ("-" * 40)
Test-Port 3000 "Next.js Frontend" | Out-Null
Test-Port 5000 "Flask Backend" | Out-Null
Test-Port 55321 "Supabase API" | Out-Null
Test-Port 55322 "Supabase DB" | Out-Null
Test-Port 55323 "Supabase Studio" | Out-Null

# Check Environment Files
Write-Host "`nChecking Environment Files..." -ForegroundColor Yellow
Write-Host ("-" * 40)

$projectRoot = Split-Path -Parent $PSScriptRoot
$frontendEnv = Join-Path $projectRoot ".env.local"
$backendEnv = Join-Path $projectRoot "backend\.env"

if (Test-Path $frontendEnv) {
    Write-Status "Frontend .env.local" "EXISTS"
}
else {
    Write-Status "Frontend .env.local" "MISSING"
    Write-Host "  -> Copy .env.example to .env.local and configure" -ForegroundColor Gray
}

if (Test-Path $backendEnv) {
    Write-Status "Backend .env" "EXISTS"
}
else {
    Write-Status "Backend .env" "MISSING"
    Write-Host "  -> Copy backend/.env.example to backend/.env and configure" -ForegroundColor Gray
    $script:hasErrors = $true
}

# Check Node Modules
Write-Host "`nChecking Node Modules..." -ForegroundColor Yellow
Write-Host ("-" * 40)

$nodeModules = Join-Path $projectRoot "node_modules"
if (Test-Path $nodeModules) {
    Write-Status "node_modules" "EXISTS"
}
else {
    Write-Status "node_modules" "MISSING"
    Write-Host "  -> Run 'npm install' in project root" -ForegroundColor Gray
}

# Check pyproject.toml or requirements
Write-Host "`nChecking Python Project..." -ForegroundColor Yellow
Write-Host ("-" * 40)

$backendDir = Join-Path $projectRoot "backend"
$pyproject = Join-Path $backendDir "pyproject.toml"
$requirements = Join-Path $backendDir "requirements.txt"

if (Test-Path $pyproject) {
    Write-Status "pyproject.toml" "EXISTS"
}
elseif (Test-Path $requirements) {
    Write-Status "requirements.txt" "EXISTS"
}
else {
    Write-Status "Python project config" "MISSING"
    Write-Host "  -> Create pyproject.toml or requirements.txt in backend/" -ForegroundColor Gray
}

# Check Python packages via uv (only if uv is available)
if ($uvAvailable) {
    Write-Host "`nChecking Python Packages (via uv)..." -ForegroundColor Yellow
    Write-Host ("-" * 40)

    # Map package names to import names
    $pythonPackages = @{
        "flask" = "flask"
        "flask-socketio" = "flask_socketio"
        "flask-cors" = "flask_cors"
        "openai" = "openai"
        "python-dotenv" = "dotenv"
        "supabase" = "supabase"
    }

    Push-Location $backendDir
    foreach ($pkg in $pythonPackages.Keys) {
        $importName = $pythonPackages[$pkg]
        try {
            $result = uv run python -c "import $importName" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Status "Python: $pkg" "OK"
            }
            else {
                Write-Status "Python: $pkg" "MISSING"
            }
        }
        catch {
            Write-Status "Python: $pkg" "UNKNOWN"
        }
    }
    Pop-Location
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($script:hasErrors) {
    Write-Host "  Some dependencies are missing!" -ForegroundColor Red
    Write-Host "  Please install missing items before running the stack." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Quick fixes:" -ForegroundColor Yellow
    Write-Host "  - Python deps: cd backend && uv sync" -ForegroundColor White
    Write-Host "  - Node modules: npm install" -ForegroundColor White
    Write-Host "  - Full setup: .\pwsh-runner\install-dependencies.ps1" -ForegroundColor White
}
else {
    Write-Host "  All dependencies OK!" -ForegroundColor Green
}
Write-Host "========================================`n" -ForegroundColor Cyan

return -not $script:hasErrors
