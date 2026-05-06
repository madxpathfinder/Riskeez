import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

export const organizationRouter = Router();
organizationRouter.use(authMiddleware);

const toOrg = (row: any) => ({
  id: row.id,
  name: row.name,
  industry: row.industry,
  size: row.size,
  region: row.region,
  country: row.country,
  description: row.description,
  email: row.email,
  website: row.website,
  address: row.address,
  timezone: row.timezone,
  defaultLanguage: row.default_language,
  departments: row.departments || [],
  employeeCount: row.employee_count,
  createdAt: row.created_at
});

// GET /api/organizations/current
organizationRouter.get('/current', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(`SELECT * FROM organizations WHERE id = $1`, [user.organizationId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ organization: toOrg(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/organizations/current
organizationRouter.put('/current', async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      name, industry, size, region, country, description,
      email, website, address, timezone, defaultLanguage, departments, employeeCount
    } = req.body;

    const result = await db.query(
      `UPDATE organizations SET
         name=$1, industry=$2, size=$3, region=$4, country=$5, description=$6,
         email=$7, website=$8, address=$9, timezone=$10, default_language=$11,
         departments=$12, employee_count=$13
       WHERE id=$14 RETURNING *`,
      [name, industry, size, region, country, description || null,
       email || null, website || null, address || null,
       timezone || 'UTC', defaultLanguage || 'en',
       JSON.stringify(departments || []), employeeCount || null,
       user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });

    // Audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (id, organization_id, action, module, entity_type, details, severity, source)
         VALUES ($1,$2,'organization_updated','Settings','Organization','Updated organization profile','Low','UI')`,
        [`al-${Date.now()}`, user.organizationId]
      );
    } catch {}

    res.json({ organization: toOrg(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
