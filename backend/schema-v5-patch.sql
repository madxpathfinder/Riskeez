-- schema-v5-patch.sql: Add app_name to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS app_name TEXT;
