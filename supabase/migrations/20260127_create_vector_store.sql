-- Migration: Create pgvector extension and course embeddings table
-- Date: 2026-01-27
-- Purpose: Migrate from FAISS indices stored in Supabase Storage to native pgvector database storage

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Course Embeddings table for storing vector embeddings
CREATE TABLE IF NOT EXISTS course_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    course_title VARCHAR(255) NOT NULL,

    -- Chunk content and metadata
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    source_file VARCHAR(255),

    -- Vector embedding (3072 dimensions for text-embedding-3-large)
    embedding vector(3072) NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one embedding per chunk per course
    UNIQUE(user_email, course_title, chunk_index)
);

-- Index for fast user/course lookups
CREATE INDEX IF NOT EXISTS idx_course_embeddings_user_course
    ON course_embeddings(user_email, course_title);

-- NOTE: Vector indexes (HNSW, IVFFlat) have a 2000 dimension limit in pgvector
-- Since we use text-embedding-3-large (3072 dims), we cannot create a vector index
-- Similarity searches will use sequential scan which is still performant for moderate data sizes
-- If performance becomes an issue, consider:
-- 1. Using text-embedding-3-small (1536 dims) instead
-- 2. Using dimensionality reduction techniques
-- 3. Upgrading to a Supabase plan with pgvector extensions that support higher dimensions

-- Inverted index table for quotes and important phrases (kept for fast exact matching)
CREATE TABLE IF NOT EXISTS course_inverted_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    course_title VARCHAR(255) NOT NULL,

    -- Quote/phrase and associated chunk index
    phrase TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(user_email, course_title, phrase)
);

-- Index for fast phrase lookups
CREATE INDEX IF NOT EXISTS idx_course_inverted_index_user_course
    ON course_inverted_index(user_email, course_title);
CREATE INDEX IF NOT EXISTS idx_course_inverted_index_phrase
    ON course_inverted_index(phrase);

-- Course Chunks table for storing chunk metadata (optional, for faster retrieval)
CREATE TABLE IF NOT EXISTS course_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) NOT NULL,
    course_title VARCHAR(255) NOT NULL,

    -- Chunk content
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(user_email, course_title, chunk_index)
);

-- Index for fast chunk retrieval
CREATE INDEX IF NOT EXISTS idx_course_chunks_user_course
    ON course_chunks(user_email, course_title);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_course_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS update_course_embeddings_updated_at ON course_embeddings;
CREATE TRIGGER update_course_embeddings_updated_at
    BEFORE UPDATE ON course_embeddings
    FOR EACH ROW
    EXECUTE FUNCTION update_course_embeddings_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE course_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_inverted_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_chunks ENABLE ROW LEVEL SECURITY;

-- Course Embeddings: Users can only access their own embeddings
CREATE POLICY "Users can view own course embeddings"
    ON course_embeddings FOR SELECT
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own course embeddings"
    ON course_embeddings FOR INSERT
    WITH CHECK (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update own course embeddings"
    ON course_embeddings FOR UPDATE
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own course embeddings"
    ON course_embeddings FOR DELETE
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Course Inverted Index: Users can only access their own indexes
CREATE POLICY "Users can view own inverted index"
    ON course_inverted_index FOR SELECT
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own inverted index"
    ON course_inverted_index FOR ALL
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Course Chunks: Users can only access their own chunks
CREATE POLICY "Users can view own course chunks"
    ON course_chunks FOR SELECT
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage own course chunks"
    ON course_chunks FOR ALL
    USING (
        user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );

-- Helper function for vector similarity search
CREATE OR REPLACE FUNCTION match_course_embeddings(
    p_user_email VARCHAR(255),
    p_course_title VARCHAR(255),
    p_query_embedding vector(3072),
    p_match_threshold FLOAT DEFAULT 0.5,
    p_match_count INT DEFAULT 5
)
RETURNS TABLE (
    chunk_text TEXT,
    chunk_index INTEGER,
    similarity FLOAT,
    source_file VARCHAR(255)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.chunk_text,
        ce.chunk_index,
        1 - (ce.embedding <=> p_query_embedding) AS similarity,
        ce.source_file
    FROM course_embeddings ce
    WHERE ce.user_email = p_user_email
        AND ce.course_title = p_course_title
        AND 1 - (ce.embedding <=> p_query_embedding) >= p_match_threshold
    ORDER BY ce.embedding <=> p_query_embedding
    LIMIT p_match_count;
END;
$$;
