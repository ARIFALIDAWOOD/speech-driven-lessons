"""
Supabase Vector Store Utilities Module

This module provides vector storage and search operations using Supabase's pgvector extension.
It replaces the previous FAISS index storage in Supabase Storage with native database vector storage.

Features:
- Store embeddings directly in PostgreSQL using pgvector
- Fast similarity search using HNSW indexes
- Integration with existing course content management
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from dotenv import load_dotenv

from supabase import Client, create_client

logger = logging.getLogger(__name__)

# Load environment variables
env_local = Path(__file__).parent.parent / ".env.local"
env_file = Path(__file__).parent.parent / ".env"
if env_local.exists():
    load_dotenv(env_local)
else:
    load_dotenv(env_file)

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise EnvironmentError(
        "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
    )

# Initialize Supabase client with service role for database operations
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def store_course_embeddings(
    user_email: str,
    course_title: str,
    chunks: List[str],
    embeddings: List[List[float]],
    source_files: Optional[List[str]] = None,
) -> bool:
    """
    Store course chunks and their embeddings in Supabase vector store.

    Args:
        user_email: User's email address
        course_title: Course title/ID
        chunks: List of text chunks
        embeddings: List of embedding vectors (must match chunks length)
        source_files: Optional list of source file names for each chunk

    Returns:
        True if successful, False otherwise
    """
    if len(chunks) != len(embeddings):
        logger.error("Chunks and embeddings must have the same length")
        return False

    try:
        # Prepare data for batch insert
        embeddings_data = []
        chunks_data = []

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            # Convert embedding to list if it's numpy array
            if isinstance(embedding, np.ndarray):
                embedding = embedding.tolist()

            # Ensure embedding is the correct dimension (3072 for text-embedding-3-large)
            if len(embedding) != 3072:
                logger.warning(
                    f"Embedding dimension mismatch: expected 3072, got {len(embedding)}. Padding or truncating."
                )
                if len(embedding) < 3072:
                    embedding = embedding + [0.0] * (3072 - len(embedding))
                else:
                    embedding = embedding[:3072]

            source_file = source_files[i] if source_files and i < len(source_files) else None

            embeddings_data.append(
                {
                    "user_email": user_email,
                    "course_title": course_title,
                    "chunk_text": chunk,
                    "chunk_index": i,
                    "source_file": source_file,
                    "embedding": embedding,
                }
            )

            chunks_data.append(
                {
                    "user_email": user_email,
                    "course_title": course_title,
                    "chunk_text": chunk,
                    "chunk_index": i,
                }
            )

        # Delete existing embeddings for this course (upsert behavior)
        delete_course_embeddings(user_email, course_title)

        # Batch insert embeddings (Supabase handles batching automatically)
        # Insert in chunks of 1000 to avoid payload size limits
        batch_size = 1000
        for i in range(0, len(embeddings_data), batch_size):
            batch = embeddings_data[i : i + batch_size]
            supabase.table("course_embeddings").insert(batch).execute()
            logger.info(f"Inserted embeddings batch {i // batch_size + 1}")

        # Batch insert chunks
        for i in range(0, len(chunks_data), batch_size):
            batch = chunks_data[i : i + batch_size]
            supabase.table("course_chunks").insert(batch).execute()

        logger.info(
            f"Successfully stored {len(embeddings_data)} embeddings for {user_email}/{course_title}"
        )
        return True

    except Exception as e:
        logger.error(f"Error storing course embeddings: {e}")
        return False


def store_inverted_index(
    user_email: str,
    course_title: str,
    inverted_index: Dict[str, int],
) -> bool:
    """
    Store inverted index (quotes/phrases) in Supabase.

    Args:
        user_email: User's email address
        course_title: Course title/ID
        inverted_index: Dictionary mapping phrases to chunk indices

    Returns:
        True if successful, False otherwise
    """
    try:
        # Delete existing inverted index for this course
        supabase.table("course_inverted_index").delete().eq("user_email", user_email).eq(
            "course_title", course_title
        ).execute()

        # Prepare data for batch insert
        index_data = []
        for phrase, chunk_index in inverted_index.items():
            index_data.append(
                {
                    "user_email": user_email,
                    "course_title": course_title,
                    "phrase": phrase.lower(),
                    "chunk_index": chunk_index,
                }
            )

        # Batch insert
        batch_size = 1000
        for i in range(0, len(index_data), batch_size):
            batch = index_data[i : i + batch_size]
            supabase.table("course_inverted_index").insert(batch).execute()

        logger.info(
            f"Successfully stored inverted index with {len(index_data)} entries for {user_email}/{course_title}"
        )
        return True

    except Exception as e:
        logger.error(f"Error storing inverted index: {e}")
        return False


def search_similar_chunks(
    user_email: str,
    course_title: str,
    query_embedding: List[float],
    max_results: int = 5,
    similarity_threshold: float = 0.5,
) -> List[Dict[str, Any]]:
    """
    Search for similar chunks using vector similarity via pgvector RPC.

    This function uses the Supabase RPC call to leverage pgvector's
    optimized HNSW index for fast similarity search.

    Args:
        user_email: User's email address
        course_title: Course title/ID
        query_embedding: Query embedding vector (3072 dimensions)
        max_results: Maximum number of results to return
        similarity_threshold: Minimum similarity score (0-1)

    Returns:
        List of dictionaries containing chunk_text, chunk_index, similarity, and source_file
    """
    try:
        # Convert embedding to list if numpy array
        if isinstance(query_embedding, np.ndarray):
            query_embedding = query_embedding.tolist()

        # Ensure correct dimension
        if len(query_embedding) != 3072:
            logger.warning(
                f"Query embedding dimension mismatch: expected 3072, got {len(query_embedding)}"
            )
            if len(query_embedding) < 3072:
                query_embedding = query_embedding + [0.0] * (3072 - len(query_embedding))
            else:
                query_embedding = query_embedding[:3072]

        # Try using pgvector RPC function first (optimized)
        try:
            response = supabase.rpc(
                "match_course_embeddings",
                {
                    "p_user_email": user_email,
                    "p_course_title": course_title,
                    "p_query_embedding": query_embedding,
                    "p_match_threshold": similarity_threshold,
                    "p_match_count": max_results,
                },
            ).execute()

            if response.data:
                logger.debug(f"RPC search returned {len(response.data)} results")
                return [
                    {
                        "chunk_text": row["chunk_text"],
                        "chunk_index": row["chunk_index"],
                        "similarity": row["similarity"],
                        "source_file": row.get("source_file"),
                    }
                    for row in response.data
                ]
        except Exception as rpc_error:
            logger.debug(f"RPC search failed, falling back to Python: {rpc_error}")

        # Fallback: Python-side similarity calculation
        # This is less efficient but works when RPC function doesn't exist
        response = (
            supabase.table("course_embeddings")
            .select("chunk_text, chunk_index, embedding, source_file")
            .eq("user_email", user_email)
            .eq("course_title", course_title)
            .execute()
        )

        if not response.data:
            logger.info(f"No embeddings found for {user_email}/{course_title}")
            return []

        results = []
        query_vec = np.array(query_embedding, dtype=np.float32)
        query_norm = np.linalg.norm(query_vec)

        if query_norm == 0:
            logger.warning("Query embedding has zero norm")
            return []

        for row in response.data:
            embedding_vec = np.array(row["embedding"], dtype=np.float32)
            embedding_norm = np.linalg.norm(embedding_vec)

            if embedding_norm == 0:
                continue

            # Calculate cosine similarity
            similarity = float(np.dot(query_vec, embedding_vec) / (query_norm * embedding_norm))

            if similarity >= similarity_threshold:
                results.append(
                    {
                        "chunk_text": row["chunk_text"],
                        "chunk_index": row["chunk_index"],
                        "similarity": similarity,
                        "source_file": row.get("source_file"),
                    }
                )

        # Sort by similarity (descending) and limit results
        results.sort(key=lambda x: x["similarity"], reverse=True)
        return results[:max_results]

    except Exception as e:
        logger.error(f"Error searching similar chunks: {e}")
        return []


def get_embeddings_count(user_email: str, course_title: str) -> int:
    """
    Get the count of embeddings for a course.

    Args:
        user_email: User's email address
        course_title: Course title/ID

    Returns:
        Number of embeddings, or 0 if error
    """
    try:
        response = (
            supabase.table("course_embeddings")
            .select("id", count="exact")
            .eq("user_email", user_email)
            .eq("course_title", course_title)
            .execute()
        )
        return response.count or 0
    except Exception as e:
        logger.error(f"Error getting embeddings count: {e}")
        return 0


def get_course_chunks(
    user_email: str,
    course_title: str,
    chunk_indices: Optional[List[int]] = None,
) -> List[str]:
    """
    Retrieve course chunks from the database.

    Args:
        user_email: User's email address
        course_title: Course title/ID
        chunk_indices: Optional list of chunk indices to retrieve (if None, returns all)

    Returns:
        List of chunk texts, ordered by chunk_index
    """
    try:
        query = (
            supabase.table("course_chunks")
            .select("chunk_text, chunk_index")
            .eq("user_email", user_email)
            .eq("course_title", course_title)
        )

        if chunk_indices:
            query = query.in_("chunk_index", chunk_indices)

        response = query.order("chunk_index").execute()

        if not response.data:
            return []

        # Return chunks in order
        chunks = [row["chunk_text"] for row in response.data]
        return chunks

    except Exception as e:
        logger.error(f"Error retrieving course chunks: {e}")
        return []


def get_inverted_index_match(
    user_email: str,
    course_title: str,
    phrase: str,
) -> Optional[int]:
    """
    Get chunk index for a phrase from inverted index.

    Args:
        user_email: User's email address
        course_title: Course title/ID
        phrase: Phrase to look up

    Returns:
        Chunk index if found, None otherwise
    """
    try:
        response = (
            supabase.table("course_inverted_index")
            .select("chunk_index")
            .eq("user_email", user_email)
            .eq("course_title", course_title)
            .eq("phrase", phrase.lower())
            .limit(1)
            .execute()
        )

        if response.data:
            return response.data[0]["chunk_index"]
        return None

    except Exception as e:
        logger.error(f"Error looking up inverted index: {e}")
        return None


def delete_course_embeddings(user_email: str, course_title: str) -> bool:
    """
    Delete all embeddings, chunks, and inverted index for a course.

    Args:
        user_email: User's email address
        course_title: Course title/ID

    Returns:
        True if successful, False otherwise
    """
    try:
        # Delete embeddings
        supabase.table("course_embeddings").delete().eq("user_email", user_email).eq(
            "course_title", course_title
        ).execute()

        # Delete chunks
        supabase.table("course_chunks").delete().eq("user_email", user_email).eq(
            "course_title", course_title
        ).execute()

        # Delete inverted index
        supabase.table("course_inverted_index").delete().eq("user_email", user_email).eq(
            "course_title", course_title
        ).execute()

        logger.info(f"Deleted all vector data for {user_email}/{course_title}")
        return True

    except Exception as e:
        logger.error(f"Error deleting course embeddings: {e}")
        return False


def course_embeddings_exist(user_email: str, course_title: str) -> bool:
    """
    Check if embeddings exist for a course.

    Args:
        user_email: User's email address
        course_title: Course title/ID

    Returns:
        True if embeddings exist, False otherwise
    """
    try:
        response = (
            supabase.table("course_embeddings")
            .select("id")
            .eq("user_email", user_email)
            .eq("course_title", course_title)
            .limit(1)
            .execute()
        )

        return len(response.data) > 0

    except Exception as e:
        logger.error(f"Error checking course embeddings: {e}")
        return False
