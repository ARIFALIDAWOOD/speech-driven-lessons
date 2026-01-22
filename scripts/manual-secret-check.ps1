# PowerShell script for manual secret scanning
# Run this to manually check for secrets in Python and JavaScript/TypeScript files (monorepo)

param(
    [string]$Path = ".",
    [switch]$Verbose
)

Write-Host "Scanning for potential secrets in $Path..." -ForegroundColor Cyan

# Patterns to search for (Python and JavaScript/TypeScript)
$patterns = @(
    # Python patterns
    "password\s*=\s*['`"]",
    "api[_-]?key\s*=\s*['`"]",
    "secret[_-]?key\s*=\s*['`"]",
    "access[_-]?token\s*=\s*['`"]",
    "private[_-]?key\s*=\s*['`"]",
    "credential\s*=\s*['`"]",
    # JavaScript/TypeScript patterns
    "NEXT_PUBLIC_[A-Z_]+['`"]\s*[:=]\s*['`"][^'`"]+['`"]",
    "process\.env\.[A-Z_]+['`"]\s*[:=]\s*['`"][^'`"]+['`"]",
    "apiKey\s*[:=]\s*['`"][^'`"]+['`"]",
    "secretKey\s*[:=]\s*['`"][^'`"]+['`"]",
    "accessToken\s*[:=]\s*['`"][^'`"]+['`"]",
    "privateKey\s*[:=]\s*['`"][^'`"]+['`"]",
    # Common patterns
    "aws[_-]?secret[_-]?access[_-]?key",
    "bearer\s+token",
    "x-api-key",
    "Authorization\s*[:=]\s*['`"]Bearer\s+[^'`"]+['`"]"
)

$foundSecrets = $false
# Scan both Python and JavaScript/TypeScript files
# Exclude virtual environments, node_modules, build directories, and git
$codeFiles = Get-ChildItem -Path $Path -Include *.py,*.js,*.ts,*.tsx,*.jsx -Recurse -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch '(node_modules|\.next|__pycache__|\.git|\.venv|venv|env\\)' -and
        $_.FullName -notmatch '\\site-packages\\' -and
        $_.FullName -notmatch '\\dist\\' -and
        $_.FullName -notmatch '\\build\\'
    }

if (-not $codeFiles) {
    Write-Host "No code files found in $Path" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($codeFiles.Count) files to scan (Python, JS, TS, TSX, JSX)" -ForegroundColor Cyan

foreach ($file in $codeFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }

    foreach ($pattern in $patterns) {
        if ($content -match $pattern) {
            $foundSecrets = $true
            Write-Host "`nWARNING: Potential secret found in $($file.FullName)" -ForegroundColor Red

            if ($Verbose) {
                # Show the matching line
                $lines = Get-Content $file.FullName
                for ($i = 0; $i -lt $lines.Length; $i++) {
                    if ($lines[$i] -match $pattern) {
                        Write-Host "  Line $($i + 1): $($lines[$i].Trim())" -ForegroundColor Yellow
                    }
                }
            }
        }
    }
}

if ($foundSecrets) {
    Write-Host "`nSecret patterns detected! Please review the files above." -ForegroundColor Red
    Write-Host "Use environment variables or .env files (not committed) for secrets." -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`nNo obvious secret patterns found." -ForegroundColor Green
    exit 0
}
