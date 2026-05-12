-- Riskeez Schema v2 Patch
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)

-- ─────────────────────────────────────────────
-- 1. Extend `assessments` table
-- ─────────────────────────────────────────────
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS description    TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS started_by     TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS overall_score  INTEGER DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS risk_level     TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS ai_analysis    JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS inferred_risks JSONB DEFAULT '[]';

-- ─────────────────────────────────────────────
-- 2. Extend `answers` table
-- ─────────────────────────────────────────────
ALTER TABLE answers ADD COLUMN IF NOT EXISTS score      INTEGER DEFAULT 0;
ALTER TABLE answers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- ─────────────────────────────────────────────
-- 3. Extend `risks` table
-- ─────────────────────────────────────────────
ALTER TABLE risks ADD COLUMN IF NOT EXISTS target_date DATE;

-- ─────────────────────────────────────────────
-- 4. Create `assessment_questions` table
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_questions (
  id          TEXT PRIMARY KEY,
  category    TEXT NOT NULL,
  text        TEXT NOT NULL,
  weight      INTEGER NOT NULL DEFAULT 3,
  answer_type TEXT NOT NULL DEFAULT 'yes_no',
  help_text   TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_answers_assessment ON answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessments_org    ON assessments(organization_id);
