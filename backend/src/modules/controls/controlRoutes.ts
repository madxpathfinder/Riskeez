import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware, requirePermission } from '../../middleware/authMiddleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'controls');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const controlRouter = Router();
controlRouter.use(authMiddleware);

const toControl = (row: any) => ({
  id: row.id,
  riskId: row.risk_id,
  title: row.title,
  description: row.description,
  type: row.type,
  status: row.status,
  effectiveness: row.effectiveness,
  owner: row.owner,
  framework: row.framework,
  dueDate: row.due_date,
  domain: row.domain,
  controlRef: row.control_ref,
  frequency: row.frequency,
  evidenceStatus: row.evidence_status,
  lastReviewDate: row.last_review_date,
  nextReviewDate: row.next_review_date,
  fileName: row.file_name,
  fileSize: row.file_size,
  fileMime: row.file_mime,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

async function auditLog(action: string, entity: string, desc: string, orgId: string) {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, organization_id, action, module, entity_type, details, severity, source)
       VALUES ($1,$2,$3,$4,$5,$6,'Low','API')`,
      [`al-${Date.now()}`, orgId, action, entity, entity, desc]
    );
  } catch {}
}

// GET /api/controls
controlRouter.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM controls WHERE organization_id = $1 ORDER BY created_at`,
      [user.organizationId]
    );
    res.json({ controls: result.rows.map(toControl) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/controls
controlRouter.post('/', requirePermission('controls:create'), async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      riskId, title, description, type, status, effectiveness, owner, framework, dueDate,
      domain, controlRef, frequency, evidenceStatus, lastReviewDate, nextReviewDate, notes,
      fileBase64, fileName, fileMime
    } = req.body;

    const id = `c-${Date.now()}`;
    let filePath: string | null = null;
    let fileSize: number | null = null;

    if (fileBase64 && fileName) {
      const buf = Buffer.from(fileBase64, 'base64');
      filePath = path.join(UPLOADS_DIR, `${id}_${fileName}`);
      fs.writeFileSync(filePath, buf);
      fileSize = buf.length;
    }

    const result = await db.query(
      `INSERT INTO controls
         (id, organization_id, risk_id, title, description, type, status, effectiveness, owner,
          framework, due_date, domain, control_ref, frequency, evidence_status, last_review_date,
          next_review_date, file_path, file_name, file_size, file_mime, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       RETURNING *`,
      [id, user.organizationId, riskId || null, title, description, type,
       status || 'Not Implemented', effectiveness, owner, framework, dueDate || null,
       domain || null, controlRef || null, frequency || null,
       evidenceStatus || 'Pending', lastReviewDate || null, nextReviewDate || null,
       filePath, fileName || null, fileSize, fileMime || null, notes || null]
    );

    await auditLog('control_created', 'Control', `Created control: ${title}`, user.organizationId);
    res.status(201).json({ control: toControl(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/controls/:id
controlRouter.put('/:id', requirePermission('controls:update'), async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      riskId, title, description, type, status, effectiveness, owner, framework, dueDate,
      domain, controlRef, frequency, evidenceStatus, lastReviewDate, nextReviewDate, notes,
      fileBase64, fileName, fileMime
    } = req.body;

    // Get existing to manage file
    const existing = await db.query(
      `SELECT file_path, file_name, file_size FROM controls WHERE id=$1 AND organization_id=$2`,
      [req.params.id, user.organizationId]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });

    let filePath = existing.rows[0].file_path;
    let newFileName = existing.rows[0].file_name;
    let fileSize = existing.rows[0].file_size;

    if (fileBase64 && fileName) {
      // Remove old file if present
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const buf = Buffer.from(fileBase64, 'base64');
      filePath = path.join(UPLOADS_DIR, `${req.params.id}_${fileName}`);
      fs.writeFileSync(filePath, buf);
      newFileName = fileName;
      fileSize = buf.length;
    }

    const result = await db.query(
      `UPDATE controls SET
         risk_id=$1, title=$2, description=$3, type=$4, status=$5, effectiveness=$6,
         owner=$7, framework=$8, due_date=$9, domain=$10, control_ref=$11, frequency=$12,
         evidence_status=$13, last_review_date=$14, next_review_date=$15,
         file_path=$16, file_name=$17, file_size=$18, file_mime=$19, notes=$20, updated_at=NOW()
       WHERE id=$21 AND organization_id=$22 RETURNING *`,
      [riskId || null, title, description, type, status, effectiveness,
       owner, framework, dueDate || null, domain || null, controlRef || null,
       frequency || null, evidenceStatus || 'Pending', lastReviewDate || null,
       nextReviewDate || null, filePath, newFileName, fileSize,
       fileMime || null, notes || null, req.params.id, user.organizationId]
    );

    await auditLog('control_updated', 'Control', `Updated control: ${title}`, user.organizationId);
    res.json({ control: toControl(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/controls/:id/download  — download attached file
controlRouter.get('/:id/download', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT file_path, file_name, file_mime FROM controls WHERE id=$1 AND organization_id=$2`,
      [req.params.id, user.organizationId]
    );
    if (!result.rows.length || !result.rows[0].file_path) {
      return res.status(404).json({ error: 'No file attached' });
    }
    const { file_path, file_name, file_mime } = result.rows[0];
    if (!fs.existsSync(file_path)) return res.status(404).json({ error: 'File not found on disk' });

    res.setHeader('Content-Type', file_mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file_name}"`);
    fs.createReadStream(file_path).pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/controls/:id
controlRouter.delete('/:id', requirePermission('controls:delete'), async (req, res) => {
  try {
    const user = (req as any).user;
    const existing = await db.query(
      `SELECT file_path, title FROM controls WHERE id=$1 AND organization_id=$2`,
      [req.params.id, user.organizationId]
    );
    if (existing.rows.length && existing.rows[0].file_path) {
      const fp = existing.rows[0].file_path;
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await db.query(`DELETE FROM controls WHERE id=$1 AND organization_id=$2`, [req.params.id, user.organizationId]);
    await auditLog('control_deleted', 'Control', `Deleted control: ${existing.rows[0]?.title || req.params.id}`, user.organizationId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
