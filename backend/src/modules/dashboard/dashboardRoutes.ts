import { Router } from 'express';
import { db } from '../../db.js';
import { authMiddleware } from '../../middleware/authMiddleware.js';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;

    // Parse filter params
    const { from, to, status, severity, department, overdue } = req.query as Record<string, string>;

    // Build dynamic WHERE conditions for risks table
    const conditions: string[] = ['organization_id = $1'];
    const params: any[] = [orgId];
    let pi = 2;

    if (from) { conditions.push(`created_at >= $${pi++}`); params.push(from); }
    if (to)   { conditions.push(`created_at <= $${pi++}`); params.push(to); }
    if (status === 'open')       { conditions.push(`LOWER(status) = 'open'`); }
    else if (status === 'resolved')    { conditions.push(`LOWER(status) IN ('mitigated','closed','resolved')`); }
    else if (status === 'unresolved')  { conditions.push(`LOWER(status) IN ('open','in progress','in_progress','mitigating')`); }
    else if (status === 'closed')      { conditions.push(`LOWER(status) = 'closed'`); }
    else if (status === 'overdue')     {
      conditions.push(`LOWER(status) IN ('open','in progress','in_progress','mitigating')`);
      conditions.push(`due_date IS NOT NULL AND due_date < NOW()`);
    }
    if (severity) { conditions.push(`LOWER(level) = $${pi++}`); params.push(severity.toLowerCase()); }
    if (department) { conditions.push(`department = $${pi++}`); params.push(department); }
    if (overdue === 'true') {
      conditions.push(`LOWER(status) IN ('open','in progress','in_progress','mitigating')`);
      conditions.push(`due_date IS NOT NULL AND due_date < NOW()`);
    }

    const WHERE = conditions.join(' AND ');

    // Main risk status counts
    const riskStatusCounts = await db.query(`
      SELECT
        COUNT(*) as total_risks,
        COUNT(*) FILTER (WHERE LOWER(status) = 'open') as open_risks,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('mitigated','closed','resolved')) as resolved_risks,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('open','in progress','in_progress','mitigating')) as unresolved_risks,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('in progress','in_progress','mitigating')) as in_progress_risks,
        COUNT(*) FILTER (WHERE LOWER(level) = 'critical') as critical_risks,
        COUNT(*) FILTER (WHERE LOWER(level) = 'high') as high_risks,
        COUNT(*) FILTER (WHERE LOWER(level) = 'medium') as medium_risks,
        COUNT(*) FILTER (WHERE LOWER(level) = 'low') as low_risks
      FROM risks
      WHERE ${WHERE}
    `, params);

    // Overdue risks
    const overdueResult = await db.query(`
      SELECT COUNT(*) as count
      FROM risks
      WHERE ${WHERE}
        AND LOWER(status) IN ('open','in progress','in_progress','mitigating')
        AND (
          (due_date IS NOT NULL AND due_date < NOW())
          OR (target_date IS NOT NULL AND target_date < NOW())
        )
    `, params);

    // Risks by category
    const risksByCategory = await db.query(`
      SELECT category, COUNT(*) as count
      FROM risks
      WHERE ${WHERE}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // Risks by severity/level
    const risksBySeverity = await db.query(`
      SELECT LOWER(level) as level, COUNT(*) as count
      FROM risks
      WHERE ${WHERE}
      GROUP BY LOWER(level)
    `, params);

    // Department summary
    const departmentSummary = await db.query(`
      SELECT
        COALESCE(department, 'Digər') as department,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('mitigated','closed','resolved')) as resolved,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('open','in progress','in_progress','mitigating')) as unresolved,
        COUNT(*) FILTER (WHERE LOWER(level) = 'critical') as critical,
        COUNT(*) FILTER (
          WHERE LOWER(status) IN ('open','in progress','in_progress','mitigating')
          AND due_date IS NOT NULL AND due_date < NOW()
        ) as overdue
      FROM risks
      WHERE ${WHERE}
      GROUP BY COALESCE(department, 'Digər')
      ORDER BY total DESC
    `, params);

    // Top 5 risks sorted by severity (Critical→High→Medium→Low), then score desc, then due_date asc
    const top5Risks = await db.query(`
      SELECT id, title, level, score, department, owner, status, due_date
      FROM risks
      WHERE ${WHERE}
      ORDER BY
        CASE LOWER(level)
          WHEN 'critical' THEN 1
          WHEN 'high'     THEN 2
          WHEN 'medium'   THEN 3
          WHEN 'low'      THEN 4
          ELSE 5
        END ASC,
        score DESC,
        due_date ASC NULLS LAST
      LIMIT 5
    `, params);

    // Risk Map — likelihood × impact matrix
    const riskMapResult = await db.query(`
      SELECT
        likelihood,
        impact,
        likelihood * impact AS score,
        COUNT(*) AS count
      FROM risks
      WHERE ${WHERE}
        AND likelihood BETWEEN 1 AND 5
        AND impact BETWEEN 1 AND 5
      GROUP BY likelihood, impact
      ORDER BY likelihood, impact
    `, params);

    // Assessments (no filter applied — global)
    const assessmentCounts = await db.query(`
      SELECT
        COUNT(*) as total_assessments,
        COUNT(*) FILTER (WHERE LOWER(status) = 'completed') as completed_assessments,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('draft','in progress','in_progress')) as pending_assessments
      FROM assessments
      WHERE organization_id = $1
    `, [orgId]);

    // Controls counts (no filter applied — global)
    const controlsResult = await db.query(`
      SELECT
        COUNT(*) as total_controls,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('implemented','active')) as implemented_controls,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('partial','partially implemented')) as partial_controls,
        COUNT(*) FILTER (WHERE LOWER(status) IN ('not implemented','planned','pending')) as missing_controls
      FROM controls
      WHERE organization_id = $1
    `, [orgId]);

    // Documents count
    const documentsResult = await db.query(`
      SELECT COUNT(*) as count FROM documents WHERE organization_id = $1
    `, [orgId]);

    // Risks without controls
    const risksWithoutControlsResult = await db.query(`
      SELECT COUNT(*) as count
      FROM risks r
      WHERE r.organization_id = $1
        AND NOT EXISTS (SELECT 1 FROM controls c WHERE c.risk_id = r.id)
    `, [orgId]);

    // Recent audit logs
    const recentAudit = await db.query(`
      SELECT id, action, module, entity_type, details, user_name, user_role, severity, source, timestamp
      FROM audit_logs
      WHERE (organization_id = $1 OR organization_id IS NULL)
      ORDER BY timestamp DESC
      LIMIT 10
    `, [orgId]);

    const severityMap: Record<string, number> = {};
    risksBySeverity.rows.forEach((row: any) => {
      if (row.level) severityMap[row.level] = parseInt(row.count, 10);
    });

    const categoryData = risksByCategory.rows
      .filter((row: any) => row.category)
      .map((row: any) => ({ category: row.category, count: parseInt(row.count, 10) }));

    const statusRow = riskStatusCounts.rows[0] || {};
    const ctrlRow = controlsResult.rows[0] || {};

    const recentAuditLogs = recentAudit.rows.map((r: any) => ({
      id: r.id,
      action: r.action,
      entity_type: r.entity_type || r.module || '',
      description: r.details || '',
      performed_by: r.user_name || '',
      module: r.module || '',
      severity: r.severity || 'Low',
      timestamp: r.timestamp
    }));

    const deptSummary = departmentSummary.rows.map((r: any) => ({
      department: r.department,
      total: parseInt(r.total, 10),
      resolved: parseInt(r.resolved, 10),
      unresolved: parseInt(r.unresolved, 10),
      critical: parseInt(r.critical, 10),
      overdue: parseInt(r.overdue, 10),
    }));

    const top5 = top5Risks.rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      level: r.level,
      score: parseInt(r.score, 10),
      department: r.department || '',
      owner: r.owner || '',
      status: r.status,
      dueDate: r.due_date,
    }));

    const scoreToSeverity = (score: number) => {
      if (score >= 16) return 'critical';
      if (score >= 10) return 'high';
      if (score >= 5)  return 'medium';
      return 'low';
    };

    const riskMap = riskMapResult.rows.map((r: any) => ({
      likelihood: parseInt(r.likelihood, 10),
      impact: parseInt(r.impact, 10),
      score: parseInt(r.score, 10),
      severity: scoreToSeverity(parseInt(r.score, 10)),
      count: parseInt(r.count, 10),
    }));

    res.json({
      totalRisks: parseInt(statusRow.total_risks || '0', 10),
      criticalRisks: parseInt(statusRow.critical_risks || '0', 10),
      highRisks: parseInt(statusRow.high_risks || '0', 10),
      mediumRisks: parseInt(statusRow.medium_risks || '0', 10),
      lowRisks: parseInt(statusRow.low_risks || '0', 10),
      openRisks: parseInt(statusRow.open_risks || '0', 10),
      resolvedRisks: parseInt(statusRow.resolved_risks || '0', 10),
      unresolvedRisks: parseInt(statusRow.unresolved_risks || '0', 10),
      mitigatedRisks: parseInt(statusRow.resolved_risks || '0', 10),
      inProgressRisks: parseInt(statusRow.in_progress_risks || '0', 10),
      overdueRisks: parseInt(overdueResult.rows[0]?.count || '0', 10),
      risksByCategory: categoryData,
      risksByLevel: {
        critical: severityMap['critical'] || 0,
        high: severityMap['high'] || 0,
        medium: severityMap['medium'] || 0,
        low: severityMap['low'] || 0
      },
      risksBySeverity: {
        critical: severityMap['critical'] || 0,
        high: severityMap['high'] || 0,
        medium: severityMap['medium'] || 0,
        low: severityMap['low'] || 0
      },
      departmentSummary: deptSummary,
      top5Risks: top5,
      riskMap,
      totalAssessments: parseInt(assessmentCounts.rows[0]?.total_assessments || '0', 10),
      completedAssessments: parseInt(assessmentCounts.rows[0]?.completed_assessments || '0', 10),
      pendingAssessments: parseInt(assessmentCounts.rows[0]?.pending_assessments || '0', 10),
      totalControls: parseInt(ctrlRow.total_controls || '0', 10),
      implementedControls: parseInt(ctrlRow.implemented_controls || '0', 10),
      partialControls: parseInt(ctrlRow.partial_controls || '0', 10),
      missingControls: parseInt(ctrlRow.missing_controls || '0', 10),
      totalDocuments: parseInt(documentsResult.rows[0]?.count || '0', 10),
      risksWithoutControls: parseInt(risksWithoutControlsResult.rows[0]?.count || '0', 10),
      recentAuditLogs,
      recentAuditActivity: recentAuditLogs
    });
  } catch (err) {
    console.error('[Dashboard] summary error:', err);
    res.status(500).json({ error: 'Failed to load dashboard summary' });
  }
});

// ── ISO week helper ───────────────────────────────────────────────────────────
function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const AZ_MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','İyun','İyul','Avqust','Sentyabr','Oktyabr','Noyabr','Dekabr'];

function periodKey(d: Date, gb: string): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (gb === 'day')     return `${y}-${m}-${day}`;
  if (gb === 'week')    return `${y}-W${String(isoWeek(d)).padStart(2,'0')}`;
  if (gb === 'month')   return `${y}-${m}`;
  if (gb === 'quarter') return `${y}-Q${Math.floor(d.getMonth()/3)+1}`;
  return `${y}`;
}

function periodLabel(d: Date, gb: string): string {
  const y = d.getFullYear();
  if (gb === 'day')     return d.toISOString().split('T')[0];
  if (gb === 'week')    return `Həftə ${isoWeek(d)}, ${y}`;
  if (gb === 'month')   return `${AZ_MONTHS[d.getMonth()]} ${y}`;
  if (gb === 'quarter') return `Q${Math.floor(d.getMonth()/3)+1} ${y}`;
  return `${y}`;
}

// GET /api/dashboard/time-series
dashboardRouter.get('/time-series', authMiddleware, async (req, res) => {
  try {
    const user = (req as any).user;
    const orgId = user.organizationId;

    let { from, to, groupBy = 'month', department, severity, status, owner } = req.query as Record<string, string>;

    // Default date range: last 30 days
    const now = new Date();
    if (!from) { const d = new Date(now); d.setDate(d.getDate() - 30); from = d.toISOString().split('T')[0]; }
    if (!to)   { to = now.toISOString().split('T')[0]; }

    const valid = ['day','week','month','quarter','year'];
    if (!valid.includes(groupBy)) groupBy = 'month';

    const intervalMap: Record<string,string> = {
      day: '1 day', week: '1 week', month: '1 month', quarter: '3 months', year: '1 year'
    };
    const interval = intervalMap[groupBy];

    // Extra filters (user-supplied, whitelist-validated above)
    const extraConds: string[] = [];
    const extraParams: any[] = [orgId, from, to];
    let pi = 4;

    if (department) { extraConds.push(`department = $${pi++}`); extraParams.push(department); }
    if (severity)   { extraConds.push(`LOWER(level) = $${pi++}`); extraParams.push(severity.toLowerCase()); }
    if (status === 'open')       extraConds.push(`LOWER(status) = 'open'`);
    else if (status === 'resolved')   extraConds.push(`LOWER(status) IN ('mitigated','closed','resolved')`);
    else if (status === 'unresolved') extraConds.push(`LOWER(status) IN ('open','in progress','in_progress','mitigating')`);
    if (owner) { extraConds.push(`LOWER(owner) LIKE $${pi++}`); extraParams.push(`%${owner.toLowerCase()}%`); }

    const extraWhere = extraConds.length ? ' AND ' + extraConds.join(' AND ') : '';

    const result = await db.query(`
      WITH periods AS (
        SELECT generate_series(
          DATE_TRUNC('${groupBy}', $2::timestamp),
          DATE_TRUNC('${groupBy}', $3::timestamp),
          '${interval}'::interval
        ) AS ps
      ),
      risk_stats AS (
        SELECT
          DATE_TRUNC('${groupBy}', created_at) AS period,
          COUNT(*)::int AS created,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('mitigated','closed','resolved'))::int AS resolved,
          COUNT(*) FILTER (WHERE LOWER(status) IN ('open','in progress','in_progress','mitigating'))::int AS unresolved,
          COUNT(*) FILTER (WHERE LOWER(level)='critical')::int AS critical,
          COUNT(*) FILTER (WHERE LOWER(level)='high')::int AS high,
          COUNT(*) FILTER (WHERE LOWER(level)='medium')::int AS medium,
          COUNT(*) FILTER (WHERE LOWER(level)='low')::int AS low,
          COUNT(*) FILTER (
            WHERE LOWER(status) IN ('open','in progress','in_progress','mitigating')
              AND due_date IS NOT NULL AND due_date < NOW()
          )::int AS overdue
        FROM risks
        WHERE organization_id = $1
          AND created_at >= $2::timestamp
          AND created_at < ($3::date + interval '1 day')::timestamp
          ${extraWhere}
        GROUP BY DATE_TRUNC('${groupBy}', created_at)
      )
      SELECT
        p.ps AS period_start,
        COALESCE(r.created,0)   AS created,
        COALESCE(r.resolved,0)  AS resolved,
        COALESCE(r.unresolved,0) AS unresolved,
        COALESCE(r.critical,0)  AS critical,
        COALESCE(r.high,0)      AS high,
        COALESCE(r.medium,0)    AS medium,
        COALESCE(r.low,0)       AS low,
        COALESCE(r.overdue,0)   AS overdue
      FROM periods p
      LEFT JOIN risk_stats r ON r.period = p.ps
      ORDER BY p.ps
    `, extraParams);

    const rows = result.rows;
    const series = rows.map((row: any, i: number) => {
      const d = new Date(row.period_start);
      const created = row.created;
      const prev = i > 0 ? rows[i - 1].created : null;
      const changePercent = prev !== null && prev > 0
        ? Math.round(((created - prev) / prev) * 1000) / 10
        : null;
      return {
        period: periodKey(d, groupBy),
        label: periodLabel(d, groupBy),
        createdRisks:    created,
        resolvedRisks:   row.resolved,
        unresolvedRisks: row.unresolved,
        criticalRisks:   row.critical,
        highRisks:       row.high,
        mediumRisks:     row.medium,
        lowRisks:        row.low,
        overdueRisks:    row.overdue,
        changePercent
      };
    });

    res.json({ groupBy, from, to, series });
  } catch (err) {
    console.error('[Dashboard] time-series error:', err);
    res.status(500).json({ error: 'Failed to load time series' });
  }
});
