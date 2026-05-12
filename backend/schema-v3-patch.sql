-- Riskeez Schema v3 Patch
-- Run: psql -U <user> -d <database> -f backend/schema-v3-patch.sql

-- ── Imported Sheets ─────────────────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_sheet_rows_sheet ON imported_sheet_rows(sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_rows_org   ON imported_sheet_rows(organization_id);

-- ── Controls: extra fields for full catalog ──────────────────────────────────
ALTER TABLE controls ADD COLUMN IF NOT EXISTS domain           TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS control_ref      TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS frequency        TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS evidence_status  TEXT DEFAULT 'Pending';
ALTER TABLE controls ADD COLUMN IF NOT EXISTS last_review_date DATE;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS file_path        TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS file_name        TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS file_size        INTEGER;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS file_mime        TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS notes            TEXT;

-- ── Documents: extra fields ───────────────────────────────────────────────────
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description           TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS author                TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version               TEXT DEFAULT '1.0';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS doc_status            TEXT DEFAULT 'Draft';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidentiality       TEXT DEFAULT 'Internal';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS tags                  TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS linked_risk_ids       TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS linked_control_ids    TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS linked_assessment_ids TEXT[];
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path             TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_name             TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size             INTEGER;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type             TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_date           DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_date           DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at            TIMESTAMPTZ;
