import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db.js';
import { authMiddleware, auditMiddleware } from '../../middleware/authMiddleware.js';

export const riskRouter = Router();
riskRouter.use(authMiddleware);

const calcScore = (l: number, i: number) => l * i;
const calcLevel = (score: number) => {
  if (score >= 16) return 'Critical';
  if (score >= 10) return 'High';
  if (score >= 5) return 'Medium';
  return 'Low';
};

const toRisk = (row: any) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  owner: row.owner,
  status: row.status,
  likelihood: row.likelihood,
  impact: row.impact,
  score: row.score,
  level: row.level,
  dueDate: row.due_date,
  recommendation: row.recommendation,
  existingControls: row.existing_controls,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// GET /api/risks
riskRouter.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM risks WHERE organization_id = $1 ORDER BY created_at DESC`,
      [user.organizationId]
    );
    res.json({ risks: result.rows.map(toRisk) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/risks
riskRouter.post('/', auditMiddleware('risk_created'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, description, category, owner, status, likelihood, impact, dueDate, recommendation, existingControls, notes } = req.body;
    const score = calcScore(Number(likelihood) || 3, Number(impact) || 3);
    const level = calcLevel(score);
    const id = `r-${Date.now()}`;

    const result = await db.query(
      `INSERT INTO risks (id, organization_id, title, description, category, owner, status, likelihood, impact, score, level, due_date, recommendation, existing_controls, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [id, user.organizationId, title, description, category, owner, status || 'Open', likelihood || 3, impact || 3, score, level, dueDate, recommendation, existingControls, notes]
    );
    res.status(201).json({ risk: toRisk(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/risks/:id
riskRouter.get('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM risks WHERE id = $1 AND organization_id = $2`,
      [req.params.id, user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ risk: toRisk(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/risks/:id
riskRouter.put('/:id', auditMiddleware('risk_updated'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, description, category, owner, status, likelihood, impact, dueDate, recommendation, existingControls, notes } = req.body;
    const score = calcScore(Number(likelihood) || 3, Number(impact) || 3);
    const level = calcLevel(score);

    const result = await db.query(
      `UPDATE risks SET title=$1,description=$2,category=$3,owner=$4,status=$5,likelihood=$6,impact=$7,score=$8,level=$9,due_date=$10,recommendation=$11,existing_controls=$12,notes=$13,updated_at=NOW()
       WHERE id=$14 AND organization_id=$15 RETURNING *`,
      [title, description, category, owner, status, likelihood, impact, score, level, dueDate, recommendation, existingControls, notes, req.params.id, user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ risk: toRisk(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/risks/:id
riskRouter.delete('/:id', auditMiddleware('risk_deleted'), async (req, res) => {
  try {
    const user = (req as any).user;
    await db.query(`DELETE FROM risks WHERE id = $1 AND organization_id = $2`, [req.params.id, user.organizationId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/risks/export.csv
riskRouter.get('/export.csv', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM risks WHERE organization_id = $1 ORDER BY score DESC`,
      [user.organizationId]
    );
    const headers = ['ID', 'Title', 'Category', 'Owner', 'Status', 'Likelihood', 'Impact', 'Score', 'Level', 'Due Date', 'Description'];
    const rows = result.rows.map((r: any) => [
      r.id, r.title, r.category, r.owner, r.status,
      r.likelihood, r.impact, r.score, r.level,
      r.due_date || '', r.description || ''
    ].map((v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    try {
      await db.query(
        `INSERT INTO audit_logs (id, organization_id, action, module, entity_type, details, severity, source)
         VALUES ($1,$2,'risk_register_exported','Risk','Risk','Exported risk register to CSV','Low','UI')`,
        [`al-${Date.now()}`, user.organizationId]
      );
    } catch {}
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="risk_register_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/risks/import
riskRouter.post('/import', auditMiddleware('risk_register_imported'), async (req, res) => {
  try {
    const user = (req as any).user;
    const { rows } = req.body;
    let imported = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const likelihood = Number(row.likelihood) || 1;
        const impact = Number(row.impact) || 1;
        const score = calcScore(likelihood, impact);
        const id = `r-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        await db.query(
          `INSERT INTO risks (id, organization_id, title, description, category, owner, status, likelihood, impact, score, level, due_date, recommendation, existing_controls, notes)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [id, user.organizationId, row.title, row.description || '', row.category || 'General', row.owner || 'Unassigned', row.status || 'Open', likelihood, impact, score, calcLevel(score), row.dueDate, row.recommendation || '', row.existingControls || '', row.notes || '']
        );
        imported++;
      } catch {
        failed++;
      }
    }

    res.json({ imported, failed });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
