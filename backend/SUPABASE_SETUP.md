# Supabase Storage Setup Guide

This guide explains how to configure Supabase Storage for both local development and production environments for the Speech-Driven Lessons application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Cloud Supabase Setup (Production)](#cloud-supabase-setup-production)
3. [Local Development Setup](#local-development-setup)
4. [Environment Configuration](#environment-configuration)
5. [Storage Bucket Setup](#storage-bucket-setup)
6. [Verifying Your Setup](#verifying-your-setup)
7. [Migrating from AWS S3](#migrating-from-aws-s3)
8. [Troubleshooting](#troubleshooting)
9. [API Reference](#api-reference)

---

## Prerequisites

- **Python 3.9+** - Required for backend
- **Docker** - Required for local development (optional if using cloud Supabase)
- **Supabase Account** - Free tier available at [supabase.com](https://supabase.com)

---

## Cloud Supabase Setup (Production)

### Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in project details:
   - **Organization**: Select or create one
   - **Name**: `speech-driven-lessons` (or your preferred name)
   - **Database Password**: Generate a strong password and save it securely
   - **Region**: Choose the region closest to your users
4. Click **"Create new project"**
5. Wait for project provisioning (~2 minutes)

### Step 2: Get API Credentials

1. In your project dashboard, go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy these values:

   | Setting | Where to Find | Example |
   |---------|---------------|---------|
   | **Project URL** | Under "Project URL" | `https://abcdefgh.supabase.co` |
   | **Service Role Key** | Under "Project API keys" → `service_role` | `eyJhbGciOiJIUzI1NiIs...` |

> **Security Warning**: The service role key has full access to your project. Never expose it in client-side code or commit it to version control.

### Step 3: Create Storage Bucket

1. In the sidebar, click **Storage**
2. Click **"New bucket"**
3. Configure the bucket:
   - **Name**: `anantra-lms-store`
   - **Public bucket**: **OFF** (keep private)
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: Leave empty to allow all types
4. Click **"Create bucket"**

---

## Local Development Setup

You have two options for local development:

### Option A: Supabase CLI (Recommended)

The Supabase CLI provides a complete local development environment.

#### Installation

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Windows (PowerShell):**
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**npm (Cross-platform):**
```bash
npm install -g supabase
```

#### Initialize and Start

```bash
# Navigate to backend directory
cd backend

# Initialize Supabase (creates supabase/ folder)
supabase init

# Start local Supabase services
supabase start
```

After starting, you'll see output like:
```
Started supabase local development setup.

         API URL: http://localhost:55321
     GraphQL URL: http://localhost:55321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:55322/postgres
      Studio URL: http://localhost:55323
    Inbucket URL: http://localhost:55324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note:** This project uses the 55xxx port series to avoid conflicts with other Supabase projects.

Copy the `service_role key` for your `.env` file.

#### Access Local Supabase Studio

Open [http://localhost:55323](http://localhost:55323) in your browser to access the local Supabase dashboard.

#### Stop Local Supabase

```bash
supabase stop
```

### Option B: Docker Compose

If you prefer manual Docker setup:

**Create `docker-compose.supabase.yml`:**

```yaml
version: "3.8"

services:
  supabase-db:
    image: supabase/postgres:15.1.0.55
    ports:
      - "55322:5432"
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    volumes:
      - supabase-db-data:/var/lib/postgresql/data
    healthcheck:
      test: pg_isready -U postgres
      interval: 5s
      timeout: 5s
      retries: 10

  supabase-storage:
    image: supabase/storage-api:v0.43.11
    depends_on:
      supabase-db:
        condition: service_healthy
    ports:
      - "55000:5000"
    environment:
      ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.625_WdcF3KHqz5amU0x2X5WWHP-OEs_4qj0ssLNHzTs
      SERVICE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9.vI9obAHOGyVVKa3pD--kJlyxp-Z2zV9UUMAhKpNLAcU
      DATABASE_URL: postgresql://postgres:postgres@supabase-db:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: local
      GLOBAL_S3_BUCKET: stub
      PGRST_JWT_SECRET: super-secret-jwt-token-with-at-least-32-characters-long
    volumes:
      - supabase-storage-data:/var/lib/storage

volumes:
  supabase-db-data:
  supabase-storage-data:
```

**Start services:**
```bash
docker-compose -f docker-compose.supabase.yml up -d
```

**Stop services:**
```bash
docker-compose -f docker-compose.supabase.yml down
```

---

## Environment Configuration

### Create Your .env File

Copy the example and fill in your values:

```bash
cp backend/.env.example backend/.env
```

### Cloud Supabase Configuration

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-key-here
SUPABASE_BUCKET_NAME=anantra-lms-store
```

### Local Development Configuration

```env
# Local Supabase Configuration (using supabase start)
# Note: This project uses the 55xxx port series
SUPABASE_URL=http://localhost:55321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9.vI9obAHOGyVVKa3pD--kJlyxp-Z2zV9UUMAhKpNLAcU
SUPABASE_BUCKET_NAME=anantra-lms-store
```

---

## Storage Bucket Setup

### Create Bucket via Dashboard

1. Open Supabase Studio:
   - **Local**: [http://localhost:55323](http://localhost:55323) (this project uses 55xxx ports)
   - **Cloud**: Your project's dashboard
2. Navigate to **Storage** in the sidebar
3. Click **"New bucket"**
4. Enter name: `anantra-lms-store`
5. Keep "Public bucket" **OFF**
6. Click **"Create bucket"**

### Create Bucket Programmatically

You can also create the bucket via Python:

```python
import os
from supabase import create_client

# Load environment
from dotenv import load_dotenv
load_dotenv()

# Initialize client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

# Create bucket
try:
    supabase.storage.create_bucket(
        "anantra-lms-store",
        options={"public": False, "file_size_limit": 52428800}
    )
    print("Bucket created successfully!")
except Exception as e:
    if "already exists" in str(e).lower():
        print("Bucket already exists")
    else:
        print(f"Error: {e}")
```

---

## Verifying Your Setup

Run this verification script to ensure everything is configured correctly:

**Create `verify_supabase.py`:**

```python
#!/usr/bin/env python3
"""Verify Supabase Storage setup."""

import os
import sys

# Add backend to path if needed
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

def check_env_vars():
    """Check required environment variables."""
    print("1. Checking environment variables...")
    required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_BUCKET_NAME"]
    missing = [var for var in required if not os.getenv(var)]

    if missing:
        print(f"   ERROR: Missing variables: {', '.join(missing)}")
        return False

    print("   OK: All environment variables set")
    return True

def check_connection():
    """Test Supabase connection."""
    print("2. Testing Supabase connection...")
    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        # Try to list buckets
        buckets = supabase.storage.list_buckets()
        print(f"   OK: Connected! Found {len(buckets)} bucket(s)")
        return True
    except Exception as e:
        print(f"   ERROR: {e}")
        return False

def check_bucket():
    """Check if bucket exists."""
    print("3. Checking storage bucket...")
    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        bucket_name = os.getenv("SUPABASE_BUCKET_NAME")

        # Try to list files in bucket
        files = supabase.storage.from_(bucket_name).list()
        print(f"   OK: Bucket '{bucket_name}' accessible ({len(files)} items)")
        return True
    except Exception as e:
        print(f"   ERROR: {e}")
        return False

def test_upload_download():
    """Test file upload and download."""
    print("4. Testing upload/download...")
    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )
        bucket = os.getenv("SUPABASE_BUCKET_NAME")
        test_key = "_test/verification_test.txt"
        test_content = b"Supabase verification test"

        # Upload
        supabase.storage.from_(bucket).upload(
            test_key,
            test_content,
            {"content-type": "text/plain", "upsert": "true"}
        )

        # Download
        result = supabase.storage.from_(bucket).download(test_key)

        # Verify
        if result == test_content:
            print("   OK: Upload/download working correctly")
            # Cleanup
            supabase.storage.from_(bucket).remove([test_key])
            return True
        else:
            print("   ERROR: Downloaded content doesn't match")
            return False

    except Exception as e:
        print(f"   ERROR: {e}")
        return False

def main():
    print("=" * 50)
    print("Supabase Storage Verification")
    print("=" * 50)
    print()

    results = []
    results.append(check_env_vars())

    if results[0]:  # Only continue if env vars are set
        results.append(check_connection())
        if results[1]:  # Only continue if connected
            results.append(check_bucket())
            if results[2]:  # Only continue if bucket exists
                results.append(test_upload_download())

    print()
    print("=" * 50)
    if all(results):
        print("All checks passed! Supabase is ready to use.")
        return 0
    else:
        print("Some checks failed. Please review errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

**Run verification:**
```bash
python verify_supabase.py
```

Expected output:
```
==================================================
Supabase Storage Verification
==================================================

1. Checking environment variables...
   OK: All environment variables set
2. Testing Supabase connection...
   OK: Connected! Found 1 bucket(s)
3. Checking storage bucket...
   OK: Bucket 'anantra-lms-store' accessible (0 items)
4. Testing upload/download...
   OK: Upload/download working correctly

==================================================
All checks passed! Supabase is ready to use.
```

---

## Migrating from AWS S3

If you have existing data in AWS S3, follow these steps:

### Step 1: Ensure Both Credentials Are Available

Your `.env` should temporarily have both:

```env
# Supabase (new)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-key
SUPABASE_BUCKET_NAME=anantra-lms-store

# AWS (for migration only)
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
```

### Step 2: Run Migration Script

```bash
# Dry run first (shows what will be migrated)
python scripts/migrate_s3_to_supabase.py --dry-run

# Actual migration
python scripts/migrate_s3_to_supabase.py

# Migrate specific prefix only
python scripts/migrate_s3_to_supabase.py --prefix "user_data/specific_user/"
```

### Step 3: Verify Migration

```python
# Compare file counts
import boto3
from supabase import create_client

# Count S3 files
s3 = boto3.client('s3')
s3_count = sum(1 for _ in s3.get_paginator('list_objects_v2').paginate(Bucket='anantra-lms-store'))

# Count Supabase files (approximate - list only returns partial)
supabase = create_client(url, key)
supabase_files = supabase.storage.from_('anantra-lms-store').list()

print(f"S3: {s3_count} files, Supabase: {len(supabase_files)} files")
```

### Step 4: Remove AWS Credentials

After verifying migration:
1. Comment out or remove AWS credentials from `.env`
2. Remove `boto3` from requirements (if not needed elsewhere)

---

## Troubleshooting

### Error: "Bucket not found"

**Cause:** Bucket doesn't exist or name is misspelled.

**Solution:**
1. Check bucket name in Supabase Dashboard → Storage
2. Verify `SUPABASE_BUCKET_NAME` matches exactly
3. Create bucket if missing

### Error: "Invalid JWT" or "Invalid API key"

**Cause:** Service role key is incorrect or expired.

**Solution:**
1. Go to Supabase Dashboard → Project Settings → API
2. Copy the `service_role` key (not `anon` key)
3. Update `.env` with new key
4. Restart application

### Error: "Connection refused" (Local)

**Cause:** Local Supabase not running.

**Solution:**
```bash
# Check status
supabase status

# Start if not running
supabase start

# Or restart
supabase stop && supabase start
```

### Error: "File too large"

**Cause:** File exceeds bucket size limit.

**Solution:**
1. Dashboard → Storage → Select bucket → Settings
2. Increase "File size limit"
3. Or configure in bucket creation

### Error: "Policy violation"

**Cause:** RLS policy blocking operation.

**Solution:**
1. Ensure using service role key (bypasses RLS)
2. Or update bucket policies in Dashboard → Storage → Policies

### Slow Uploads/Downloads

**Possible causes:**
- Large file size
- Network latency to Supabase region
- No connection pooling

**Solutions:**
1. Choose Supabase region closest to your server
2. Implement chunked uploads for large files
3. Add caching for frequently accessed files

---

## API Reference

### Key Differences: S3 vs Supabase

| Operation | AWS S3 (boto3) | Supabase Python |
|-----------|----------------|-----------------|
| Upload | `put_object(Body=data)` | `upload(path, file, options)` |
| Download | `get_object()['Body'].read()` | `download(path)` |
| Delete One | `delete_object(Key=key)` | `remove([path])` |
| Delete Many | `delete_objects(Delete={'Objects': [...]})` | `remove([path1, path2, ...])` |
| List | `list_objects_v2(Prefix=prefix)` | `list(folder)` |
| Check Exists | Try `head_object()` | Try `download()` or `list()` |

### Common Operations

**Upload a file:**
```python
storage.from_("bucket").upload(
    path="folder/file.txt",
    file=b"content",
    file_options={"content-type": "text/plain", "upsert": "true"}
)
```

**Download a file:**
```python
content = storage.from_("bucket").download("folder/file.txt")
```

**List files:**
```python
files = storage.from_("bucket").list("folder")
# Returns: [{"name": "file.txt", "id": "...", ...}, ...]
```

**Delete files:**
```python
storage.from_("bucket").remove(["folder/file1.txt", "folder/file2.txt"])
```

**Get public URL (if bucket is public):**
```python
url = storage.from_("bucket").get_public_url("folder/file.txt")
```

---

## Support

For issues:
1. Check [Supabase Documentation](https://supabase.com/docs/guides/storage)
2. Review [Supabase GitHub Issues](https://github.com/supabase/supabase/issues)
3. Open an issue on this project's repository
