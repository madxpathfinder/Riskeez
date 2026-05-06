import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = path.join(__dirname, '..', '..', '..', '..', 'logs');
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
const AUDIT_LOG_FILE = path.join(LOGS_DIR, 'audit.log');

function appendToLogFile(entry: object) {
  try {
    fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
  } catch { /* non-fatal */ }
}

export const auditLogRouter = Router();
auditLogRouter.use(authMiddleware);

const toLog = (row: any) => ({
  id: row.id,
  organizationId: row.organization_id,
  userId: row.user_id,
  userName: row.user_name,
  userRole: row.user_role,
  action: row.action,
  module: row.module || row.entity_type,
  entityType: row.entity_type || row.module,
  entityName: row.entity_name,
  details: row.details || row.description,
  severity: row.severity,
  source: row.source,
  entityId: row.entity_id,
  metadata: row.metadata,
  timestamp: row.timestamp || row.created_at,
  ipAddress: row.ip_address,
  userAgent: row.user_agent
});

// GET /api/audit-logs
auditLogRouter.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const { action, module, severity, startDate, endDate, search, limit = '500' } = req.query;

    const conditions: string[] = ['(organization_id = $1 OR organization_id IS NULL)'];
    const params: any[] = [user.organizationId];
    let p = 2;

    if (action && action !== 'All') {
      conditions.push(`action ILIKE $${p++}`);
      params.push(`%${action}%`);
    }
    if (module && module !== 'All') {
      conditions.push(`(module = $${p} OR entity_type = $${p})`);
      params.push(module); p++;
    }
    if (severity && severity !== 'All') {
      conditions.push(`severity = $${p++}`);
      params.push(severity);
    }
    if (startDate) {
      conditions.push(`(timestamp >= $${p} OR created_at >= $${p})`);
      params.push(startDate); p++;
    }
    if (endDate) {
      conditions.push(`(timestamp <= $${p} OR created_at <= $${p})`);
      params.push(endDate); p++;
    }
    if (search) {
      conditions.push(`(action ILIKE $${p} OR user_name ILIKE $${p} OR details ILIKE $${p} OR description ILIKE $${p})`);
      params.push(`%${search}%`); p++;
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const parsedLimit = Math.min(parseInt(limit as string) || 500, 2000);

    const result = await db.query(
      `SELECT * FROM audit_logs ${where} ORDER BY COALESCE(timestamp, created_at) DESC LIMIT $${p}`,
      [...params, parsedLimit]
    );
    res.json({ logs: result.rows.map(toLog) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/audit-logs/export.csv
auditLogRouter.get('/export.csv', async (req, res) => {
  try {
    const user = (req as any).user;
    const { startDate, endDate, module, severity } = req.query;

    const conditions: string[] = ['(organization_id = $1 OR organization_id IS NULL)'];
    const params: any[] = [user.organizationId];
    let p = 2;

    if (module && module !== 'All') { conditions.push(`(module = $${p} OR entity_type = $${p})`); params.push(module); p++; }
    if (severity && severity !== 'All') { conditions.push(`severity = $${p++}`); params.push(severity); }
    if (startDate) { conditions.push(`COALESCE(timestamp, created_at) >= $${p++}`); params.push(startDate); }
    if (endDate) { conditions.push(`COALESCE(timestamp, created_at) <= $${p++}`); params.push(endDate); }

    const where = 'WHERE ' + conditions.join(' AND ');
    const result = await db.query(
      `SELECT * FROM audit_logs ${where} ORDER BY COALESCE(timestamp, created_at) DESC LIMIT 5000`,
      params
    );

    const headers = ['Timestamp', 'Actor', 'Role', 'Action', 'Module', 'Details', 'Severity', 'Source', 'Entity ID'];
    const rows = result.rows.map((r: any) => [
      r.timestamp || r.created_at || '',
      r.user_name || '',
      r.user_role || '',
      r.action || '',
      r.module || r.entity_type || '',
      (r.details || r.description || '').replace(/"/g, '""'),
      r.severity || '',
      r.source || '',
      r.entity_id || ''
    ].map(v => `"${v}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_log_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/audit-logs
auditLogRouter.post('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const { action, module, details, severity, source, entityId, entityType, entityName, metadata } = req.body;
    const id = uuidv4();
    const ip = req.ip || req.socket?.remoteAddress || null;
    const ua = req.headers['user-agent'] || null;
    const orgId = user?.organizationId || null;

    const result = await db.query(
      `INSERT INTO audit_logs
         (id, organization_id, user_id, user_name, user_role, action, module, entity_type, entity_name,
          details, severity, source, entity_id, metadata, ip_address, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [id, orgId, user?.id || 'system', user?.name || 'System', user?.role,
       action, module || entityType, entityType || module, entityName || null,
       details, severity || 'Low', source || 'UI',
       entityId || null, metadata ? JSON.stringify(metadata) : null,
       ip, ua]
    );

    const entry = result.rows[0];
    appendToLogFile({
      id: entry.id, timestamp: entry.timestamp, organization_id: entry.organization_id,
      user_name: entry.user_name, user_role: entry.user_role, action: entry.action,
      module: entry.module, details: entry.details, severity: entry.severity, source: entry.source
    });

    res.status(201).json({ log: toLog(entry) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
