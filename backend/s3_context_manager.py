"""
Supabase Context Manager Module

This module provides context management for course content stored in Supabase.
It handles loading, processing, and searching course content using Supabase's native pgvector extension.

Migrated from FAISS indices stored in Supabase Storage to native database vector storage.
"""

import json
import os
import time
from difflib import SequenceMatcher

import numpy as np
import openai
import tiktoken
from dotenv import load_dotenv

import utils.s3_utils as s3_utils
import utils.vector_utils as vector_utils

load_dotenv()


class ContextManager:
    """
    Context Manager for course content stored in Supabase.

    Handles loading course chunks and inverted indices from Supabase database
    and uses Supabase's native pgvector extension for semantic search and retrieval.
    """

    def __init__(self, user: str = None, course_title: str = None, api_key: str = None):
        """
        Initialize the Context Manager.

        Args:
            user: Username/email of the user
            course_title: Title/ID of the course
            api_key: OpenAI API key for embeddings
        """
        if not api_key:
            api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "API key must be provided or set in OPENAI_API_KEY environment variable."
            )

        self.api_key = api_key
        self.user = user
        self.course_title = course_title
        self.s3_bucket = os.getenv("SUPABASE_BUCKET_NAME", "anantra-lms-store")

        # Initialize data structures
        self.chunks = []
        self.inverted_index = {}

        # Initialize OpenAI clients
        openai.api_key = api_key
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.client = openai.OpenAI(api_key=api_key, base_url=base_url)
        self.client_embedding = openai.OpenAI(api_key=api_key, base_url=base_url)

    def _get_s3_prefix(self) -> str:
        """Get the S3 prefix for the current user and course."""
        return s3_utils.get_course_s3_folder(self.user, self.course_title)

    def split_into_chunks(self, text: str, max_tokens: int = 2300) -> list:
        """Split text into smaller chunks based on token count."""
        encoder = tiktoken.encoding_for_model("gpt-4")
        chunks = []
        current_chunk = []
        current_token_count = 0

        for line in text.split("\n"):
            line_tokens = len(encoder.encode(line + "\n"))
            if current_token_count + line_tokens > max_tokens:
                if current_chunk:
                    chunks.append("\n".join(current_chunk))
                current_chunk = [line]
                current_token_count = line_tokens
            else:
                current_chunk.append(line)
                current_token_count += line_tokens

        if current_chunk:
            chunks.append("\n".join(current_chunk))
        return chunks

    def load_saved_indices(self) -> bool:
        """
        Load previously processed chunks from Supabase database.

        Returns:
            True if successfully loaded, False otherwise
        """
        try:
            print(f"Loading saved indices for user: {self.user}, course: {self.course_title}")

            # Load chunks from Supabase database
            self.chunks = vector_utils.get_course_chunks(self.user, self.course_title)
            if not self.chunks:
                print(f"No chunks found in database for {self.user}/{self.course_title}")
                # Fallback to loading from storage for backward compatibility
                chunks_key = s3_utils.get_s3_file_path(self.user, self.course_title, "chunks.json")
                self.chunks = s3_utils.get_json_from_s3(self.s3_bucket, chunks_key) or []
                if not self.chunks:
                    return False
            print(f"Loaded {len(self.chunks)} chunks from database")

            # Load inverted index from database
            # Build inverted index dict from database entries
            self.inverted_index = {}
            # Note: We'll load this on-demand or rebuild it if needed
            # For now, try loading from storage as fallback
            inverted_index_key = s3_utils.get_s3_file_path(
                self.user, self.course_title, "inverted_index.json"
            )
            stored_index = s3_utils.get_json_from_s3(self.s3_bucket, inverted_index_key)
            if stored_index:
                self.inverted_index = stored_index
            print(f"Loaded inverted index with {len(self.inverted_index)} entries")

            return True

        except Exception as e:
            print(f"Error loading saved indices: {e}")
            return False

    def save_indices(self) -> bool:
        """
        Save processed indices and chunks to Supabase database.

        Note: This method now stores embeddings in the database instead of FAISS files.
        The embeddings are generated and stored via build_faiss_index() method.

        Returns:
            True if successfully saved, False otherwise
        """
        try:
            # Save chunks and inverted index to database
            # (Embeddings are saved separately via build_faiss_index/store_embeddings)
            
            # Also save chunks to storage for backward compatibility
            chunks_key = s3_utils.get_s3_file_path(self.user, self.course_title, "chunks.json")
            s3_utils.upload_json_to_s3(self.chunks, self.s3_bucket, chunks_key)
            print(f"Saved {len(self.chunks)} chunks to storage (backward compatibility)")

            # Save inverted index to database
            vector_utils.store_inverted_index(self.user, self.course_title, self.inverted_index)
            print(f"Saved inverted index to database")

            # Also save to storage for backward compatibility
            inverted_index_key = s3_utils.get_s3_file_path(
                self.user, self.course_title, "inverted_index.json"
            )
            s3_utils.upload_json_to_s3(self.inverted_index, self.s3_bucket, inverted_index_key)

            return True

        except Exception as e:
            print(f"Error saving indices: {e}")
            return False

    def build_inverted_index(self):
        """Build an inverted index for quotes and important phrases."""
        for i, chunk in enumerate(self.chunks):
            quotes = self.extract_quotes_from_chunk(chunk)
            for quote in quotes:
                self.inverted_index[quote.lower()] = i

    def extract_quotes_from_chunk(self, chunk: str) -> list:
        """Extract well-known phrases or quotes from a chunk for indexing."""
        return [line for line in chunk.split("\n") if line.startswith('"')]

    def find_approximate_quote_match(self, query: str, threshold: float = 0.65):
        """Find the closest quote in the inverted index based on similarity threshold."""
        best_match = None
        best_score = 0
        query_lower = query.lower()

        for quote, index in self.inverted_index.items():
            similarity = SequenceMatcher(None, query_lower, quote).ratio()
            if similarity > best_score and similarity >= threshold:
                best_score = similarity
                best_match = self.chunks[index]

        return best_match

    def get_relevant_chunks(self, query: str, max_chunks: int = 5) -> str:
        """
        Retrieve the most relevant chunks based on user query.

        Uses inverted index, fuzzy matching, and Supabase vector search for retrieval.

        Args:
            query: The user's query string
            max_chunks: Maximum number of chunks to return

        Returns:
            Concatenated relevant chunks as a string
        """
        if not self.chunks:
            # Try to load chunks if not already loaded
            self.load_saved_indices()
            if not self.chunks:
                return ""

        query_time = time.time()

        # Step 1: Check for exact match in inverted index
        normalized_query = query.lower()
        chunk_index = vector_utils.get_inverted_index_match(
            self.user, self.course_title, normalized_query
        )
        if chunk_index is not None:
            exact_match_time = time.time()
            if chunk_index < len(self.chunks):
                print(f"Exact match time: {time.time() - exact_match_time:.2f} seconds")
                print(f"Total query processing time: {time.time() - query_time:.2f} seconds")
                return self.chunks[chunk_index]

        # Step 2: Fuzzy match for approximate quotes (case-insensitive)
        fuzzy_time = time.time()
        approximate_match = self.find_approximate_quote_match(normalized_query)
        print(f"Fuzzy matching time: {time.time() - fuzzy_time:.2f} seconds")
        if approximate_match:
            print(f"Total query processing time: {time.time() - query_time:.2f} seconds")
            return approximate_match

        # Step 3: Use Supabase vector search
        vector_search_time = time.time()
        try:
            # Generate query embedding
            query_embedding = (
                self.client_embedding.embeddings.create(
                    model="text-embedding-3-large", input=query
                )
                .data[0]
                .embedding
            )

            # Search using Supabase vector store
            results = vector_utils.search_similar_chunks(
                self.user,
                self.course_title,
                query_embedding,
                max_results=max_chunks,
                similarity_threshold=0.5,
            )

            if results:
                relevant_chunks = "\n\n".join([r["chunk_text"] for r in results])
                print(f"Vector search time: {time.time() - vector_search_time:.2f} seconds")
                print(f"Total query processing time: {time.time() - query_time:.2f} seconds")
                return relevant_chunks

        except Exception as e:
            print(f"Error getting relevant chunks via vector search: {e}")

        # Fallback: return first chunk if available
        return self.chunks[0] if self.chunks else ""

    def build_faiss_index(self):
        """
        Build embeddings and store them in Supabase vector store.
        
        This method generates embeddings for all chunks and stores them in the database
        using Supabase's pgvector extension instead of creating a FAISS index file.
        """
        if not self.chunks:
            print("No chunks available to build embeddings")
            return

        embeddings = []
        source_files = []  # Track source files if available

        print(f"Generating embeddings for {len(self.chunks)} chunks...")
        for chunk in self.chunks:
            try:
                embedding = (
                    self.client_embedding.embeddings.create(
                        model="text-embedding-3-large", input=chunk
                    )
                    .data[0]
                    .embedding
                )
                embeddings.append(embedding)
                source_files.append(None)  # Could be enhanced to track source files
            except Exception as e:
                print(f"Error generating embedding: {e}")
                embeddings.append([0] * 3072)
                source_files.append(None)

        # Store embeddings in Supabase vector store
        print(f"Storing {len(embeddings)} embeddings in Supabase vector store...")
        success = vector_utils.store_course_embeddings(
            self.user,
            self.course_title,
            self.chunks,
            embeddings,
            source_files=source_files if any(source_files) else None,
        )

        if success:
            print(f"Successfully stored embeddings in Supabase vector store")
        else:
            print(f"Failed to store embeddings in Supabase vector store")

    def load_and_process_context_from_s3(self) -> bool:
        """
        Load text files from S3 and process into chunks and indices.

        Returns:
            True if successful, False otherwise
        """
        try:
            start_time = time.time()

            # Get list of text files in course folder
            prefix = s3_utils.get_course_s3_folder(self.user, self.course_title)
            text_files = s3_utils.list_files_in_prefix(self.s3_bucket, prefix, "txt")

            # Also check course_materials subfolder
            materials_prefix = f"{prefix}course_materials/"
            material_files = s3_utils.list_files_in_prefix(self.s3_bucket, materials_prefix, "txt")
            text_files.extend(material_files)

            if not text_files:
                print(f"No text files found in {prefix}")
                return False

            # Read all text files
            all_text = ""
            for file_key in text_files:
                content = s3_utils.read_text_file_from_s3(self.s3_bucket, file_key)
                if content:
                    all_text += content + "\n"
                    print(f"Read file: {file_key}")

            if not all_text.strip():
                print("No valid text content found")
                return False

            # Process into chunks
            chunk_time = time.time()
            self.chunks = self.split_into_chunks(all_text)
            print(f"Chunking time: {time.time() - chunk_time:.2f} seconds")
            print(f"Created {len(self.chunks)} chunks")

            # Build FAISS index
            if FAISS_AVAILABLE:
                faiss_time = time.time()
                self.build_faiss_index()
                print(f"FAISS index build time: {time.time() - faiss_time:.2f} seconds")

            # Build inverted index
            inverted_index_time = time.time()
            self.build_inverted_index()
            print(f"Inverted index build time: {time.time() - inverted_index_time:.2f} seconds")

            # Save to S3
            self.save_indices()

            print(f"Total context processing time: {time.time() - start_time:.2f} seconds")
            return True

        except Exception as e:
            print(f"Error processing context from S3: {e}")
            return False
