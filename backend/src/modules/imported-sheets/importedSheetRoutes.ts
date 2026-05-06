import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

export const importedSheetRouter = Router();
importedSheetRouter.use(authMiddleware);

const genId = () => `is-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ── GET /api/imported-sheets  — list all sheets for org ─────────────────────
importedSheetRouter.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const result = await db.query(
      `SELECT id, sheet_name, columns, row_count, imported_at, updated_at
       FROM imported_sheets WHERE organization_id = $1 ORDER BY sheet_name`,
      [user.organizationId]
    );
    res.json({ sheets: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/imported-sheets/:sheetName/rows ─────────────────────────────────
importedSheetRouter.get('/:sheetName/rows', async (req, res) => {
  try {
    const user = (req as any).user;
    const sheet = await db.query(
      `SELECT id FROM imported_sheets WHERE organization_id=$1 AND sheet_name=$2`,
      [user.organizationId, req.params.sheetName]
    );
    if (!sheet.rows.length) return res.json({ rows: [], columns: [] });
    const rows = await db.query(
      `SELECT id, row_data, row_index FROM imported_sheet_rows
       WHERE sheet_id=$1 ORDER BY row_index`,
      [sheet.rows[0].id]
    );
    const colRes = await db.query(
      `SELECT columns FROM imported_sheets WHERE id=$1`,
      [sheet.rows[0].id]
    );
    res.json({ rows: rows.rows, columns: colRes.rows[0]?.columns || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/imported-sheets/:sheetName/rows  — bulk upsert ─────────────────
importedSheetRouter.post('/:sheetName/rows', async (req, res) => {
  try {
    const user = (req as any).user;
    const { rows, columns } = req.body as { rows: any[]; columns: string[] };
    const sheetName = req.params.sheetName;

    // Upsert sheet record
    await db.query(
      `INSERT INTO imported_sheets (id, organization_id, sheet_name, columns, row_count, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (organization_id, sheet_name)
       DO UPDATE SET columns=$4, row_count=$5, updated_at=NOW()`,
      [genId(), user.organizationId, sheetName, JSON.stringify(columns || []), rows.length]
    );

    const sheetRes = await db.query(
      `SELECT id FROM imported_sheets WHERE organization_id=$1 AND sheet_name=$2`,
      [user.organizationId, sheetName]
    );
    const sheetId = sheetRes.rows[0].id;

    // Delete old rows, insert new
    await db.query(`DELETE FROM imported_sheet_rows WHERE sheet_id=$1`, [sheetId]);
    for (let i = 0; i < rows.length; i++) {
      await db.query(
        `INSERT INTO imported_sheet_rows (id, sheet_id, organization_id, row_data, row_index)
         VALUES ($1,$2,$3,$4,$5)`,
        [genId(), sheetId, user.organizationId, JSON.stringify(rows[i]), i]
      );
    }

    res.json({ success: true, count: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/imported-sheets/:sheetName/rows/:rowId ──────────────────────────
importedSheetRouter.put('/:sheetName/rows/:rowId', async (req, res) => {
  try {
    const user = (req as any).user;
    const { rowData } = req.body;
    const result = await db.query(
      `UPDATE imported_sheet_rows SET row_data=$1, updated_at=NOW()
       WHERE id=$2 AND organization_id=$3 RETURNING *`,
      [JSON.stringify(rowData), req.params.rowId, user.organizationId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Row not found' });
    // Update row_count on sheet
    await db.query(
      `UPDATE imported_sheets SET updated_at=NOW()
       WHERE sheet_name=$1 AND organization_id=$2`,
      [req.params.sheetName, user.organizationId]
    );
    res.json({ success: true, row: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/imported-sheets/:sheetName/rows/:rowId ───────────────────────
importedSheetRouter.delete('/:sheetName/rows/:rowId', async (req, res) => {
  try {
    const user = (req as any).user;
    await db.query(
      `DELETE FROM imported_sheet_rows WHERE id=$1 AND organization_id=$2`,
      [req.params.rowId, user.organizationId]
    );
    // Recalculate row_count
    const sheetRes = await db.query(
      `SELECT id FROM imported_sheets WHERE sheet_name=$1 AND organization_id=$2`,
      [req.params.sheetName, user.organizationId]
    );
    if (sheetRes.rows.length) {
      const cnt = await db.query(
        `SELECT COUNT(*) FROM imported_sheet_rows WHERE sheet_id=$1`,
        [sheetRes.rows[0].id]
      );
      await db.query(
        `UPDATE imported_sheets SET row_count=$1, updated_at=NOW() WHERE id=$2`,
        [parseInt(cnt.rows[0].count, 10), sheetRes.rows[0].id]
      );
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/imported-sheets/:sheetName/export ───────────────────────────────
importedSheetRouter.get('/:sheetName/export', async (req, res) => {
  try {
    const user = (req as any).user;
    const sheetRes = await db.query(
      `SELECT id, columns FROM imported_sheets WHERE sheet_name=$1 AND organization_id=$2`,
      [req.params.sheetName, user.organizationId]
    );
    if (!sheetRes.rows.length) return res.status(404).json({ error: 'Sheet not found' });
    const rowsRes = await db.query(
      `SELECT row_data FROM imported_sheet_rows WHERE sheet_id=$1 ORDER BY row_index`,
      [sheetRes.rows[0].id]
    );
    const columns: string[] = sheetRes.rows[0].columns || [];
    const rows = rowsRes.rows.map((r: any) => r.row_data);

    // Build CSV
    const lines = [columns.join(',')];
    for (const row of rows) {
      lines.push(columns.map(c => {
        const v = String(row[c] ?? '');
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(','));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.sheetName}.csv"`);
    res.send(lines.join('\n'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
