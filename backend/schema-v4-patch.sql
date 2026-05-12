-- Riskeez Phase 4 Schema Patch
-- Run: psql -U <user> -d <database> -f schema-v4-patch.sql

-- 1. Extend audit_logs: add organization_id, entity_type, entity_name, ip_address, user_agent, created_at alias
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 2. Extend organizations: add email, website, address, timezone, default_language, departments, employee_count
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS departments JSONB DEFAULT '[]';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS employee_count TEXT;

-- 3. Create risk_categories table
CREATE TABLE IF NOT EXISTS risk_categories (
  id              TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  color           TEXT DEFAULT '#6366f1',
  is_default      BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_categories_org ON risk_categories(organization_id);

-- 4. Create reports table
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
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_org ON reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
