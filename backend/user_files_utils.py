"""
User files utilities module.

This module provides user-specific file operations.
Note: This file previously had a standalone boto3 client which has been
removed in favor of using the centralized s3_utils module.
"""

from utils.s3_utils import (
    SUPABASE_BUCKET_NAME,
    download_file_from_s3,
    list_files_in_prefix,
    storage,
    upload_file_to_s3,
)

# Export bucket name for backwards compatibility
bucket_name = SUPABASE_BUCKET_NAME
