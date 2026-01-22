-- Migration: Create tables for Agent-Driven Tutoring System
-- Date: 2026-01-22

-- Tutor Sessions table
CREATE TABLE IF NOT EXISTS tutor_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Curriculum selection
    selection_state VARCHAR(10),
    selection_city VARCHAR(10),
    selection_board VARCHAR(20),
    selection_subject VARCHAR(20),
    selection_chapter VARCHAR(20),
    selection_topic TEXT,

    -- Display names for UI
    state_name VARCHAR(100),
    city_name VARCHAR(100),
    board_name VARCHAR(100),
    subject_name VARCHAR(100),
    chapter_name VARCHAR(200),

    -- Session state
    current_state VARCHAR(50) DEFAULT 'idle',
    previous_state VARCHAR(50),
    student_level VARCHAR(20) DEFAULT 'intermediate',

    -- Assessment data
    assessment_score DECIMAL(5, 2) DEFAULT 0,

    -- Progress tracking
    concepts_covered TEXT[] DEFAULT '{}',
    current_section_index INTEGER DEFAULT 0,
    current_subtopic_index INTEGER DEFAULT 0,

    -- Outline (JSON blob)
    outline JSONB,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,

    -- Status flags
    is_paused BOOLEAN DEFAULT FALSE,
    is_complete BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user session lookups
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_user_id ON tutor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_current_state ON tutor_sessions(current_state);
CREATE INDEX IF NOT EXISTS idx_tutor_sessions_created_at ON tutor_sessions(created_at DESC);

-- Session Messages table
CREATE TABLE IF NOT EXISTS session_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,

    role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    state VARCHAR(50), -- State when message was sent

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_created_at ON session_messages(session_id, created_at);

-- Assessment Responses table
CREATE TABLE IF NOT EXISTS assessment_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES tutor_sessions(id) ON DELETE CASCADE,

    question_index INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL, -- 'mcq', 'true_false', 'short_answer'
    difficulty VARCHAR(10) DEFAULT 'medium',

    student_answer TEXT NOT NULL,
    correct_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,

    time_spent_seconds INTEGER,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for assessment lookups
CREATE INDEX IF NOT EXISTS idx_assessment_responses_session_id ON assessment_responses(session_id);

-- User Progress table (cross-session tracking)
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Curriculum identifiers
    board VARCHAR(20) NOT NULL,
    subject VARCHAR(20) NOT NULL,
    chapter VARCHAR(20) NOT NULL,
    topic TEXT,

    -- Progress metrics
    completion_percentage DECIMAL(5, 2) DEFAULT 0,
    mastery_level VARCHAR(20) DEFAULT 'beginner',
    time_spent_minutes INTEGER DEFAULT 0,
    average_assessment_score DECIMAL(5, 2) DEFAULT 0,

    -- Session counts
    sessions_completed INTEGER DEFAULT 0,
    concepts_mastered TEXT[] DEFAULT '{}',

    -- Timing
    first_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint on user + curriculum
    UNIQUE(user_id, board, subject, chapter)
);

-- Index for user progress lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_curriculum ON user_progress(board, subject, chapter);

-- Course Outlines cache table
CREATE TABLE IF NOT EXISTS course_outlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Curriculum identifiers
    board VARCHAR(20) NOT NULL,
    subject VARCHAR(20) NOT NULL,
    chapter VARCHAR(20) NOT NULL,
    topic TEXT,

    -- Outline content
    outline_json JSONB NOT NULL,
    source_urls TEXT[] DEFAULT '{}',

    -- Cache management
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint for caching
    UNIQUE(board, subject, chapter, topic)
);

-- Index for outline lookups
CREATE INDEX IF NOT EXISTS idx_course_outlines_curriculum ON course_outlines(board, subject, chapter);
CREATE INDEX IF NOT EXISTS idx_course_outlines_expires ON course_outlines(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_tutor_sessions_updated_at ON tutor_sessions;
CREATE TRIGGER update_tutor_sessions_updated_at
    BEFORE UPDATE ON tutor_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON user_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE tutor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_outlines ENABLE ROW LEVEL SECURITY;

-- Tutor Sessions: Users can only access their own sessions
CREATE POLICY "Users can view own sessions"
    ON tutor_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
    ON tutor_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON tutor_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Session Messages: Users can access messages from their sessions
CREATE POLICY "Users can view messages from own sessions"
    ON session_messages FOR SELECT
    USING (session_id IN (
        SELECT id FROM tutor_sessions WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create messages in own sessions"
    ON session_messages FOR INSERT
    WITH CHECK (session_id IN (
        SELECT id FROM tutor_sessions WHERE user_id = auth.uid()
    ));

-- Assessment Responses: Users can access their assessment data
CREATE POLICY "Users can view own assessment responses"
    ON assessment_responses FOR SELECT
    USING (session_id IN (
        SELECT id FROM tutor_sessions WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create own assessment responses"
    ON assessment_responses FOR INSERT
    WITH CHECK (session_id IN (
        SELECT id FROM tutor_sessions WHERE user_id = auth.uid()
    ));

-- User Progress: Users can only access their own progress
CREATE POLICY "Users can view own progress"
    ON user_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
    ON user_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- Course Outlines: Public read access (cached outlines)
CREATE POLICY "Anyone can view course outlines"
    ON course_outlines FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can insert/update outlines
CREATE POLICY "Service role can manage outlines"
    ON course_outlines FOR ALL
    USING (auth.role() = 'service_role');
