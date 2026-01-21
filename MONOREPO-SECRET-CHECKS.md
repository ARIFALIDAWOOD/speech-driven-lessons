# Monorepo Secret Detection

This repository uses comprehensive secret detection for both **backend (Python)** and **frontend (Next.js/TypeScript)** code.

## What Gets Scanned

### Backend (Python)
- `backend/**/*.py` - All Python files
- Patterns: `password=`, `api_key=`, `secret_key=`, `access_token=`, etc.

### Frontend (Next.js/TypeScript)
- `app/**/*.{ts,tsx,js,jsx}` - All TypeScript/JavaScript files
- `components/**/*.{ts,tsx,js,jsx}` - Component files
- `lib/**/*.{ts,tsx,js,jsx}` - Library files
- `hooks/**/*.{ts,tsx,js,jsx}` - Custom hooks

### Frontend-Specific Patterns Detected

1. **Hardcoded NEXT_PUBLIC_ values**
   ```typescript
   // ❌ BAD - Will be detected
   const apiKey = process.env.NEXT_PUBLIC_API_KEY || "sk_live_1234567890";
   
   // ✅ GOOD - Uses env var reference only
   const apiKey = process.env.NEXT_PUBLIC_API_KEY || "";
   ```

2. **Hardcoded process.env values**
   ```typescript
   // ❤️ BAD - Will be detected
   const secret = process.env.SECRET_KEY || "my-secret-key-12345";
   
   // ✅ GOOD
   const secret = process.env.SECRET_KEY;
   ```

3. **Direct secret assignments**
   ```typescript
   // ❌ BAD - Will be detected
   const config = {
     apiKey: "sk_live_abc123",
     secretKey: "secret_xyz789"
   };
   
   // ✅ GOOD
   const config = {
     apiKey: process.env.NEXT_PUBLIC_API_KEY,
     secretKey: process.env.SECRET_KEY  // Server-side only
   };
   ```

4. **Authorization headers with hardcoded tokens**
   ```typescript
   // ❌ BAD - Will be detected
   headers: {
     Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   
   // ✅ GOOD
   headers: {
     Authorization: `Bearer ${token}`  // token from session/state
   }
   ```

## Running Checks

### Scan Entire Monorepo
```powershell
# Scan all code (backend + frontend)
.\scripts\manual-secret-check.ps1

# Verbose output (shows matching lines)
.\scripts\manual-secret-check.ps1 -Verbose

# Scan specific directory
.\scripts\manual-secret-check.ps1 -Path "app"
.\scripts\manual-secret-check.ps1 -Path "backend"
```

### Pre-commit (Automatic)
All checks run automatically on commit for:
- `backend/**/*.py`
- `app/**/*.{ts,tsx,js,jsx}`
- `components/**/*.{ts,tsx,js,jsx}`
- `lib/**/*.{ts,tsx,js,jsx}`

### Using findstr (Windows)
```cmd
REM Search for NEXT_PUBLIC_ secrets
findstr /i /s "NEXT_PUBLIC_" app\*.ts app\*.tsx components\*.ts

REM Search for process.env with hardcoded values
findstr /i /s "process.env" app\*.ts app\*.tsx

REM Search for API keys in JS/TS
findstr /i /s "apiKey" app\*.ts app\*.tsx components\*.ts
```

## Best Practices for Next.js

### ✅ DO: Use Environment Variables
```typescript
// .env.local (gitignored)
NEXT_PUBLIC_API_URL=https://api.example.com
SECRET_KEY=your-secret-key  # Server-side only

// app/config.ts
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "",
  // Server-side only - never expose secrets in client code
};
```

### ❌ DON'T: Hardcode Secrets
```typescript
// ❌ NEVER do this
const apiKey = "sk_live_1234567890";
const secret = "my-secret-key";
const token = "Bearer eyJhbGciOi...";
```

### ✅ DO: Use Server-Side for Secrets
```typescript
// app/api/route.ts (Server Component/API Route)
export async function GET() {
  const secret = process.env.SECRET_KEY;  // ✅ Server-side only
  // Use secret here
}
```

### ❌ DON'T: Expose Secrets in Client Components
```typescript
// ❌ BAD - Client component exposing secret
"use client"
export function MyComponent() {
  const secret = process.env.SECRET_KEY;  // ❌ Exposed to client!
}
```

## Updating Baselines

When you add legitimate test files or examples with placeholder secrets:

```powershell
# Update baseline for entire monorepo (using uv)
cd backend
uv run detect-secrets scan --baseline .secrets.baseline

# Or with pip:
detect-secrets scan --baseline .secrets.baseline

# Review changes
git diff .secrets.baseline

# Commit updated baseline
git add .secrets.baseline
git commit -m "Update secrets baseline for monorepo"
```

## False Positives

Common false positives and how to handle them:

1. **Test fixtures with placeholder values**
   - Add to `.secrets.baseline` after review

2. **NEXT_PUBLIC_ variables with short public IDs**
   - Allowed if they're truly public (like public API endpoints)

3. **Documentation examples**
   - Use `# pragma: allowlist secret` or add to baseline

## CI/CD Integration

Ensure your CI pipeline checks the entire monorepo:

```yaml
# GitHub Actions example
- name: Run pre-commit (monorepo)
  run: pre-commit run --all-files

- name: Check for secrets (monorepo)
  run: |
    git secrets --scan
    ./scripts/manual-secret-check.ps1
```
