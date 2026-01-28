-- Migration: User Classification System
-- Date: 2026-01-29
-- Description: Add user classification table and update community_courses with classification fields

-- User classification table
CREATE TABLE IF NOT EXISTS user_classification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    state_id VARCHAR(20) NOT NULL,
    city_id VARCHAR(20) NOT NULL,
    board_id VARCHAR(20) NOT NULL,
    class_level INTEGER NOT NULL CHECK (class_level >= 6 AND class_level <= 12),
    state_name VARCHAR(100),
    city_name VARCHAR(100),
    board_name VARCHAR(100),
    is_complete BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add class_level and state/city to community_courses
ALTER TABLE community_courses
ADD COLUMN IF NOT EXISTS class_level INTEGER CHECK (class_level >= 6 AND class_level <= 12),
ADD COLUMN IF NOT EXISTS state_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS city_id VARCHAR(20),
ADD COLUMN IF NOT EXISTS state_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS city_name VARCHAR(100);

-- Add contribution types to course_contributions
ALTER TABLE course_contributions
ADD COLUMN IF NOT EXISTS contribution_type VARCHAR(20) DEFAULT 'pdf'
    CHECK (contribution_type IN ('pdf', 'image', 'youtube', 'link', 'text')),
ADD COLUMN IF NOT EXISTS contribution_metadata JSONB DEFAULT '{}';

-- Index for classification filtering
CREATE INDEX IF NOT EXISTS idx_community_courses_classification
ON community_courses(state_id, city_id, board_id, class_level);

-- Index for user classification lookup
CREATE INDEX IF NOT EXISTS idx_user_classification_user_id
ON user_classification(user_id);

-- Enable RLS on user_classification
ALTER TABLE user_classification ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own classification
CREATE POLICY "Users can read own classification"
ON user_classification
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own classification
CREATE POLICY "Users can insert own classification"
ON user_classification
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own classification
CREATE POLICY "Users can update own classification"
ON user_classification
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_classification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_user_classification_updated_at ON user_classification;
CREATE TRIGGER trigger_user_classification_updated_at
    BEFORE UPDATE ON user_classification
    FOR EACH ROW
    EXECUTE FUNCTION update_user_classification_updated_at();
