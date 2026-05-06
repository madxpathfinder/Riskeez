import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { db } from './db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setup() {
  console.log('[Setup] Connecting to database...');

  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');

  await db.query(sql);
  console.log('[Setup] Schema applied.');

  // Check if default org exists
  const orgRes = await db.query(`SELECT id FROM organizations WHERE id = 'org-default'`);
  if (orgRes.rowCount === 0) {
    await db.query(
      `INSERT INTO organizations (id, name, industry, country) VALUES ($1, $2, $3, $4)`,
      ['org-default', 'Default Enterprise', 'Technology', 'Azerbaijan']
    );
    console.log('[Setup] Default organization created.');
  }

  // Check if admin user exists
  const userRes = await db.query(`SELECT id FROM users WHERE email = 'admin'`);
  if (userRes.rowCount === 0) {
    const hash = await bcrypt.hash('admin', 10);
    await db.query(
      `INSERT INTO users (id, organization_id, name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), 'org-default', 'System Admin', 'admin', hash, 'admin', 'active']
    );
    console.log('[Setup] Default admin user created (email: admin, password: admin).');
  }

  console.log('[Setup] Done.');
  await db.end();
}

setup().catch(err => {
  console.error('[Setup] Failed:', err.message);
  process.exit(1);
});
