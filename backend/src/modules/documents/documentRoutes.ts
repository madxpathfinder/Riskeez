import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware, requirePermission } from '../../middleware/authMiddleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'uploads', 'documents');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const documentRouter = Router();
documentRouter.use(authMiddleware);

async function auditLog(action: string, entity: string, desc: string, orgId: string) {
  try {
    await db.query(
      `INSERT INTO audit_logs (id, organization_id, action, module, entity_type, details, severity, source)
       VALUES ($1,$2,$3,$4,$5,$6,'Low','API')`,
      [`al-${Date.now()}`, orgId, action, entity, entity, desc]
    );
  } catch {}
}

const toDoc = (row: any) => ({
  id: row.id,
  organizationId: row.organization_id,
  name: row.name,
  type: row.type,
  description: row.description,
  author: row.author,
  version: row.version || '1.0',
  status: row.doc_status || 'Draft',
  confidentiality: row.confidentiality || 'Internal',
  content: row.content,
  summary: row.summary,
  tags: row.tags || [],
  detectedRisks: row.detected_risks || [],
  missingEvidence: row.missing_evidence || [],
  suggestedControls: row.suggested_controls || [],
  linkedRiskIds: row.linked_risk_ids || [],
  linkedControlIds: row.linked_control_ids || [],
  linkedAssessmentIds: row.linked_assessment_ids || [],
  fileName: row.file_name,
  fileSize: row.file_size,
  mimeType: row.mime_type,
  reviewDate: row.review_date,
  expiryDate: row.expiry_date,
  uploadedAt: row.uploaded_at,
  updatedAt: row.updated_at,
  aiStatus: row.ai_status
});

// GET /api/documents
documentRouter.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT * FROM documents WHERE organization_id = $1 ORDER BY uploaded_at DESC`,
      [user.organizationId]
    );
    res.json({ documents: result.rows.map(toDoc) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents
documentRouter.post('/', requirePermission('documents:create'), async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      name, type, description, author, version, status, confidentiality,
      content, summary, tags, detectedRisks, missingEvidence, suggestedControls,
      linkedRiskIds, linkedControlIds, linkedAssessmentIds,
      reviewDate, expiryDate,
      fileBase64, fileName, fileMime
    } = req.body;

    const id = `doc-${Date.now()}`;
    let filePath: string | null = null;
    let fileSize: number | null = null;
    let extractedContent = content || '';

    if (fileBase64 && fileName) {
      const buf = Buffer.from(fileBase64, 'base64');
      filePath = path.join(UPLOADS_DIR, `${id}_${fileName}`);
      fs.writeFileSync(filePath, buf);
      fileSize = buf.length;

      // Text extraction for plain text files
      if (fileMime === 'text/plain' || fileName.endsWith('.txt')) {
        extractedContent = buf.toString('utf-8').slice(0, 50000);
      }
      // For .docx: mammoth text extraction (requires: npm install mammoth in backend/)
      if (fileMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileName.endsWith('.docx')) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mammoth = require('mammoth');
          const docxResult = await mammoth.extractRawText({ path: filePath });
          extractedContent = docxResult.value.slice(0, 50000);
        } catch (e) {
          console.warn('mammoth not available, skipping .docx extraction. Run: npm install mammoth');
        }
      }
    }

    const result = await db.query(
      `INSERT INTO documents
         (id, organization_id, name, type, description, author, version, doc_status, confidentiality,
          content, summary, tags, detected_risks, missing_evidence, suggested_controls,
          linked_risk_ids, linked_control_ids, linked_assessment_ids,
          file_path, file_name, file_size, mime_type, review_date, expiry_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       RETURNING *`,
      [id, user.organizationId, name, type, description || null, author || null,
       version || '1.0', status || 'Draft', confidentiality || 'Internal',
       extractedContent, summary || null, JSON.stringify(tags || []),
       JSON.stringify(detectedRisks || []), JSON.stringify(missingEvidence || []),
       JSON.stringify(suggestedControls || []),
       JSON.stringify(linkedRiskIds || []), JSON.stringify(linkedControlIds || []),
       JSON.stringify(linkedAssessmentIds || []),
       filePath, fileName || null, fileSize, fileMime || null,
       reviewDate || null, expiryDate || null]
    );

    await auditLog('document_uploaded', 'Document', `Uploaded document: ${name}`, user.organizationId);
    res.status(201).json({ document: toDoc(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/documents/:id
documentRouter.put('/:id', requirePermission('documents:update'), async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      name, type, description, author, version, status, confidentiality,
      content, summary, tags, detectedRisks, missingEvidence, suggestedControls,
      linkedRiskIds, linkedControlIds, linkedAssessmentIds,
      reviewDate, expiryDate,
      fileBase64, fileName, fileMime,
      aiStatus, relatedRisks, aiFindings, aiAssumptions
    } = req.body;

    const existing = await db.query(
      `SELECT file_path, file_name, file_size FROM documents WHERE id=$1 AND organization_id=$2`,
      [req.params.id, user.organizationId]
    );
    if (!existing.rows.length) return res.status(404).json({ error: 'Not found' });

    let filePath = existing.rows[0].file_path;
    let newFileName = existing.rows[0].file_name;
    let fileSize = existing.rows[0].file_size;
    let extractedContent = content;

    if (fileBase64 && fileName) {
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const buf = Buffer.from(fileBase64, 'base64');
      filePath = path.join(UPLOADS_DIR, `${req.params.id}_${fileName}`);
      fs.writeFileSync(filePath, buf);
      newFileName = fileName;
      fileSize = buf.length;
      if (fileMime === 'text/plain' || fileName.endsWith('.txt')) {
        extractedContent = buf.toString('utf-8').slice(0, 50000);
      }
    }

    // Merge AI fields into detected_risks / suggested_controls if provided
    const finalDetectedRisks = relatedRisks || detectedRisks || [];
    const finalSuggestedControls = aiFindings ? [...(suggestedControls || []), ...aiFindings] : (suggestedControls || []);

    const result = await db.query(
      `UPDATE documents SET
         name=$1, type=$2, description=$3, author=$4, version=$5, doc_status=$6, confidentiality=$7,
         content=$8, summary=$9, tags=$10, detected_risks=$11, missing_evidence=$12, suggested_controls=$13,
         linked_risk_ids=$14, linked_control_ids=$15, linked_assessment_ids=$16,
         file_path=$17, file_name=$18, file_size=$19, mime_type=$20,
         review_date=$21, expiry_date=$22, updated_at=NOW()
       WHERE id=$23 AND organization_id=$24 RETURNING *`,
      [name, type, description || null, author || null, version || '1.0',
       status || 'Draft', confidentiality || 'Internal',
       extractedContent, summary || null, JSON.stringify(tags || []),
       JSON.stringify(finalDetectedRisks), JSON.stringify(missingEvidence || []),
       JSON.stringify(finalSuggestedControls),
       JSON.stringify(linkedRiskIds || []), JSON.stringify(linkedControlIds || []),
       JSON.stringify(linkedAssessmentIds || []),
       filePath, newFileName, fileSize, fileMime || null,
       reviewDate || null, expiryDate || null,
       req.params.id, user.organizationId]
    );

    res.json({ document: toDoc(result.rows[0]) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/download
documentRouter.get('/:id/download', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT file_path, file_name, mime_type, name FROM documents WHERE id=$1 AND organization_id=$2`,
      [req.params.id, user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Document not found' });
    const { file_path, file_name, mime_type, name } = result.rows[0];
    if (!file_path || !fs.existsSync(file_path)) {
      return res.status(404).json({ error: 'No file attached to this document' });
    }
    await auditLog('document_downloaded', 'Document', `Downloaded: ${name}`, user.organizationId);
    res.setHeader('Content-Type', mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file_name || name}"`);
    fs.createReadStream(file_path).pipe(res);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/view
documentRouter.get('/:id/view', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT id, name, type, file_name, mime_type, content, file_path, file_size, uploaded_at FROM documents WHERE id=$1 AND organization_id=$2`,
      [req.params.id, user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Document not found' });
    const row = result.rows[0];

    const isText = row.mime_type === 'text/plain' || (row.file_name || '').endsWith('.txt');
    const isDocx = row.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || (row.file_name || '').endsWith('.docx');

    if (row.content) {
      return res.json({ viewable: true, content: row.content, fileName: row.file_name, mimeType: row.mime_type });
    }

    if (row.file_path && fs.existsSync(row.file_path)) {
      if (isText) {
        const text = fs.readFileSync(row.file_path, 'utf-8').slice(0, 50000);
        return res.json({ viewable: true, content: text, fileName: row.file_name, mimeType: row.mime_type });
      }
      if (isDocx) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const mammoth = require('mammoth');
          const docxResult = await mammoth.extractRawText({ path: row.file_path });
          return res.json({ viewable: true, content: docxResult.value.slice(0, 50000), fileName: row.file_name, mimeType: row.mime_type });
        } catch {
          // fall through to not-viewable
        }
      }
    }

    res.json({ viewable: false, fileName: row.file_name, mimeType: row.mime_type, fileSize: row.file_size });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id
documentRouter.delete('/:id', requirePermission('documents:delete'), async (req, res) => {
  try {
    const user = (req as any).user;
    const existing = await db.query(
      `SELECT file_path, name FROM documents WHERE id=$1 AND organization_id=$2`,
      [req.params.id, user.organizationId]
    );
    if (existing.rows.length && existing.rows[0].file_path) {
      const fp = existing.rows[0].file_path;
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await db.query(`DELETE FROM documents WHERE id=$1 AND organization_id=$2`, [req.params.id, user.organizationId]);
    await auditLog('document_deleted', 'Document', `Deleted: ${existing.rows[0]?.name || req.params.id}`, user.organizationId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
