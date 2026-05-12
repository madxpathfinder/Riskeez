import { Router } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'riskeez-dev-secret';

// Normalize DB role strings to match frontend Role enum values
function normalizeRole(role: string): string {
  switch (role.toLowerCase().replace(/[\s_-]/g, '')) {
    case 'admin': return 'Admin';
    case 'riskmanager': return 'Risk Manager';
    case 'auditor': return 'Auditor';
    default: return 'Viewer';
  }
}

// GET /api/auth/setup/status
authRouter.get('/setup/status', async (req, res) => {
  try {
    const result = await db.query(`SELECT COUNT(*) FROM users WHERE LOWER(role) = 'admin'`);
    const adminCount = parseInt(result.rows[0].count, 10);
    res.json({ isInitialized: adminCount > 0 });
  } catch {
    res.json({ isInitialized: false });
  }
});

// POST /api/auth/setup/initial-admin
authRouter.post('/setup/initial-admin', async (req, res) => {
  try {
    const { name, email, password, organizationName, industry, country } = req.body;
    if (!name || !email || !organizationName) {
      return res.status(400).json({ error: 'name, email, and organizationName are required' });
    }

    const existing = await db.query(`SELECT id FROM users WHERE LOWER(role) = 'admin' LIMIT 1`);
    if (existing.rowCount && existing.rowCount > 0) {
      return res.status(409).json({ error: 'Admin already exists' });
    }

    const orgId = `org-${Date.now()}`;
    await db.query(
      `INSERT INTO organizations (id, name, industry, country) VALUES ($1, $2, $3, $4)`,
      [orgId, organizationName, industry || 'Technology', country || '']
    );

    const hash = await bcrypt.hash(password || 'admin', 10);
    const userId = uuidv4();
    await db.query(
      `INSERT INTO users (id, organization_id, name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, $5, 'Admin', 'Active')`,
      [userId, orgId, name, email, hash]
    );

    const user = { id: userId, name, email, role: 'Admin', organizationId: orgId };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });
    res.status(201).json({ token, user });
  } catch (err: any) {
    console.error('[Auth] setup error:', err.message);
    res.status(500).json({ error: 'Setup failed' });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await db.query(
      `SELECT id, name, email, role, organization_id, status, password_hash, force_password_change
       FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const row = result.rows[0];

    if (row.status && row.status.toLowerCase() !== 'active') {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await db.query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [row.id]);

    await db.query(
      `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), row.id, row.name, row.role, 'user_logged_in', 'User', `User logged in: ${row.email}`]
    );

    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: normalizeRole(row.role),
      organizationId: row.organization_id,
      status: row.status,
      forcePasswordChange: row.force_password_change
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user });
  } catch (err: any) {
    console.error('[Auth] login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  if (user) {
    await db.query(
      `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuidv4(), user.id, user.name, user.role, 'user_logged_out', 'User', `User logged out: ${user.email}`]
    );
  }
  res.json({ success: true });
});

// GET /api/auth/me
authRouter.get('/me', authMiddleware, async (req, res) => {
  const tokenUser = (req as any).user;
  try {
    const result = await db.query(
      `SELECT id, name, email, role, organization_id, status FROM users WHERE id = $1`,
      [tokenUser.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    const row = result.rows[0];
    res.json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: normalizeRole(row.role),
        organizationId: row.organization_id,
        status: row.status
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});
