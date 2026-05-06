import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db.js';
import { authMiddleware, permissionMiddleware } from '../../middleware/authMiddleware.js';

export const userRouter = Router();
userRouter.use(authMiddleware);

const toUser = (row: any) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  organizationId: row.organization_id,
  status: row.status,
  forcePasswordChange: row.force_password_change,
  lastLogin: row.last_login,
  createdAt: row.created_at
});

// GET /api/users
userRouter.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(`SELECT * FROM users WHERE organization_id = $1 ORDER BY created_at`, [user.organizationId]);
    res.json({ users: result.rows.map(toUser) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users
userRouter.post('/', permissionMiddleware(['admin']), async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, email, role, password } = req.body;
    const hash = await bcrypt.hash(password || 'changeme', 10);
    const id = uuidv4();

    const result = await db.query(
      `INSERT INTO users (id, organization_id, name, email, password_hash, role, status, force_password_change)
       VALUES ($1,$2,$3,$4,$5,$6,'active',$7) RETURNING *`,
      [id, user.organizationId, name, email, hash, role || 'viewer', !password]
    );
    res.status(201).json({ user: toUser(result.rows[0]) });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/:id
userRouter.put('/:id', permissionMiddleware(['admin']), async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, email, role, status } = req.body;
    const result = await db.query(
      `UPDATE users SET name=$1,email=$2,role=$3,status=$4 WHERE id=$5 AND organization_id=$6 RETURNING *`,
      [name, email, role, status, req.params.id, user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ user: toUser(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/disable
userRouter.post('/:id/disable', permissionMiddleware(['admin']), async (req, res) => {
  try {
    const user = (req as any).user;
    await db.query(`UPDATE users SET status='disabled' WHERE id=$1 AND organization_id=$2`, [req.params.id, user.organizationId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/enable
userRouter.post('/:id/enable', permissionMiddleware(['admin']), async (req, res) => {
  try {
    const user = (req as any).user;
    await db.query(`UPDATE users SET status='active' WHERE id=$1 AND organization_id=$2`, [req.params.id, user.organizationId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/reset-password
userRouter.post('/:id/reset-password', permissionMiddleware(['admin']), async (req, res) => {
  try {
    const user = (req as any).user;
    const { password, forceChange } = req.body;
    const hash = await bcrypt.hash(password || 'changeme', 10);
    await db.query(
      `UPDATE users SET password_hash=$1, force_password_change=$2 WHERE id=$3 AND organization_id=$4`,
      [hash, forceChange !== false, req.params.id, user.organizationId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
