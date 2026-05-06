import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', authMiddleware, async (req, res) => {
  try {
    // Risks by severity
    const risksBySeverity = await db.query(`
      SELECT level, COUNT(*) as count
      FROM risks
      GROUP BY level
    `);

    // Risks by category
    const risksByCategory = await db.query(`
      SELECT category, COUNT(*) as count
      FROM risks
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);

    // Risks by status counts
    const riskStatusCounts = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') as open_risks,
        COUNT(*) FILTER (WHERE status = 'mitigated') as mitigated_risks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_risks,
        COUNT(*) as total_risks
      FROM risks
    `);

    // Overdue risks: open risks where target_date < now
    const overdueResult = await db.query(`
      SELECT COUNT(*) as count
      FROM risks
      WHERE status IN ('open', 'in_progress')
        AND target_date IS NOT NULL
        AND target_date < NOW()
    `);

    // Assessments
    const assessmentCounts = await db.query(`
      SELECT
        COUNT(*) as total_assessments,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_assessments,
        COUNT(*) FILTER (WHERE status = 'draft' OR status = 'in_progress') as pending_assessments
      FROM assessments
    `);

    // Controls
    const controlsResult = await db.query(`
      SELECT COUNT(*) as count FROM controls
    `);

    // Documents
    const documentsResult = await db.query(`
      SELECT COUNT(*) as count FROM documents
    `);

    // Risks without controls
    const risksWithoutControlsResult = await db.query(`
      SELECT COUNT(*) as count
      FROM risks r
      WHERE NOT EXISTS (
        SELECT 1 FROM controls c
        WHERE c.risk_id = r.id
      )
    `);

    // Recent audit activity (last 10 entries)
    const recentAudit = await db.query(`
      SELECT id, action, entity_type, description, performed_by, timestamp
      FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    const severityMap: Record<string, number> = {};
    risksBySeverity.rows.forEach((row: any) => {
      severityMap[row.level] = parseInt(row.count, 10);
    });

    const categoryMap: Array<{ category: string; count: number }> = risksByCategory.rows.map((row: any) => ({
      category: row.category,
      count: parseInt(row.count, 10)
    }));

    const statusRow = riskStatusCounts.rows[0] || {};

    res.json({
      totalRisks: parseInt(statusRow.total_risks || '0', 10),
      openRisks: parseInt(statusRow.open_risks || '0', 10),
      mitigatedRisks: parseInt(statusRow.mitigated_risks || '0', 10),
      inProgressRisks: parseInt(statusRow.in_progress_risks || '0', 10),
      overdueRisks: parseInt(overdueResult.rows[0]?.count || '0', 10),
      risksBySeverity: {
        critical: severityMap['critical'] || 0,
        high: severityMap['high'] || 0,
        medium: severityMap['medium'] || 0,
        low: severityMap['low'] || 0
      },
      risksByCategory: categoryMap,
      totalAssessments: parseInt(assessmentCounts.rows[0]?.total_assessments || '0', 10),
      completedAssessments: parseInt(assessmentCounts.rows[0]?.completed_assessments || '0', 10),
      pendingAssessments: parseInt(assessmentCounts.rows[0]?.pending_assessments || '0', 10),
      totalControls: parseInt(controlsResult.rows[0]?.count || '0', 10),
      totalDocuments: parseInt(documentsResult.rows[0]?.count || '0', 10),
      risksWithoutControls: parseInt(risksWithoutControlsResult.rows[0]?.count || '0', 10),
      recentAuditActivity: recentAudit.rows
    });
  } catch (err) {
    console.error('[Dashboard] summary error:', err);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});
