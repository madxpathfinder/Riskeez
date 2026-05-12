import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware, requirePermission } from '../../middleware/authMiddleware.js';

export const reportRouter = Router();
reportRouter.use(authMiddleware);

const toReport = (row: any) => ({
  id: row.id,
  organizationId: row.organization_id,
  title: row.title,
  assessmentId: row.assessment_id,
  overallScore: parseFloat(row.overall_score) || 0,
  riskLevel: row.risk_level || 'Low',
  createdBy: row.created_by,
  config: row.config || {},
  content: row.content || {},
  type: row.type || 'executive_summary',
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

async function auditLog(action: string, desc: string, orgId: string) {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, organization_id, action, module, entity_type, details, severity, source)
       VALUES ($1,$2,$3,'Report','Report',$4,'Low','API')`,
      [`al-${Date.now()}`, orgId, action, desc]
    );
  } catch {}
}

// GET /api/reports
reportRouter.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM reports WHERE organization_id = $1 ORDER BY created_at DESC`,
      [user.organizationId]
    );
    res.json({ reports: result.rows.map(toReport) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:id
reportRouter.get('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM reports WHERE id = $1 AND organization_id = $2`,
      [req.params.id, user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ report: toReport(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/reports
reportRouter.post('/', requirePermission('reports:create'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, assessmentId, overallScore, riskLevel, createdBy, config, content, type } = req.body;
    const id = `rep-${Date.now()}`;

    const result = await db.query(
      `INSERT INTO reports
         (id, organization_id, title, assessment_id, overall_score, risk_level, created_by, config, content, type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [id, user.organizationId, title, assessmentId || null, overallScore || 0,
       riskLevel || 'Low', createdBy || user.name, JSON.stringify(config || {}),
       JSON.stringify(content || {}), type || 'executive_summary']
    );
    await auditLog('report_generated', `Generated report: ${title}`, user.organizationId);
    res.status(201).json({ report: toReport(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/reports/:id
reportRouter.put('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, assessmentId, overallScore, riskLevel, createdBy, config, content, type } = req.body;
    const result = await db.query(
      `UPDATE reports SET
         title=$1, assessment_id=$2, overall_score=$3, risk_level=$4,
         created_by=$5, config=$6, content=$7, type=$8, updated_at=NOW()
       WHERE id=$9 AND organization_id=$10 RETURNING *`,
      [title, assessmentId || null, overallScore || 0, riskLevel || 'Low',
       createdBy || user.name, JSON.stringify(config || {}),
       JSON.stringify(content || {}), type || 'executive_summary',
       req.params.id, user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ report: toReport(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/reports/:id
reportRouter.delete('/:id', requirePermission('reports:delete'), async (req, res) => {
  try {
    const user = (req as any).user;
    const existing = await db.query(
      `SELECT title FROM reports WHERE id=$1 AND organization_id=$2`,
      [req.params.id, user.organizationId]
    );
    await db.query(`DELETE FROM reports WHERE id=$1 AND organization_id=$2`, [req.params.id, user.organizationId]);
    await auditLog('report_deleted', `Deleted report: ${existing.rows[0]?.title || req.params.id}`, user.organizationId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reports/:id/export.csv  (risk register export scoped to report)
reportRouter.get('/:id/export.csv', requirePermission('data:export'), async (req, res) => {
  try {
    const user = (req as any).user;
    const risks = await db.query(
      `SELECT * FROM risks WHERE organization_id = $1 ORDER BY score DESC`,
      [user.organizationId]
    );
    const headers = ['ID', 'Title', 'Category', 'Owner', 'Status', 'Likelihood', 'Impact', 'Score', 'Level', 'Due Date'];
    const rows = risks.rows.map((r: any) => [
      r.id, r.title, r.category, r.owner, r.status,
      r.likelihood, r.impact, r.score, r.level, r.due_date || ''
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    await auditLog('report_exported', `Exported risk register for report ${req.params.id}`, user.organizationId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="risk_register_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
