import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

export const categoryRouter = Router();
categoryRouter.use(authMiddleware);

const toCat = (row: any) => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  description: row.description,
  color: row.color || '#6366f1',
  isDefault: row.is_default,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// GET /api/categories
categoryRouter.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM risk_categories WHERE organization_id = $1 ORDER BY name ASC`,
      [user.organizationId]
    );
    res.json({ categories: result.rows.map(toCat) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories
categoryRouter.post('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = `cat-${Date.now()}`;
    const result = await db.query(
      `INSERT INTO risk_categories (id, organization_id, name, description, color)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, user.organizationId, name, description || null, color || '#6366f1']
    );
    res.status(201).json({ category: toCat(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id
categoryRouter.put('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, description, color } = req.body;
    const result = await db.query(
      `UPDATE risk_categories SET name=$1, description=$2, color=$3, updated_at=NOW()
       WHERE id=$4 AND organization_id=$5 RETURNING *`,
      [name, description || null, color || '#6366f1', req.params.id, user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ category: toCat(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id  — check usage first
categoryRouter.delete('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const existing = await db.query(
      `SELECT name FROM risk_categories WHERE id=$1 AND organization_id=$2`,
      [req.params.id, user.organizationId]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });

    const catName = existing.rows[0].name;
    const usageCount = await db.query(
      `SELECT COUNT(*) FROM risks WHERE organization_id=$1 AND category=$2`,
      [user.organizationId, catName]
    );
    const count = parseInt(usageCount.rows[0].count, 10);

    if (count > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        error: `Category "${catName}" is used by ${count} risk(s). Pass ?force=true to delete anyway.`,
        usageCount: count
      });
    }

    await db.query(`DELETE FROM risk_categories WHERE id=$1 AND organization_id=$2`, [req.params.id, user.organizationId]);
    res.json({ success: true, usageCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
