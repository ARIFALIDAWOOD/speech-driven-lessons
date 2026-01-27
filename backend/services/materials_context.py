"""
User Materials Context Manager

Integrates user-uploaded materials with the tutoring system using
in-memory vector search for session-based materials.

Note: This uses in-memory FAISS for fast session-based lookups.
For persistent course materials, see s3_context_manager.py which uses Supabase vector store.
"""

import os
import logging
import tempfile
from typing import Optional
from pathlib import Path

from openai import OpenAI

logger = logging.getLogger(__name__)


class MaterialsContextManager:
    """
    Manages user-uploaded study materials for tutoring sessions.

    Uses in-memory FAISS vector search to find relevant content from uploaded PDFs.
    Materials are session-scoped and stored in memory for fast access.
    
    For persistent course materials, use s3_context_manager.py which stores
    embeddings in Supabase vector store.
    """

    def __init__(
        self,
        session_id: str,
        user_id: str,
        openai_api_key: Optional[str] = None,
    ):
        """
        Initialize the materials context manager.

        Args:
            session_id: Current tutoring session ID
            user_id: User identifier (email)
            openai_api_key: OpenAI API key for embeddings
        """
        self.session_id = session_id
        self.user_id = user_id
        self.openai_client = OpenAI(api_key=openai_api_key or os.getenv("OPENAI_API_KEY"))

        # Material storage
        self.materials_dir = Path(tempfile.gettempdir()) / "tutor_materials" / session_id
        self.materials_dir.mkdir(parents=True, exist_ok=True)

        # Vector index
        self.index = None
        self.chunks = []
        self.embeddings = []

    def add_material(self, file_path: str, original_name: str) -> bool:
        """
        Add a material (PDF) to the context.

        Args:
            file_path: Path to the uploaded file
            original_name: Original filename

        Returns:
            True if successfully added
        """
        try:
            from pypdf import PdfReader

            # Extract text from PDF
            reader = PdfReader(file_path)
            text_chunks = []

            for page_num, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    # Split into chunks of ~500 words
                    words = text.split()
                    chunk_size = 500
                    for i in range(0, len(words), chunk_size):
                        chunk = " ".join(words[i:i + chunk_size])
                        text_chunks.append({
                            "content": chunk,
                            "source": original_name,
                            "page": page_num + 1,
                        })

            if not text_chunks:
                logger.warning(f"No text extracted from {original_name}")
                return False

            # Generate embeddings
            embeddings = self._generate_embeddings([c["content"] for c in text_chunks])

            # Store chunks and embeddings in memory
            self.chunks.extend(text_chunks)
            self.embeddings.extend(embeddings)

            # Rebuild in-memory FAISS index
            self._build_index()

            logger.info(f"Added {len(text_chunks)} chunks from {original_name}")
            return True

        except Exception as e:
            logger.error(f"Error adding material {original_name}: {e}")
            return False

    def _generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for text chunks."""
        embeddings = []

        # Process in batches
        batch_size = 100
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=batch,
            )
            embeddings.extend([e.embedding for e in response.data])

        return embeddings

    def _build_index(self):
        """Build in-memory FAISS index from embeddings."""
        if not self.embeddings:
            return

        try:
            import numpy as np
            import faiss

            # Convert to numpy array
            embeddings_array = np.array(self.embeddings).astype("float32")

            # Create in-memory FAISS index
            dimension = embeddings_array.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
            self.index.add(embeddings_array)

            logger.info(f"Built in-memory FAISS index with {len(self.embeddings)} vectors")

        except ImportError:
            logger.warning("FAISS not available, using simple cosine similarity search")
            self.index = None

    def get_relevant_context(
        self,
        query: str,
        max_chunks: int = 5,
        min_similarity: float = 0.5,
    ) -> str:
        """
        Get relevant context from user materials for a query.

        Args:
            query: The query to search for
            max_chunks: Maximum number of chunks to return
            min_similarity: Minimum similarity threshold

        Returns:
            Combined context string from relevant chunks
        """
        if not self.chunks:
            return ""

        try:
            # Generate query embedding
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=[query],
            )
            query_embedding = response.data[0].embedding

            # Search
            if self.index is not None:
                import numpy as np

                query_array = np.array([query_embedding]).astype("float32")
                distances, indices = self.index.search(query_array, max_chunks)

                # Filter by similarity and format results
                results = []
                for dist, idx in zip(distances[0], indices[0]):
                    if idx < len(self.chunks):
                        # Convert L2 distance to similarity
                        similarity = 1 / (1 + dist)
                        if similarity >= min_similarity:
                            chunk = self.chunks[idx]
                            results.append(
                                f"[From {chunk['source']}, Page {chunk['page']}]\n{chunk['content']}"
                            )

                if results:
                    return "\n\n---\n\n".join(results)

            else:
                # Simple cosine similarity fallback
                import numpy as np

                query_vec = np.array(query_embedding)
                similarities = []

                for i, emb in enumerate(self.embeddings):
                    emb_vec = np.array(emb)
                    similarity = np.dot(query_vec, emb_vec) / (
                        np.linalg.norm(query_vec) * np.linalg.norm(emb_vec)
                    )
                    similarities.append((similarity, i))

                # Sort by similarity
                similarities.sort(reverse=True)

                results = []
                for sim, idx in similarities[:max_chunks]:
                    if sim >= min_similarity:
                        chunk = self.chunks[idx]
                        results.append(
                            f"[From {chunk['source']}, Page {chunk['page']}]\n{chunk['content']}"
                        )

                if results:
                    return "\n\n---\n\n".join(results)

        except Exception as e:
            logger.error(f"Error searching materials: {e}")

        return ""

    def has_materials(self) -> bool:
        """Check if any materials have been added."""
        return len(self.chunks) > 0

    def get_materials_summary(self) -> dict:
        """Get a summary of loaded materials."""
        sources = set(c["source"] for c in self.chunks)
        return {
            "total_chunks": len(self.chunks),
            "sources": list(sources),
            "has_index": self.index is not None,
        }

    def clear(self):
        """Clear all materials."""
        self.chunks = []
        self.embeddings = []
        self.index = None


# Session material managers cache
_session_managers: dict[str, MaterialsContextManager] = {}


def get_materials_manager(
    session_id: str,
    user_id: str,
) -> MaterialsContextManager:
    """
    Get or create a materials manager for a session.

    Args:
        session_id: Session ID
        user_id: User ID

    Returns:
        MaterialsContextManager instance
    """
    key = f"{session_id}:{user_id}"

    if key not in _session_managers:
        _session_managers[key] = MaterialsContextManager(session_id, user_id)

    return _session_managers[key]


def clear_session_materials(session_id: str, user_id: str):
    """Clear materials for a session."""
    key = f"{session_id}:{user_id}"
    if key in _session_managers:
        _session_managers[key].clear()
        del _session_managers[key]
