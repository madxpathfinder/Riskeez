-- schema-v6-patch.sql: Add department field to risks table
ALTER TABLE risks ADD COLUMN IF NOT EXISTS department TEXT;
