import { DashboardSummary } from '../services/dashboardService';

type TabKey = 'risk' | 'compliance' | 'executive';

const TAB_TITLES: Record<TabKey, string> = {
  risk: 'Risk Monitorinqi',
  compliance: 'Uyğunluq & Nəzarət Monitorinqi',
  executive: 'İcraiyyə İcmalı',
};

const fmtNow = () =>
  new Date().toLocaleDateString('az-AZ', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1E293B; font-size: 13px; }
  .page { max-width: 960px; margin: 0 auto; }

  /* ── Header ── */
  .report-header { background: #0F172A; color: #fff; padding: 28px 36px 22px; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .org-label { font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #64748B; margin-bottom: 6px; }
  .report-title { font-size: 24px; font-weight: 900; letter-spacing: -.02em; color: #F1F5F9; }
  .report-subtitle { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
  .meta { text-align: right; }
  .meta-date { font-size: 13px; font-weight: 800; color: #CBD5E1; }
  .meta-label { font-size: 10px; color: #475569; font-weight: 600; margin-top: 2px; }
  .accent-bar { height: 3px; margin-top: 20px; background: linear-gradient(90deg,#6366F1 0%,#8B5CF6 50%,#06B6D4 100%); }

  /* ── Content ── */
  .content { padding: 28px 36px; }
  .section { margin-bottom: 28px; }
  .section-title { font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: .12em; color: #64748B; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #E2E8F0; }

  /* ── KPI cards ── */
  .kpi-row { display: grid; gap: 12px; margin-bottom: 24px; }
  .kpi-row-4 { grid-template-columns: repeat(4, 1fr); }
  .kpi-row-5 { grid-template-columns: repeat(5, 1fr); }
  .kpi-card { border-radius: 12px; padding: 16px; border: 1px solid #E2E8F0; }
  .kpi-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: #94A3B8; margin-bottom: 6px; }
  .kpi-value { font-size: 28px; font-weight: 900; line-height: 1; }
  .kpi-sub { font-size: 9px; font-weight: 700; color: #94A3B8; margin-top: 4px; }

  .bg-rose { background:#FFF1F2; border-color:#FECDD3; }   .c-rose { color:#DC2626; }
  .bg-orange { background:#FFF7ED; border-color:#FED7AA; } .c-orange { color:#EA580C; }
  .bg-sky { background:#F0F9FF; border-color:#BAE6FD; }    .c-sky { color:#0284C7; }
  .bg-emerald { background:#ECFDF5; border-color:#A7F3D0; } .c-emerald { color:#059669; }
  .bg-amber { background:#FFFBEB; border-color:#FDE68A; }  .c-amber { color:#D97706; }
  .bg-violet { background:#F5F3FF; border-color:#DDD6FE; } .c-violet { color:#7C3AED; }
  .bg-blue { background:#EFF6FF; border-color:#BFDBFE; }   .c-blue { color:#2563EB; }
  .bg-slate { background:#F8FAFC; border-color:#E2E8F0; }  .c-slate { color:#334155; }

  /* ── CSS bar chart ── */
  .bar-chart { display: flex; flex-direction: column; gap: 10px; }
  .bar-row { display: flex; align-items: center; gap: 8px; }
  .bar-name { font-size: 10px; font-weight: 700; color: #475569; width: 120px; flex-shrink: 0; text-align: right; }
  .bar-track { flex: 1; background: #F1F5F9; border-radius: 4px; height: 14px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width .3s; }
  .bar-num { font-size: 10px; font-weight: 800; color: #334155; width: 28px; text-align: right; flex-shrink: 0; }

  /* ── Two-column chart grid ── */
  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }

  /* ── Table ── */
  table { width: 100%; border-collapse: collapse; }
  th { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: #94A3B8; padding: 10px 12px; text-align: left; background: #F8FAFC; border-bottom: 2px solid #E2E8F0; }
  td { font-size: 11px; font-weight: 600; padding: 9px 12px; border-bottom: 1px solid #F1F5F9; color: #334155; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: #F8FAFC; }

  /* ── Badges ── */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; border: 1px solid; }
  .badge-critical { background:#FFF1F2; border-color:#FECDD3; color:#BE123C; }
  .badge-high     { background:#FFF7ED; border-color:#FED7AA; color:#C2410C; }
  .badge-medium   { background:#FFFBEB; border-color:#FDE68A; color:#B45309; }
  .badge-low      { background:#ECFDF5; border-color:#A7F3D0; color:#047857; }
  .badge-good     { background:#ECFDF5; border-color:#A7F3D0; color:#047857; }
  .badge-warn     { background:#FFFBEB; border-color:#FDE68A; color:#B45309; }
  .badge-bad      { background:#FFF1F2; border-color:#FECDD3; color:#BE123C; }

  /* ── Score card ── */
  .score-block { display: flex; align-items: center; gap: 24px; padding: 20px; border-radius: 14px; border: 1px solid; margin-bottom: 24px; }
  .score-number { font-size: 72px; font-weight: 900; line-height: 1; }
  .score-info .score-label { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; color: #94A3B8; }
  .score-info .score-level { font-size: 18px; font-weight: 900; margin-top: 4px; }
  .score-info .score-desc { font-size: 11px; font-weight: 600; color: #64748B; margin-top: 4px; }

  /* ── Posture row ── */
  .posture-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .posture-card { border-radius: 10px; padding: 14px; border: 1px solid; }
  .posture-ttl { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; opacity: .6; margin-bottom: 6px; }
  .posture-val { font-size: 22px; font-weight: 900; }
  .posture-sub { font-size: 9px; font-weight: 700; margin-top: 4px; opacity: .7; }

  /* ── Audit list ── */
  .audit-item { display: flex; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F1F5F9; }
  .audit-dot { width: 8px; height: 8px; border-radius: 50%; background: #6366F1; margin-top: 4px; flex-shrink: 0; }
  .audit-action { font-size: 11px; font-weight: 700; color: #1E293B; }
  .audit-desc { font-size: 10px; color: #64748B; font-weight: 500; margin-top: 2px; }
  .audit-meta { font-size: 9px; color: #94A3B8; margin-top: 2px; font-weight: 600; }

  /* ── Footer ── */
  .footer { margin: 0 36px 28px; padding-top: 14px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; font-weight: 600; }
  .confidential { display: inline-block; margin: 0 36px 18px; padding: 4px 12px; background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 20px; font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #92400E; }

  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: A4 portrait; margin: 0; }
  }
`;

// ── SVG-free bar chart ──────────────────────────────────────────────────────
function barChart(data: { name: string; value: number; color: string }[]): string {
  const max = Math.max(...data.map(d => d.value), 1);
  return `<div class="bar-chart">${data.map(d => `
    <div class="bar-row">
      <div class="bar-name">${d.name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.round((d.value / max) * 100)}%;background:${d.color}"></div>
      </div>
      <div class="bar-num">${d.value}</div>
    </div>`).join('')}
  </div>`;
}

// ── Badge helper ─────────────────────────────────────────────────────────────
function badge(text: string, cls: string) {
  return `<span class="badge badge-${cls}">${text}</span>`;
}

function levelBadge(level: string) {
  const l = (level || '').toLowerCase();
  if (l === 'critical') return badge(level, 'critical');
  if (l === 'high') return badge(level, 'high');
  if (l === 'medium') return badge(level, 'medium');
  return badge(level || 'Low', 'low');
}

function statusBadge(rate: number) {
  if (rate >= 80) return badge('Yaxşı', 'good');
  if (rate >= 50) return badge('Orta', 'warn');
  return badge('Zəif', 'bad');
}

// ── Tab content builders ──────────────────────────────────────────────────────

function buildRiskContent(s: DashboardSummary): string {
  const total = s.totalRisks || 1;
  const pct = (n: number) => Math.round((n / total) * 100);

  const severityBars = [
    { name: 'Kritik', value: s.criticalRisks ?? 0, color: '#DC2626' },
    { name: 'Yüksək', value: s.highRisks ?? 0, color: '#EA580C' },
    { name: 'Orta', value: s.mediumRisks ?? 0, color: '#D97706' },
    { name: 'Aşağı', value: s.lowRisks ?? 0, color: '#059669' },
  ];

  const catBars = (s.risksByCategory ?? []).slice(0, 8).map((c, i) => ({
    name: c.category || '—',
    value: c.count,
    color: ['#6366F1','#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444','#EC4899','#14B8A6'][i % 8],
  }));

  const deptRows = (s.departmentSummary ?? []).slice(0, 10).map(d => `
    <tr>
      <td>${d.department || '—'}</td>
      <td style="font-weight:900;text-align:center">${d.count}</td>
      <td style="color:#DC2626;font-weight:800;text-align:center">${(d as any).critical ?? 0}</td>
      <td style="color:#EA580C;font-weight:800;text-align:center">${(d as any).high ?? 0}</td>
      <td style="color:#D97706;font-weight:800;text-align:center">${(d as any).medium ?? 0}</td>
      <td style="color:#059669;font-weight:800;text-align:center">${(d as any).low ?? 0}</td>
    </tr>`).join('');

  return `
    <div class="kpi-row kpi-row-4">
      <div class="kpi-card bg-rose"><div class="kpi-label">Kritik risklər</div><div class="kpi-value c-rose">${s.criticalRisks ?? 0}</div><div class="kpi-sub">${pct(s.criticalRisks ?? 0)}% ümumi riskdən</div></div>
      <div class="kpi-card bg-orange"><div class="kpi-label">Yüksək risklər</div><div class="kpi-value c-orange">${s.highRisks ?? 0}</div></div>
      <div class="kpi-card bg-sky"><div class="kpi-label">Açıq risklər</div><div class="kpi-value c-sky">${s.openRisks ?? 0}</div><div class="kpi-sub">Ümumi: ${s.totalRisks ?? 0}</div></div>
      <div class="kpi-card bg-rose"><div class="kpi-label">Gecikmiş</div><div class="kpi-value c-rose">${s.overdueRisks ?? 0}</div><div class="kpi-sub">${s.overdueRisks ? 'Tədbir tələb olunur' : 'Gecikmiş yoxdur'}</div></div>
    </div>

    <div class="chart-grid">
      <div>
        <div class="section-title">Şiddət üzrə bölgü</div>
        ${barChart(severityBars)}
      </div>
      <div>
        <div class="section-title">Kateqoriya üzrə bölgü</div>
        ${catBars.length ? barChart(catBars) : '<p style="color:#94A3B8;font-size:11px">Məlumat yoxdur</p>'}
      </div>
    </div>

    ${deptRows ? `
    <div class="section">
      <div class="section-title">Departament üzrə risklər</div>
      <table>
        <thead><tr><th>Departament</th><th style="text-align:center">Ümumi</th><th style="text-align:center">Kritik</th><th style="text-align:center">Yüksək</th><th style="text-align:center">Orta</th><th style="text-align:center">Aşağı</th></tr></thead>
        <tbody>${deptRows}</tbody>
      </table>
    </div>` : ''}
  `;
}

function buildComplianceContent(s: DashboardSummary): string {
  const totalControls = s.totalControls ?? 0;
  const implemented = s.implementedControls ?? 0;
  const partial = s.partialControls ?? 0;
  const missing = s.missingControls ?? 0;
  const completedAss = s.completedAssessments ?? 0;
  const totalAss = s.totalAssessments ?? 0;
  const pending = s.pendingAssessments ?? 0;
  const noControl = s.risksWithoutControls ?? 0;

  const ctrlRate = totalControls > 0 ? Math.round((implemented / totalControls) * 100) : 0;
  const assRate = totalAss > 0 ? Math.round((completedAss / totalAss) * 100) : 0;

  const ctrlBars = [
    { name: 'Tətbiq edilmiş', value: implemented, color: '#10B981' },
    { name: 'Qismən', value: partial, color: '#F59E0B' },
    { name: 'Tətbiq edilməmiş', value: missing, color: '#EF4444' },
  ];

  const assBars = [
    { name: 'Tamamlanmış', value: completedAss, color: '#10B981' },
    { name: 'Gözləyən', value: pending, color: '#F59E0B' },
  ];

  return `
    <div class="kpi-row kpi-row-4">
      <div class="kpi-card bg-slate"><div class="kpi-label">Ümumi nəzarət</div><div class="kpi-value c-slate">${totalControls}</div></div>
      <div class="kpi-card bg-emerald"><div class="kpi-label">Tətbiq edilmiş</div><div class="kpi-value c-emerald">${implemented}</div><div class="kpi-sub">${ctrlRate}%</div></div>
      <div class="kpi-card bg-blue"><div class="kpi-label">Tamamlanmış qiymətləndir.</div><div class="kpi-value c-blue">${completedAss}</div><div class="kpi-sub">${assRate}% tamamlanmış</div></div>
      <div class="kpi-card ${noControl > 0 ? 'bg-rose' : 'bg-emerald'}"><div class="kpi-label">Nəzarətsiz risklər</div><div class="kpi-value ${noControl > 0 ? 'c-rose' : 'c-emerald'}">${noControl}</div></div>
    </div>

    <div class="chart-grid">
      <div>
        <div class="section-title">Nəzarət statusu</div>
        ${barChart(ctrlBars)}
      </div>
      <div>
        <div class="section-title">Qiymətləndirmə tamamlanması</div>
        ${barChart(assBars)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Uyğunluq göstəriciləri</div>
      <table>
        <thead><tr><th>Göstərici</th><th style="text-align:center">Dəyər</th><th style="text-align:center">Faiz</th><th>Vəziyyət</th></tr></thead>
        <tbody>
          <tr>
            <td>Tətbiq edilmiş nəzarətlər</td>
            <td style="text-align:center;font-weight:800">${implemented}/${totalControls}</td>
            <td style="text-align:center;font-weight:800;color:#059669">${ctrlRate}%</td>
            <td>${statusBadge(ctrlRate)}</td>
          </tr>
          <tr>
            <td>Qismən tətbiq edilmiş nəzarətlər</td>
            <td style="text-align:center;font-weight:800">${partial}/${totalControls}</td>
            <td style="text-align:center;font-weight:800;color:#D97706">${totalControls > 0 ? Math.round((partial / totalControls) * 100) : 0}%</td>
            <td>${badge('Tamamlanmalıdır', 'warn')}</td>
          </tr>
          <tr>
            <td>Tamamlanmış qiymətləndirmələr</td>
            <td style="text-align:center;font-weight:800">${completedAss}/${totalAss}</td>
            <td style="text-align:center;font-weight:800;color:#2563EB">${assRate}%</td>
            <td>${statusBadge(assRate)}</td>
          </tr>
          <tr>
            <td>Nəzarətsiz risklər</td>
            <td style="text-align:center;font-weight:800;color:${noControl > 0 ? '#DC2626' : '#059669'}">${noControl}</td>
            <td style="text-align:center;color:#94A3B8">—</td>
            <td>${noControl === 0 ? badge('Tam', 'good') : badge('Açıq', 'bad')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function buildExecutiveContent(s: DashboardSummary): string {
  const critical = s.criticalRisks ?? 0;
  const high = s.highRisks ?? 0;
  const medium = s.mediumRisks ?? 0;
  const low = s.lowRisks ?? 0;
  const total = s.totalRisks || 1;
  const overdue = s.overdueRisks ?? 0;
  const completedAss = s.completedAssessments ?? 0;
  const totalAss = s.totalAssessments ?? 0;
  const implemented = s.implementedControls ?? 0;
  const totalControls = s.totalControls ?? 0;
  const top5 = s.top5Risks ?? [];
  const audit = s.recentAuditActivity ?? [];

  const overallScore = Math.round(
    (critical * 4 + high * 3 + medium * 2 + low) / Math.max(total, 1) * 10
  );
  const complianceRate = totalAss > 0 ? Math.round((completedAss / totalAss) * 100) : 0;
  const controlsRate = totalControls > 0 ? Math.round((implemented / totalControls) * 100) : 0;

  const scoreColor = overallScore < 15 ? '#059669' : overallScore < 25 ? '#D97706' : '#DC2626';
  const scoreBg = overallScore < 15 ? 'bg-emerald' : overallScore < 25 ? 'bg-amber' : 'bg-rose';
  const scoreLabel = overallScore < 15 ? 'Aşağı' : overallScore < 25 ? 'Orta' : 'Yüksək';

  const postureOf = (rate: number) =>
    rate >= 80 ? { label: 'Yaxşı', cls: 'bg-emerald', color: '#059669' }
    : rate >= 50 ? { label: 'Orta', cls: 'bg-amber', color: '#D97706' }
    : { label: 'Zəif', cls: 'bg-rose', color: '#DC2626' };

  const riskPosture = postureOf(Math.max(0, 100 - overallScore * 3));
  const compPosture = postureOf(complianceRate);
  const ctrlPosture = postureOf(controlsRate);

  const top5Rows = top5.map(r => `
    <tr>
      <td style="font-weight:700">${r.title}</td>
      <td>${r.department || '—'}</td>
      <td>${r.owner || '—'}</td>
      <td style="text-align:center;font-weight:900">${r.score}</td>
      <td>${r.status}</td>
      <td style="color:#94A3B8">${r.dueDate ? new Date(r.dueDate).toLocaleDateString('az-AZ') : '—'}</td>
      <td>${levelBadge(r.level)}</td>
    </tr>`).join('');

  const auditItems = audit.slice(0, 5).map(e => `
    <div class="audit-item">
      <div class="audit-dot"></div>
      <div>
        <div class="audit-action">${e.action}${e.entity_type ? ` <span style="color:#94A3B8;font-weight:500">— ${e.entity_type}</span>` : ''}</div>
        ${e.description ? `<div class="audit-desc">${e.description}</div>` : ''}
        <div class="audit-meta">${e.performed_by ? `${e.performed_by} · ` : ''}${new Date(e.timestamp).toLocaleString('az-AZ')}</div>
      </div>
    </div>`).join('');

  return `
    <div class="score-block ${scoreBg}">
      <div class="score-number" style="color:${scoreColor}">${overallScore}</div>
      <div class="score-info">
        <div class="score-label">Ümumi risk skoru</div>
        <div class="score-level" style="color:${scoreColor}">${scoreLabel} Səviyyə</div>
        <div class="score-desc">${total} risk · ${critical} kritik · ${overdue} gecikmiş</div>
      </div>
    </div>

    <div class="kpi-row kpi-row-4">
      <div class="kpi-card bg-rose"><div class="kpi-label">Kritik risklər</div><div class="kpi-value c-rose">${critical}</div><div class="kpi-sub">Ümumi ${total} risk</div></div>
      <div class="kpi-card ${overdue > 0 ? 'bg-orange' : 'bg-slate'}"><div class="kpi-label">Gecikmiş risklər</div><div class="kpi-value ${overdue > 0 ? 'c-orange' : 'c-slate'}">${overdue}</div><div class="kpi-sub">${overdue > 0 ? 'Tədbir tələb olunur' : 'Gecikmiş yoxdur'}</div></div>
      <div class="kpi-card bg-blue"><div class="kpi-label">Uyğunluq tamamlanması</div><div class="kpi-value c-blue">${complianceRate}%</div><div class="kpi-sub">${completedAss}/${totalAss} tamamlanmış</div></div>
      <div class="kpi-card bg-violet"><div class="kpi-label">Nəzarət tətbiqi</div><div class="kpi-value c-violet">${controlsRate}%</div><div class="kpi-sub">${implemented}/${totalControls} tətbiq edilmiş</div></div>
    </div>

    <div class="posture-row">
      <div class="posture-card ${riskPosture.cls}">
        <div class="posture-ttl">Risk Mövqeyi</div>
        <div class="posture-val" style="color:${riskPosture.color}">${riskPosture.label}</div>
        <div class="posture-sub">Ümumi risk balı: ${overallScore}</div>
      </div>
      <div class="posture-card ${compPosture.cls}">
        <div class="posture-ttl">Uyğunluq Mövqeyi</div>
        <div class="posture-val" style="color:${compPosture.color}">${compPosture.label}</div>
        <div class="posture-sub">Tamamlanma: ${complianceRate}%</div>
      </div>
      <div class="posture-card ${ctrlPosture.cls}">
        <div class="posture-ttl">Nəzarət Mövqeyi</div>
        <div class="posture-val" style="color:${ctrlPosture.color}">${ctrlPosture.label}</div>
        <div class="posture-sub">Tətbiq: ${controlsRate}%</div>
      </div>
    </div>

    ${top5.length > 0 ? `
    <div class="section">
      <div class="section-title">Top 5 Risk</div>
      <table>
        <thead><tr><th>Başlıq</th><th>Departament</th><th>Sahib</th><th style="text-align:center">Bal</th><th>Status</th><th>Bitmə tarixi</th><th>Səviyyə</th></tr></thead>
        <tbody>${top5Rows}</tbody>
      </table>
    </div>` : ''}

    ${audit.length > 0 ? `
    <div class="section">
      <div class="section-title">Son Audit Fəaliyyəti</div>
      ${auditItems}
    </div>` : ''}
  `;
}

// ── Main export function ──────────────────────────────────────────────────────

export function printMonitoringReport(
  tab: TabKey,
  summary: DashboardSummary | null,
  organizationName: string,
  _tabElement: HTMLElement | null,
  onStart?: () => void,
  onEnd?: () => void,
) {
  if (!summary) {
    alert('Məlumatlar hələ yüklənməyib. Zəhmət olmasa bir az gözləyin.');
    return;
  }

  onStart?.();

  try {
    const now = fmtNow();
    let content = '';
    if (tab === 'risk') content = buildRiskContent(summary);
    else if (tab === 'compliance') content = buildComplianceContent(summary);
    else content = buildExecutiveContent(summary);

    const html = `<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8">
  <title>${TAB_TITLES[tab]} — ${organizationName}</title>
  <style>${STYLES}</style>
</head>
<body>
<div class="page">
  <div class="report-header">
    <div class="header-row">
      <div>
        <div class="org-label">${organizationName}</div>
        <div class="report-title">${TAB_TITLES[tab]}</div>
        <div class="report-subtitle">Risk İdarəetmə Platformu · Avtomatlaşdırılmış Hesabat</div>
      </div>
      <div class="meta">
        <div class="meta-date">${now}</div>
        <div class="meta-label">Hesabat tarixi</div>
      </div>
    </div>
    <div class="accent-bar"></div>
  </div>

  <div class="content">${content}</div>

  <div class="confidential">Məxfi · Yalnız daxili istifadə üçün</div>
  <div class="footer">
    <span>${organizationName} · ${TAB_TITLES[tab]}</span>
    <span>Risk İdarəetmə Platformu tərəfindən avtomatik yaradılmışdır · ${now}</span>
  </div>
</div>
<script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1100,height=850');
    if (!win) {
      alert('Pop-up bloklandı. Brauzerinizdə pop-up-a icazə verin və yenidən cəhd edin.');
      return;
    }
    win.document.write(html);
    win.document.close();
  } finally {
    onEnd?.();
  }
}
