# Setup Python for Anantra LMS
# This script helps install and configure Python

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Python Setup for Anantra LMS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

function Test-RealPython {
    # Try to find a real Python installation (not Windows Store alias)
    $pythonPaths = @(
        "C:\Python312\python.exe",
        "C:\Python311\python.exe",
        "C:\Python310\python.exe",
        "C:\Python39\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python311\python.exe",
        "C:\Program Files\Python310\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python310\python.exe",
        "$env:USERPROFILE\scoop\apps\python\current\python.exe",
        "$env:USERPROFILE\miniconda3\python.exe",
        "$env:USERPROFILE\anaconda3\python.exe"
    )

    foreach ($path in $pythonPaths) {
        if (Test-Path $path) {
            try {
                $version = & $path --version 2>&1
                if ($version -match "Python 3") {
                    return $path
                }
            }
            catch { }
        }
    }

    # Try py launcher
    try {
        $pyPath = Get-Command py -ErrorAction Stop | Select-Object -ExpandProperty Source
        $version = & py --version 2>&1
        if ($version -match "Python 3") {
            return "py"
        }
    }
    catch { }

    return $null
}

function Test-WindowsStoreAlias {
    $aliasPath = "$env:LOCALAPPDATA\Microsoft\WindowsApps\python.exe"
    if (Test-Path $aliasPath) {
        # Check if it's the store alias (it will fail to run properly)
        try {
            $result = & $aliasPath --version 2>&1
            if ($result -match "Python") {
                return $false  # Real Python works
            }
        }
        catch {
            return $true  # Store alias
        }
    }
    return $false
}

# Check current status
Write-Host "Checking Python installation..." -ForegroundColor Yellow

$realPython = Test-RealPython
$hasStoreAlias = Test-WindowsStoreAlias

if ($realPython) {
    Write-Host "Found Python: $realPython" -ForegroundColor Green
    $version = if ($realPython -eq "py") { py --version } else { & $realPython --version }
    Write-Host "Version: $version" -ForegroundColor Gray

    Write-Host "`nPython is properly installed!" -ForegroundColor Green

    # Install required packages
    $response = Read-Host "`nInstall required Python packages? (Y/n)"
    if ($response -ne "n" -and $response -ne "N") {
        $pipCmd = if ($realPython -eq "py") { "py -m pip" } else { "$realPython -m pip" }

        $packages = @(
            "flask",
            "flask-socketio",
            "flask-cors",
            "python-dotenv",
            "openai",
            "tiktoken",
            "numpy",
            "faiss-cpu",
            "supabase",
            "firebase-admin",
            "redis",
            "eventlet"
        )

        Write-Host "`nInstalling packages..." -ForegroundColor Yellow
        foreach ($pkg in $packages) {
            Write-Host "  Installing $pkg..." -ForegroundColor Gray
            if ($realPython -eq "py") {
                py -m pip install $pkg --quiet 2>&1 | Out-Null
            }
            else {
                & $realPython -m pip install $pkg --quiet 2>&1 | Out-Null
            }
        }
        Write-Host "Done!" -ForegroundColor Green
    }
}
else {
    Write-Host "No Python installation found!" -ForegroundColor Red

    if ($hasStoreAlias) {
        Write-Host "`nThe Windows Store Python alias is enabled but Python is not installed." -ForegroundColor Yellow
        Write-Host "You should disable the Windows Store alias and install Python properly.`n" -ForegroundColor Yellow
    }

    Write-Host "Installation Options:" -ForegroundColor Cyan
    Write-Host "1. Install via Scoop (recommended):" -ForegroundColor White
    Write-Host "   scoop install python" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Install via Winget:" -ForegroundColor White
    Write-Host "   winget install Python.Python.3.12" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Download from python.org:" -ForegroundColor White
    Write-Host "   https://www.python.org/downloads/" -ForegroundColor Gray
    Write-Host ""

    $response = Read-Host "Would you like to install Python via Scoop now? (y/N)"
    if ($response -eq "y" -or $response -eq "Y") {
        # Check if scoop is installed
        try {
            $null = Get-Command scoop -ErrorAction Stop
            Write-Host "`nInstalling Python via Scoop..." -ForegroundColor Yellow
            scoop install python

            if ($LASTEXITCODE -eq 0) {
                Write-Host "Python installed successfully!" -ForegroundColor Green
                Write-Host "Please restart your terminal and run this script again." -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "Scoop is not installed. Please install Python manually." -ForegroundColor Red
            Write-Host "`nTo install Scoop, run:" -ForegroundColor Yellow
            Write-Host 'Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser' -ForegroundColor Gray
            Write-Host 'Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression' -ForegroundColor Gray
        }
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
