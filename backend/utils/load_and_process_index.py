"""
Course context processing module for Supabase vector store.

This module processes course files and creates vector embeddings stored in Supabase database
using pgvector extension for RAG (Retrieval-Augmented Generation).
"""

import json
import time
from difflib import SequenceMatcher

import numpy as np
import openai
import tiktoken
from utils.s3_utils import (
    SUPABASE_BUCKET_NAME,
    get_course_s3_folder,
    get_json_from_s3,
    list_files_in_prefix,
    read_text_file_from_s3,
    storage,
    upload_json_to_s3,
)
import utils.vector_utils as vector_utils


def process_course_context_s3(bucket_name, username, coursename, api_key, max_tokens=2000):
    """
    Standalone function to process course files from storage and upload indices.

    Args:
        bucket_name: Storage bucket name
        username: User's email/username
        coursename: Course ID/name
        api_key: OpenAI API key
        max_tokens: Maximum tokens per chunk

    Returns:
        True if successful, False otherwise
    """
    start_time = time.time()

    # 1. Load and combine text files from storage
    course_prefix = get_course_s3_folder(username, coursename)
    all_text = []

    try:
        # List text files using s3_utils function
        text_files = list_files_in_prefix(bucket_name, course_prefix, file_extension="txt")

        for file_path in text_files:
            content = read_text_file_from_s3(bucket_name, file_path)
            if content:
                all_text.append(content)

        if not all_text:
            raise ValueError("No text files found in course directory")

        combined_text = "\n".join(all_text)
        del all_text  # Free memory early

    except Exception as e:
        print(f"Error loading files from storage: {str(e)}")
        return False

    # 2. Split into chunks with memory efficiency
    encoder = tiktoken.encoding_for_model("gpt-4")
    chunks = []
    current_chunk = []
    current_token_count = 0

    for line in combined_text.split("\n"):
        line_tokens = len(encoder.encode(line + "\n"))
        if current_token_count + line_tokens > max_tokens:
            if current_chunk:
                chunks.append("\n".join(current_chunk))
                current_chunk = []
                current_token_count = 0
            # Handle long lines that exceed max_tokens
            while line_tokens > max_tokens:
                chunks.append(line[: len(line) // 2])
                line = line[len(line) // 2 :]
                line_tokens = len(encoder.encode(line + "\n"))
            current_chunk.append(line)
            current_token_count = line_tokens
        else:
            current_chunk.append(line)
            current_token_count += line_tokens

    if current_chunk:
        chunks.append("\n".join(current_chunk))
    del combined_text  # Free memory

    # 3. Generate embeddings and store in Supabase vector store
    embeddings = []
    openai_client = openai.OpenAI(api_key=api_key)

    print(f"Generating embeddings for {len(chunks)} chunks...")
    # Process chunks in batches to control memory usage
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        try:
            response = openai_client.embeddings.create(
                model="text-embedding-3-large", input=batch
            )
            batch_embeddings = [e.embedding for e in response.data]
            embeddings.extend(batch_embeddings)
            print(f"Generated embeddings for batch {i // batch_size + 1}/{(len(chunks) + batch_size - 1) // batch_size}")
        except Exception as e:
            print(f"Error generating embeddings: {str(e)}")
            # Use zero vectors as fallback
            dimension = 3072  # text-embedding-3-large dimension
            embeddings.extend([np.zeros(dimension).tolist()] * len(batch))

        # Clear memory between batches
        del batch

    # Store embeddings in Supabase vector store
    print(f"Storing {len(embeddings)} embeddings in Supabase vector store...")
    success = vector_utils.store_course_embeddings(
        username, coursename, chunks, embeddings
    )
    if success:
        print(f"Successfully stored embeddings in Supabase vector store")
    else:
        print(f"Warning: Failed to store embeddings in Supabase vector store")
    
    del embeddings  # Free memory

    # 4. Build inverted index
    inverted_index = {}
    for i, chunk in enumerate(chunks):
        quotes = [line for line in chunk.split("\n") if line.startswith('"')]
        for quote in quotes:
            inverted_index[quote.lower()] = i

    # 5. Upload chunks and inverted index to storage (for backward compatibility)
    base_key = get_course_s3_folder(username, coursename)

    # Upload chunks to storage (backward compatibility)
    upload_json_to_s3(chunks, bucket_name, f"{base_key}chunks.json")
    del chunks

    # Store inverted index in database
    vector_utils.store_inverted_index(username, coursename, inverted_index)
    
    # Also upload inverted index to storage (backward compatibility)
    upload_json_to_s3(inverted_index, bucket_name, f"{base_key}inverted_index.json")
    del inverted_index

    print(f"Total processing time: {time.time() - start_time:.2f} seconds")
    return True
