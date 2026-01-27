$file = ".env.example"
$content = Get-Content $file
$output = @()

$skipNext = $false
foreach ($line in $content) {
    if ($line -match "Get JWT Secret from Supabase Dashboard") {
        $output += "# Get Anon Key from Supabase Dashboard -> Project Settings -> API -> Anon/public key"
        $skipNext = $true
        continue
    }
    if ($line -match "verify Supabase JWT tokens") {
        $output += "# This is used by FastAPI for automatic authentication via Supabase client"
        $skipNext = $true
        continue
    }
    if ($line -match "SUPABASE_JWT_SECRET=") {
        $output += "SUPABASE_ANON_KEY=your_supabase_anon_key_here"
        continue
    }
    $output += $line
}

$output | Set-Content $file
Write-Host "Updated $file successfully"
