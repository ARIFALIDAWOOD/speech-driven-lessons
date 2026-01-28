-- Migration: Community Courses Schema
-- Date: 2026-01-28
-- Purpose: Create tables for community courses with contribution workflow

-- ============================================================================
-- COMMUNITY COURSES TABLE
-- ============================================================================
-- Represents a course based on Board/Subject/Chapter with community materials

CREATE TABLE IF NOT EXISTS community_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Course metadata
    title TEXT NOT NULL,
    description TEXT,

    -- Curriculum hierarchy (B/S/C identifiers)
    board_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    chapter_id TEXT NOT NULL,

    -- Human-readable names for display
    board_name TEXT,
    subject_name TEXT,
    chapter_name TEXT,

    -- Custom courses (not linked to curriculum)
    is_custom BOOLEAN DEFAULT false,

    -- Creator (first person to create this B/S/C course)
    creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Aggregate statistics (denormalized for performance)
    material_count INTEGER DEFAULT 0,
    contributor_count INTEGER DEFAULT 0,
    learner_count INTEGER DEFAULT 0,

    -- Status: active, archived, hidden
    status TEXT DEFAULT 'active',

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: Only one course per B/S/C combo (unless custom)
CREATE UNIQUE INDEX IF NOT EXISTS idx_community_courses_bsc_unique
    ON community_courses(board_id, subject_id, chapter_id)
    WHERE NOT is_custom;

-- Index for fast lookups by curriculum hierarchy
CREATE INDEX IF NOT EXISTS idx_community_courses_board
    ON community_courses(board_id);
CREATE INDEX IF NOT EXISTS idx_community_courses_subject
    ON community_courses(board_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_community_courses_chapter
    ON community_courses(board_id, subject_id, chapter_id);
CREATE INDEX IF NOT EXISTS idx_community_courses_status
    ON community_courses(status);
CREATE INDEX IF NOT EXISTS idx_community_courses_creator
    ON community_courses(creator_id);


-- ============================================================================
-- COURSE CONTRIBUTIONS TABLE
-- ============================================================================
-- Pending uploads that need validation/approval

CREATE TABLE IF NOT EXISTS course_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to community course
    course_id UUID NOT NULL REFERENCES community_courses(id) ON DELETE CASCADE,

    -- Contributor info
    contributor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File information
    filename TEXT NOT NULL,
    file_size INTEGER,
    s3_key TEXT NOT NULL,

    -- Approval workflow
    -- Status: pending, approved, rejected
    status TEXT DEFAULT 'pending',

    -- Agent validation results
    validation_score DECIMAL(3,2),  -- 0.00 to 1.00
    validation_result JSONB,        -- Detailed validation output

    -- Admin review
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for contribution queries
CREATE INDEX IF NOT EXISTS idx_contributions_course
    ON course_contributions(course_id);
CREATE INDEX IF NOT EXISTS idx_contributions_contributor
    ON course_contributions(contributor_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status
    ON course_contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_pending
    ON course_contributions(status, submitted_at)
    WHERE status = 'pending';


-- ============================================================================
-- COURSE MATERIALS TABLE
-- ============================================================================
-- Approved materials available for learning

CREATE TABLE IF NOT EXISTS course_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Link to community course
    course_id UUID NOT NULL REFERENCES community_courses(id) ON DELETE CASCADE,

    -- Link to original contribution (for audit trail)
    contribution_id UUID REFERENCES course_contributions(id) ON DELETE SET NULL,

    -- File information
    filename TEXT NOT NULL,
    file_size INTEGER,
    s3_key TEXT NOT NULL,

    -- Timestamps
    added_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for material queries
CREATE INDEX IF NOT EXISTS idx_materials_course
    ON course_materials(course_id);


-- ============================================================================
-- COURSE MEMBERSHIPS TABLE
-- ============================================================================
-- User enrollment and progress tracking

CREATE TABLE IF NOT EXISTS course_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Course and user
    course_id UUID NOT NULL REFERENCES community_courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Role: creator, contributor, learner
    role TEXT NOT NULL DEFAULT 'learner',

    -- Progress tracking
    progress_pct DECIMAL(5,2) DEFAULT 0,
    time_spent_mins INTEGER DEFAULT 0,

    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT now(),
    last_accessed_at TIMESTAMPTZ,

    -- Unique constraint: one membership per user per course
    UNIQUE(course_id, user_id)
);

-- Indexes for membership queries
CREATE INDEX IF NOT EXISTS idx_memberships_course
    ON course_memberships(course_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user
    ON course_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_role
    ON course_memberships(course_id, role);


-- ============================================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_community_course_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_community_course_updated_at ON community_courses;
CREATE TRIGGER update_community_course_updated_at
    BEFORE UPDATE ON community_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_community_course_updated_at();


-- ============================================================================
-- TRIGGERS FOR AGGREGATE COUNT UPDATES
-- ============================================================================

-- Update material_count when materials change
CREATE OR REPLACE FUNCTION update_course_material_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_courses
        SET material_count = material_count + 1,
            updated_at = NOW()
        WHERE id = NEW.course_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_courses
        SET material_count = GREATEST(material_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.course_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_material_count ON course_materials;
CREATE TRIGGER trg_update_material_count
    AFTER INSERT OR DELETE ON course_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_course_material_count();


-- Update learner_count when memberships change (for learner role)
CREATE OR REPLACE FUNCTION update_course_learner_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.role = 'learner' THEN
        UPDATE community_courses
        SET learner_count = learner_count + 1,
            updated_at = NOW()
        WHERE id = NEW.course_id;
    ELSIF TG_OP = 'DELETE' AND OLD.role = 'learner' THEN
        UPDATE community_courses
        SET learner_count = GREATEST(learner_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.course_id;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle role changes
        IF OLD.role = 'learner' AND NEW.role != 'learner' THEN
            UPDATE community_courses
            SET learner_count = GREATEST(learner_count - 1, 0),
                updated_at = NOW()
            WHERE id = NEW.course_id;
        ELSIF OLD.role != 'learner' AND NEW.role = 'learner' THEN
            UPDATE community_courses
            SET learner_count = learner_count + 1,
                updated_at = NOW()
            WHERE id = NEW.course_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_learner_count ON course_memberships;
CREATE TRIGGER trg_update_learner_count
    AFTER INSERT OR UPDATE OR DELETE ON course_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_course_learner_count();


-- Update contributor_count when memberships change (for contributor role)
CREATE OR REPLACE FUNCTION update_course_contributor_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.role = 'contributor' THEN
        UPDATE community_courses
        SET contributor_count = contributor_count + 1,
            updated_at = NOW()
        WHERE id = NEW.course_id;
    ELSIF TG_OP = 'DELETE' AND OLD.role = 'contributor' THEN
        UPDATE community_courses
        SET contributor_count = GREATEST(contributor_count - 1, 0),
            updated_at = NOW()
        WHERE id = OLD.course_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.role = 'contributor' AND NEW.role != 'contributor' THEN
            UPDATE community_courses
            SET contributor_count = GREATEST(contributor_count - 1, 0),
                updated_at = NOW()
            WHERE id = NEW.course_id;
        ELSIF OLD.role != 'contributor' AND NEW.role = 'contributor' THEN
            UPDATE community_courses
            SET contributor_count = contributor_count + 1,
                updated_at = NOW()
            WHERE id = NEW.course_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_contributor_count ON course_memberships;
CREATE TRIGGER trg_update_contributor_count
    AFTER INSERT OR UPDATE OR DELETE ON course_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_course_contributor_count();


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE community_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_memberships ENABLE ROW LEVEL SECURITY;

-- -------------------------
-- COMMUNITY COURSES POLICIES
-- -------------------------

-- Drop existing policies first to make migration idempotent
DROP POLICY IF EXISTS "Anyone can view active courses" ON community_courses;
DROP POLICY IF EXISTS "Authenticated users can create courses" ON community_courses;
DROP POLICY IF EXISTS "Creators can update own courses" ON community_courses;

-- Anyone can view active courses
CREATE POLICY "Anyone can view active courses"
    ON community_courses FOR SELECT
    USING (status = 'active');

-- Authenticated users can create courses
CREATE POLICY "Authenticated users can create courses"
    ON community_courses FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Creators can update their courses
CREATE POLICY "Creators can update own courses"
    ON community_courses FOR UPDATE
    USING (creator_id = auth.uid());

-- -------------------------
-- COURSE CONTRIBUTIONS POLICIES
-- -------------------------

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own contributions" ON course_contributions;
DROP POLICY IF EXISTS "Course members can view course contributions" ON course_contributions;
DROP POLICY IF EXISTS "Authenticated users can contribute" ON course_contributions;
DROP POLICY IF EXISTS "Course creators can review contributions" ON course_contributions;

-- Contributors can view their own contributions
CREATE POLICY "Users can view own contributions"
    ON course_contributions FOR SELECT
    USING (contributor_id = auth.uid());

-- Course members can view all contributions for their courses
CREATE POLICY "Course members can view course contributions"
    ON course_contributions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM course_memberships cm
            WHERE cm.course_id = course_contributions.course_id
            AND cm.user_id = auth.uid()
        )
    );

-- Authenticated users can insert contributions
CREATE POLICY "Authenticated users can contribute"
    ON course_contributions FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL AND contributor_id = auth.uid());

-- Creators can update contributions (for approval)
CREATE POLICY "Course creators can review contributions"
    ON course_contributions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM community_courses cc
            WHERE cc.id = course_contributions.course_id
            AND cc.creator_id = auth.uid()
        )
    );

-- -------------------------
-- COURSE MATERIALS POLICIES
-- -------------------------

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view course materials" ON course_materials;
DROP POLICY IF EXISTS "System can insert materials" ON course_materials;

-- Anyone can view materials from active courses
CREATE POLICY "Anyone can view course materials"
    ON course_materials FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM community_courses cc
            WHERE cc.id = course_materials.course_id
            AND cc.status = 'active'
        )
    );

-- System can insert materials (via contribution approval)
CREATE POLICY "System can insert materials"
    ON course_materials FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- -------------------------
-- COURSE MEMBERSHIPS POLICIES
-- -------------------------

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view own memberships" ON course_memberships;
DROP POLICY IF EXISTS "Course creators can view all memberships" ON course_memberships;
DROP POLICY IF EXISTS "Users can join courses" ON course_memberships;
DROP POLICY IF EXISTS "Users can update own progress" ON course_memberships;
DROP POLICY IF EXISTS "Users can leave courses" ON course_memberships;

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
    ON course_memberships FOR SELECT
    USING (user_id = auth.uid());

-- Course creators can view all memberships
CREATE POLICY "Course creators can view all memberships"
    ON course_memberships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM community_courses cc
            WHERE cc.id = course_memberships.course_id
            AND cc.creator_id = auth.uid()
        )
    );

-- Users can join courses (insert their own membership)
CREATE POLICY "Users can join courses"
    ON course_memberships FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can update their own progress
CREATE POLICY "Users can update own progress"
    ON course_memberships FOR UPDATE
    USING (user_id = auth.uid());

-- Users can leave courses (delete their membership)
CREATE POLICY "Users can leave courses"
    ON course_memberships FOR DELETE
    USING (user_id = auth.uid());


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if a course exists for given B/S/C
CREATE OR REPLACE FUNCTION check_course_exists(
    p_board_id TEXT,
    p_subject_id TEXT,
    p_chapter_id TEXT
)
RETURNS TABLE (
    course_exists BOOLEAN,
    course_id UUID,
    title TEXT,
    material_count INTEGER,
    learner_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        true AS course_exists,
        cc.id AS course_id,
        cc.title,
        cc.material_count,
        cc.learner_count
    FROM community_courses cc
    WHERE cc.board_id = p_board_id
        AND cc.subject_id = p_subject_id
        AND cc.chapter_id = p_chapter_id
        AND cc.is_custom = false
        AND cc.status = 'active'
    LIMIT 1;

    -- If no rows returned, return a single row with course_exists=false
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::INTEGER;
    END IF;
END;
$$;


-- Function to get user's courses with progress
CREATE OR REPLACE FUNCTION get_user_courses_with_progress(p_user_id UUID)
RETURNS TABLE (
    course_id UUID,
    title TEXT,
    board_name TEXT,
    subject_name TEXT,
    chapter_name TEXT,
    role TEXT,
    progress_pct DECIMAL(5,2),
    time_spent_mins INTEGER,
    material_count INTEGER,
    last_accessed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        cc.id AS course_id,
        cc.title,
        cc.board_name,
        cc.subject_name,
        cc.chapter_name,
        cm.role,
        cm.progress_pct,
        cm.time_spent_mins,
        cc.material_count,
        cm.last_accessed_at
    FROM course_memberships cm
    JOIN community_courses cc ON cc.id = cm.course_id
    WHERE cm.user_id = p_user_id
        AND cc.status = 'active'
    ORDER BY cm.last_accessed_at DESC NULLS LAST;
END;
$$;
