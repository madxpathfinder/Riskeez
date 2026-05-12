import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware, requirePermission } from '../../middleware/authMiddleware.js';

export const organizationRouter = Router();
organizationRouter.use(authMiddleware);

const toOrg = (row: any) => ({
  id: row.id,
  name: row.name,
  appName: row.app_name || null,
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
organizationRouter.put('/current', requirePermission('organization:manage'), async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      name, appName, industry, size, region, country, description,
      email, website, address, timezone, defaultLanguage, departments, employeeCount
    } = req.body;

    const result = await db.query(
      `UPDATE organizations SET
         name=$1, app_name=$2, industry=$3, size=$4, region=$5, country=$6, description=$7,
         email=$8, website=$9, address=$10, timezone=$11, default_language=$12,
         departments=$13, employee_count=$14
       WHERE id=$15 RETURNING *`,
      [name, appName || null, industry, size, region, country, description || null,
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
