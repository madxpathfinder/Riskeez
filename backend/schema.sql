-- GRC Platform PostgreSQL Schema
-- Safe to run multiple times: uses CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS

-- ─────────────────────────────────────────────────────────────────────────────
-- CORE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS organizations (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  app_name         TEXT,
  industry         TEXT,
  size             TEXT,
  region           TEXT,
  country          TEXT,
  description      TEXT,
  email            TEXT,
  website          TEXT,
  address          TEXT,
  timezone         TEXT DEFAULT 'UTC',
  default_language TEXT DEFAULT 'en',
  departments      JSONB DEFAULT '[]',
  employee_count   INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  id                    TEXT PRIMARY KEY,
  organization_id       TEXT REFERENCES organizations(id),
  name                  TEXT NOT NULL,
  email                 TEXT NOT NULL UNIQUE,
  password_hash         TEXT,
  role                  TEXT NOT NULL DEFAULT 'viewer',
  status                TEXT NOT NULL DEFAULT 'active',
  force_password_change BOOLEAN DEFAULT false,
  last_login            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risks (
  id                TEXT PRIMARY KEY,
  organization_id   TEXT REFERENCES organizations(id),
  title             TEXT NOT NULL,
  description       TEXT,
  category          TEXT,
  owner             TEXT,
  status            TEXT NOT NULL DEFAULT 'Open',
  likelihood        INTEGER NOT NULL DEFAULT 3,
  impact            INTEGER NOT NULL DEFAULT 3,
  score             INTEGER,
  level             TEXT,
  due_date          DATE,
  target_date       DATE,
  recommendation    TEXT,
  existing_controls TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS controls (
  id               TEXT PRIMARY KEY,
  organization_id  TEXT REFERENCES organizations(id),
  risk_id          TEXT REFERENCES risks(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  type             TEXT,
  status           TEXT NOT NULL DEFAULT 'Not Implemented',
  effectiveness    TEXT,
  owner            TEXT,
  framework        TEXT,
  due_date         DATE,
  target_date      DATE,
  domain           TEXT,
  control_ref      TEXT,
  frequency        TEXT,
  evidence_status  TEXT DEFAULT 'Pending',
  last_review_date DATE,
  next_review_date DATE,
  file_path        TEXT,
  file_name        TEXT,
  file_size        BIGINT,
  file_mime        TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assessments (
  id              TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id),
  title           TEXT NOT NULL,
  scope           TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'Draft',
  score           INTEGER DEFAULT 0,
  overall_score   INTEGER DEFAULT 0,
  risk_level      TEXT,
  framework       TEXT,
  started_by      TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  ai_analysis     JSONB,
  inferred_risks  JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS answers (
  id            TEXT PRIMARY KEY,
  assessment_id TEXT REFERENCES assessments(id) ON DELETE CASCADE,
  question_id   TEXT NOT NULL,
  answer        TEXT,
  evidence      TEXT,
  notes         TEXT,
  score         INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS documents (
  id                   TEXT PRIMARY KEY,
  organization_id      TEXT REFERENCES organizations(id),
  name                 TEXT NOT NULL,
  type                 TEXT,
  description          TEXT,
  author               TEXT,
  version              TEXT DEFAULT '1.0',
  doc_status           TEXT DEFAULT 'Draft',
  confidentiality      TEXT DEFAULT 'Internal',
  content              TEXT,
  summary              TEXT,
  tags                 JSONB DEFAULT '[]',
  detected_risks       JSONB DEFAULT '[]',
  missing_evidence     JSONB DEFAULT '[]',
  suggested_controls   JSONB DEFAULT '[]',
  linked_risk_ids      JSONB DEFAULT '[]',
  linked_control_ids   JSONB DEFAULT '[]',
  linked_assessment_ids JSONB DEFAULT '[]',
  file_path            TEXT,
  file_name            TEXT,
  file_size            BIGINT,
  mime_type            TEXT,
  review_date          DATE,
  expiry_date          DATE,
  ai_status            TEXT,
  uploaded_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS notifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT NOT NULL DEFAULT 'info',
  read        BOOLEAN DEFAULT false,
  action_path TEXT,
  timestamp   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id              TEXT PRIMARY KEY,
  organization_id TEXT,
  user_id         TEXT,
  user_name       TEXT,
  user_role       TEXT,
  action          TEXT NOT NULL,
  module          TEXT,
  entity_type     TEXT,
  entity_name     TEXT,
  details         TEXT,
  severity        TEXT DEFAULT 'Low',
  source          TEXT DEFAULT 'UI',
  entity_id       TEXT,
  metadata        JSONB,
  ip_address      TEXT,
  user_agent      TEXT,
  timestamp       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS risk_categories (
  id              TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  color           TEXT DEFAULT '#6366f1',
  is_default      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reports (
  id              TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  assessment_id   TEXT,
  overall_score   NUMERIC(5,2) DEFAULT 0,
  risk_level      TEXT DEFAULT 'Low',
  created_by      TEXT,
  config          JSONB DEFAULT '{}',
  content         JSONB DEFAULT '{}',
  type            TEXT DEFAULT 'executive_summary',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ
);

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

CREATE TABLE IF NOT EXISTS imported_sheets (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  sheet_name      TEXT NOT NULL,
  columns         JSONB DEFAULT '[]',
  row_count       INTEGER DEFAULT 0,
  imported_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, sheet_name)
);

CREATE TABLE IF NOT EXISTS imported_sheet_rows (
  id              TEXT PRIMARY KEY,
  sheet_id        TEXT NOT NULL REFERENCES imported_sheets(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  row_data        JSONB NOT NULL,
  row_index       INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SAFE MIGRATION: ADD COLUMNS IF NOT EXISTS
-- These handle upgrades from older schema versions
-- ─────────────────────────────────────────────────────────────────────────────

-- organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email            TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website          TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address          TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone         TEXT DEFAULT 'UTC';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS departments      JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS employee_count   INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ;

-- risks
ALTER TABLE risks ADD COLUMN IF NOT EXISTS target_date DATE;

-- controls
ALTER TABLE controls ADD COLUMN IF NOT EXISTS target_date       DATE;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS domain            TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS control_ref       TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS frequency         TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS evidence_status   TEXT DEFAULT 'Pending';
ALTER TABLE controls ADD COLUMN IF NOT EXISTS last_review_date  DATE;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS next_review_date  DATE;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS file_path         TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS file_name         TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS file_size         BIGINT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS file_mime         TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS notes             TEXT;

-- assessments
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS description    TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS overall_score  INTEGER DEFAULT 0;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS risk_level     TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS started_by     TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS started_at     TIMESTAMPTZ;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS completed_at   TIMESTAMPTZ;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS ai_analysis    JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS inferred_risks JSONB DEFAULT '[]';

-- answers
ALTER TABLE answers ADD COLUMN IF NOT EXISTS score      INTEGER DEFAULT 0;
ALTER TABLE answers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description            TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS author                 TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version                TEXT DEFAULT '1.0';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_status             TEXT DEFAULT 'Draft';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidentiality        TEXT DEFAULT 'Internal';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags                   JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS linked_risk_ids        JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS linked_control_ids     JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS linked_assessment_ids  JSONB DEFAULT '[]';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path              TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name              TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size              BIGINT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type              TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_date            DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_date            DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_status              TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ;

-- Fix documents JSONB columns that may have been created as TEXT[]
DO $$
BEGIN
  -- Convert tags from TEXT[] to JSONB if needed
  BEGIN
    ALTER TABLE documents ALTER COLUMN tags TYPE JSONB USING
      CASE
        WHEN tags IS NULL THEN '[]'::jsonb
        WHEN pg_typeof(tags)::text = 'text[]' THEN to_jsonb(tags)
        ELSE tags::jsonb
      END;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE documents ALTER COLUMN linked_risk_ids TYPE JSONB USING
      CASE
        WHEN linked_risk_ids IS NULL THEN '[]'::jsonb
        WHEN pg_typeof(linked_risk_ids)::text = 'text[]' THEN to_jsonb(linked_risk_ids)
        ELSE linked_risk_ids::jsonb
      END;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE documents ALTER COLUMN linked_control_ids TYPE JSONB USING
      CASE
        WHEN linked_control_ids IS NULL THEN '[]'::jsonb
        WHEN pg_typeof(linked_control_ids)::text = 'text[]' THEN to_jsonb(linked_control_ids)
        ELSE linked_control_ids::jsonb
      END;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER TABLE documents ALTER COLUMN linked_assessment_ids TYPE JSONB USING
      CASE
        WHEN linked_assessment_ids IS NULL THEN '[]'::jsonb
        WHEN pg_typeof(linked_assessment_ids)::text = 'text[]' THEN to_jsonb(linked_assessment_ids)
        ELSE linked_assessment_ids::jsonb
      END;
  EXCEPTION WHEN others THEN NULL;
  END;
END;
$$;

-- audit_logs
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type     TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_name     TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address      TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent      TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_risks_org              ON risks(organization_id);
CREATE INDEX IF NOT EXISTS idx_risks_status           ON risks(status);
CREATE INDEX IF NOT EXISTS idx_controls_risk          ON controls(risk_id);
CREATE INDEX IF NOT EXISTS idx_controls_org           ON controls(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_org        ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_answers_assessment     ON answers(assessment_id);
CREATE INDEX IF NOT EXISTS idx_documents_org          ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp   ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org         ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_notifications_user     ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_risk_categories_org    ON risk_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_org            ON reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at     ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sheet_rows_sheet       ON imported_sheet_rows(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_rows_org         ON imported_sheet_rows(organization_id);
