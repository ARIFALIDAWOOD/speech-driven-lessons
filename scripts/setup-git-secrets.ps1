# PowerShell script to set up git-secrets on Windows
# Run this script after installing git-secrets via Chocolatey

Write-Host "Setting up git-secrets for this repository..." -ForegroundColor Cyan

# Check if git-secrets is installed
if (-not (Get-Command git-secrets -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: git-secrets is not installed." -ForegroundColor Red
    Write-Host "Install it with: choco install git-secrets" -ForegroundColor Yellow
    Write-Host "Or download from: https://github.com/awslabs/git-secrets" -ForegroundColor Yellow
    exit 1
}

# Initialize git-secrets for this repository
Write-Host "Initializing git-secrets..." -ForegroundColor Green
git secrets --install

# Add AWS patterns (common)
Write-Host "Adding AWS secret patterns..." -ForegroundColor Green
git secrets --register-aws

# Add custom patterns for common secret types (Python and JavaScript/TypeScript)
Write-Host "Adding custom secret patterns..." -ForegroundColor Green
# Python patterns
git secrets --add 'password\s*=\s*["\x27][^"\x27]+["\x27]'
git secrets --add 'api[_-]?key\s*=\s*["\x27][^"\x27]+["\x27]'
git secrets --add 'secret[_-]?key\s*=\s*["\x27][^"\x27]+["\x27]'
git secrets --add 'access[_-]?token\s*=\s*["\x27][^"\x27]+["\x27]'
git secrets --add 'private[_-]?key\s*=\s*["\x27][^"\x27]+["\x27]'
# JavaScript/TypeScript patterns
git secrets --add 'NEXT_PUBLIC_[A-Z_]+["\x27]\s*[:=]\s*["\x27][^"\x27]{10,}["\x27]'
git secrets --add 'process\.env\.[A-Z_]+["\x27]\s*[:=]\s*["\x27][^"\x27]{10,}["\x27]'
git secrets --add 'apiKey\s*[:=]\s*["\x27][^"\x27]{10,}["\x27]'
git secrets --add 'secretKey\s*[:=]\s*["\x27][^"\x27]{10,}["\x27]'
git secrets --add 'accessToken\s*[:=]\s*["\x27][^"\x27]{10,}["\x27]'
git secrets --add 'Authorization\s*[:=]\s*["\x27]Bearer\s+[^"\x27]+["\x27]'

# Allow .env.example files and legitimate Next.js public env var usage
Write-Host "Configuring allowed patterns..." -ForegroundColor Green
git secrets --add --allowed '\.env\.example'
git secrets --add --allowed '\.env\.local\.example'
git secrets --add --allowed '\.env\.template'
# Allow NEXT_PUBLIC_ variables that are intentionally public (but still check for actual secrets)
git secrets --add --allowed 'NEXT_PUBLIC_[A-Z_]+["\x27]\s*[:=]\s*["\x27][A-Z0-9_]{1,20}["\x27]'  # Short public IDs only

# Scan existing commits (optional, can be slow)
Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To scan existing commits for secrets, run:" -ForegroundColor Yellow
Write-Host "  git secrets --scan-history" -ForegroundColor Yellow
Write-Host ""
Write-Host "To test the setup, try committing a file with 'password = \"test\"' in it." -ForegroundColor Cyan
