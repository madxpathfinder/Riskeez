import { DashboardSummary } from '../services/dashboardService';

type TabKey = 'risk' | 'compliance' | 'executive';

const TAB_TITLES: Record<TabKey, string> = {
  risk: 'Risk Monitorinqi',
  compliance: 'Uyğunluq & Nəzarət Monitorinqi',
  executive: 'İcraiyyə İcmalı',
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('az-AZ'); } catch { return d; }
};

const fmtPct = (num: number, den: number) =>
  den > 0 ? `${Math.round((num / den) * 100)}%` : '—';

const badge = (text: string, color: string) =>
  `<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;background:${color}20;color:${color};border:1px solid ${color}40">${text}</span>`;

const levelColor = (level: string) => {
  const l = (level || '').toLowerCase();
  if (l === 'critical') return '#DC2626';
  if (l === 'high') return '#EA580C';
  if (l === 'medium') return '#D97706';
  return '#059669';
};

const scoreColor = (score: number) =>
  score < 15 ? '#059669' : score < 25 ? '#D97706' : '#DC2626';

const postureLabel = (rate: number) =>
  rate >= 80 ? ['Yaxşı', '#059669'] : rate >= 50 ? ['Orta', '#D97706'] : ['Zəif', '#DC2626'];

// ── shared styles ─────────────────────────────────────────────────────────────
const BASE_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1E293B; }
  .page { max-width: 900px; margin: 0 auto; padding: 0 32px 48px; }

  /* ── Header ── */
  .report-header { background: #0F172A; color: #fff; padding: 28px 32px 24px; margin: 0 -32px 32px; }
  .report-header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .report-org { font-size: 11px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #94A3B8; margin-bottom: 6px; }
  .report-title { font-size: 26px; font-weight: 900; letter-spacing: -.02em; color: #fff; }
  .report-subtitle { font-size: 12px; color: #64748B; margin-top: 4px; font-weight: 600; }
  .report-meta { text-align: right; font-size: 11px; color: #64748B; font-weight: 600; }
  .report-meta strong { display: block; font-size: 14px; color: #CBD5E1; font-weight: 800; margin-bottom: 2px; }
  .accent-bar { height: 3px; background: linear-gradient(90deg, #6366F1, #8B5CF6, #06B6D4); margin: 0 -32px; margin-top: 20px; }

  /* ── Section ── */
  .section { margin-bottom: 28px; }
  .section-title { font-size: 11px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase;
    color: #6366F1; border-bottom: 2px solid #EEF2FF; padding-bottom: 6px; margin-bottom: 14px; }

  /* ── KPI cards ── */
  .kpi-grid { display: grid; gap: 12px; margin-bottom: 24px; }
  .kpi-grid-4 { grid-template-columns: repeat(4, 1fr); }
  .kpi-grid-5 { grid-template-columns: 1fr repeat(4, 1fr); }
  .kpi-card { border-radius: 16px; padding: 18px 20px; border: 1px solid #E2E8F0; background: #F8FAFC; }
  .kpi-label { font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #94A3B8; margin-bottom: 8px; }
  .kpi-value { font-size: 36px; font-weight: 900; line-height: 1; letter-spacing: -.03em; }
  .kpi-sub { font-size: 10px; font-weight: 700; color: #94A3B8; margin-top: 6px; text-transform: uppercase; letter-spacing: .06em; }
  .kpi-bar { height: 4px; border-radius: 4px; background: #E2E8F0; margin-top: 10px; overflow: hidden; }
  .kpi-bar-fill { height: 100%; border-radius: 4px; }

  /* ── Score card ── */
  .score-card { border-radius: 20px; padding: 28px; border: 1px solid; display: flex; flex-direction: column; justify-content: space-between; }
  .score-big { font-size: 72px; font-weight: 900; line-height: 1; letter-spacing: -.04em; margin: 12px 0 8px; }
  .score-tag { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }

  /* ── Posture badges ── */
  .posture-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 8px; }
  .posture-card { border-radius: 14px; padding: 16px 18px; border: 1px solid; }
  .posture-label { font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; opacity: .6; margin-bottom: 6px; }
  .posture-value { font-size: 22px; font-weight: 900; }
  .posture-sub { font-size: 10px; font-weight: 700; opacity: .7; margin-top: 4px; }

  /* ── Table ── */
  .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .data-table th { padding: 10px 14px; text-align: left; font-size: 9px; font-weight: 800; letter-spacing: .1em;
    text-transform: uppercase; color: #64748B; background: #F8FAFC; border-bottom: 2px solid #E2E8F0; }
  .data-table td { padding: 10px 14px; border-bottom: 1px solid #F1F5F9; font-weight: 600; vertical-align: middle; }
  .data-table tr:last-child td { border-bottom: none; }
  .data-table tr:nth-child(even) td { background: #FAFAFA; }
  .data-table .center { text-align: center; }
  .data-table .mono { font-variant-numeric: tabular-nums; font-weight: 800; }

  /* ── 2-col layout ── */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

  /* ── Progress bar ── */
  .prog-bar { height: 8px; border-radius: 8px; background: #E2E8F0; overflow: hidden; margin-top: 4px; }
  .prog-fill { height: 100%; border-radius: 8px; }

  /* ── Footer ── */
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E2E8F0;
    display: flex; justify-content: space-between; font-size: 10px; color: #94A3B8; font-weight: 600; }

  /* ── Print ── */
  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: A4 portrait; margin: 1cm; }
  }
`;

// ── Risk Tab HTML ─────────────────────────────────────────────────────────────
function riskHTML(s: DashboardSummary, org: string, now: string): string {
  const total = s.totalRisks || 0;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const top5Rows = (s.top5Risks ?? []).map(r => `
    <tr>
      <td>${r.title}</td>
      <td>${r.department || '—'}</td>
      <td>${r.owner || '—'}</td>
      <td class="center mono">${r.score}</td>
      <td>${r.status}</td>
      <td class="center">${fmtDate(r.dueDate)}</td>
      <td class="center">${badge(r.level, levelColor(r.level))}</td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:#94A3B8;padding:20px">Məlumat yoxdur</td></tr>`;

  const deptRows = (s.departmentSummary ?? []).slice(0, 8).map(d => `
    <tr>
      <td>${d.department}</td>
      <td class="center mono">${d.total}</td>
      <td class="center mono" style="color:#DC2626">${d.critical}</td>
      <td class="center mono" style="color:#059669">${d.resolved}</td>
      <td class="center mono" style="color:#D97706">${d.unresolved}</td>
      <td class="center mono" style="color:#EA580C">${d.overdue}</td>
    </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;color:#94A3B8;padding:20px">Məlumat yoxdur</td></tr>`;

  const catRows = (s.risksByCategory ?? []).slice(0, 8).map(c => `
    <tr>
      <td>${c.category}</td>
      <td class="center mono">${c.count}</td>
      <td style="width:200px">
        <div class="prog-bar"><div class="prog-fill" style="width:${pct(c.count)}%;background:#6366F1"></div></div>
      </td>
      <td class="center">${pct(c.count)}%</td>
    </tr>`).join('') || `<tr><td colspan="4" style="text-align:center;color:#94A3B8;padding:20px">Məlumat yoxdur</td></tr>`;

  return `
    <div class="section">
      <div class="section-title">Risk Göstəriciləri</div>
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card" style="background:#FEF2F2;border-color:#FECACA">
          <div class="kpi-label">Kritik</div>
          <div class="kpi-value" style="color:#DC2626">${s.criticalRisks ?? 0}</div>
          <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${pct(s.criticalRisks??0)}%;background:#DC2626"></div></div>
        </div>
        <div class="kpi-card" style="background:#FFF7ED;border-color:#FED7AA">
          <div class="kpi-label">Yüksək</div>
          <div class="kpi-value" style="color:#EA580C">${s.highRisks ?? 0}</div>
          <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${pct(s.highRisks??0)}%;background:#EA580C"></div></div>
        </div>
        <div class="kpi-card" style="background:#FFFBEB;border-color:#FDE68A">
          <div class="kpi-label">Orta</div>
          <div class="kpi-value" style="color:#D97706">${s.mediumRisks ?? 0}</div>
          <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${pct(s.mediumRisks??0)}%;background:#D97706"></div></div>
        </div>
        <div class="kpi-card" style="background:#F0FDF4;border-color:#BBF7D0">
          <div class="kpi-label">Aşağı</div>
          <div class="kpi-value" style="color:#059669">${s.lowRisks ?? 0}</div>
          <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${pct(s.lowRisks??0)}%;background:#059669"></div></div>
        </div>
      </div>
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card">
          <div class="kpi-label">Ümumi Risklər</div>
          <div class="kpi-value" style="color:#1E293B">${total}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Açıq</div>
          <div class="kpi-value" style="color:#334155">${s.openRisks ?? 0}</div>
        </div>
        <div class="kpi-card" style="background:#F0FDF4;border-color:#BBF7D0">
          <div class="kpi-label">Həll Edilmiş</div>
          <div class="kpi-value" style="color:#059669">${s.resolvedRisks ?? 0}</div>
        </div>
        <div class="kpi-card" style="background:${(s.overdueRisks??0)>0?'#FEF2F2':'#F8FAFC'};border-color:${(s.overdueRisks??0)>0?'#FECACA':'#E2E8F0'}">
          <div class="kpi-label">Gecikmiş</div>
          <div class="kpi-value" style="color:${(s.overdueRisks??0)>0?'#DC2626':'#CBD5E1'}">${s.overdueRisks ?? 0}</div>
        </div>
      </div>
    </div>

    <div class="two-col section">
      <div>
        <div class="section-title">Kateqoriyaya görə</div>
        <table class="data-table">
          <thead><tr><th>Kateqoriya</th><th class="center">Say</th><th>Paylanma</th><th class="center">%</th></tr></thead>
          <tbody>${catRows}</tbody>
        </table>
      </div>
      <div>
        <div class="section-title">Şöbə üzrə Risklər</div>
        <table class="data-table">
          <thead><tr><th>Şöbə</th><th class="center">Cəmi</th><th class="center">Kritik</th><th class="center">Həll</th><th class="center">Açıq</th><th class="center">Gecikmə</th></tr></thead>
          <tbody>${deptRows}</tbody>
        </table>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Top 5 Risk (Ciddilik üzrə)</div>
      <table class="data-table">
        <thead><tr><th>Risk Adı</th><th>Şöbə</th><th>Sahib</th><th class="center">Bal</th><th>Status</th><th class="center">Son Tarix</th><th class="center">Səviyyə</th></tr></thead>
        <tbody>${top5Rows}</tbody>
      </table>
    </div>
  `;
}

// ── Compliance Tab HTML ───────────────────────────────────────────────────────
function complianceHTML(s: DashboardSummary, _org: string, _now: string): string {
  const tc = s.totalControls ?? 0;
  const ic = s.implementedControls ?? 0;
  const pc = s.partialControls ?? 0;
  const mc = s.missingControls ?? 0;
  const ta = s.totalAssessments ?? 0;
  const ca = s.completedAssessments ?? 0;
  const pa = s.pendingAssessments ?? 0;
  const rwc = s.risksWithoutControls ?? 0;
  const compRate = ta > 0 ? Math.round((ca / ta) * 100) : 0;
  const ctrlRate = tc > 0 ? Math.round((ic / tc) * 100) : 0;

  const ctrlStatusColor = (rate: number) => rate >= 80 ? '#059669' : rate >= 50 ? '#D97706' : '#DC2626';
  const ctrlStatus = (rate: number) => rate >= 80 ? 'Yaxşı' : rate >= 50 ? 'Diqqət' : 'Zəif';

  return `
    <div class="section">
      <div class="section-title">Nəzarət Göstəriciləri</div>
      <div class="kpi-grid kpi-grid-4">
        <div class="kpi-card">
          <div class="kpi-label">Ümumi Nəzarət</div>
          <div class="kpi-value" style="color:#1E293B">${tc}</div>
        </div>
        <div class="kpi-card" style="background:#F0FDF4;border-color:#BBF7D0">
          <div class="kpi-label">Tətbiq Edilmiş</div>
          <div class="kpi-value" style="color:#059669">${ic}</div>
          <div class="kpi-sub">${fmtPct(ic, tc)}</div>
        </div>
        <div class="kpi-card" style="background:#FFFBEB;border-color:#FDE68A">
          <div class="kpi-label">Qismən</div>
          <div class="kpi-value" style="color:#D97706">${pc}</div>
          <div class="kpi-sub">${fmtPct(pc, tc)}</div>
        </div>
        <div class="kpi-card" style="background:${mc>0?'#FEF2F2':'#F8FAFC'};border-color:${mc>0?'#FECACA':'#E2E8F0'}">
          <div class="kpi-label">Tətbiq Edilməmiş</div>
          <div class="kpi-value" style="color:${mc>0?'#DC2626':'#CBD5E1'}">${mc}</div>
          <div class="kpi-sub">${fmtPct(mc, tc)}</div>
        </div>
      </div>
    </div>

    <div class="two-col section">
      <div>
        <div class="section-title">Qiymətləndirmə Vəziyyəti</div>
        <div class="kpi-grid" style="grid-template-columns:1fr 1fr 1fr;gap:10px">
          <div class="kpi-card" style="background:#EFF6FF;border-color:#BFDBFE">
            <div class="kpi-label">Ümumi</div>
            <div class="kpi-value" style="color:#2563EB;font-size:28px">${ta}</div>
          </div>
          <div class="kpi-card" style="background:#F0FDF4;border-color:#BBF7D0">
            <div class="kpi-label">Tamamlanmış</div>
            <div class="kpi-value" style="color:#059669;font-size:28px">${ca}</div>
          </div>
          <div class="kpi-card" style="background:#FFFBEB;border-color:#FDE68A">
            <div class="kpi-label">Gözləyən</div>
            <div class="kpi-value" style="color:#D97706;font-size:28px">${pa}</div>
          </div>
        </div>
        <div style="margin-top:14px;padding:16px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0">
          <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8;margin-bottom:8px">Uyğunluq Faizi</div>
          <div style="font-size:32px;font-weight:900;color:${ctrlStatusColor(compRate)}">${compRate}%</div>
          <div class="prog-bar" style="margin-top:8px"><div class="prog-fill" style="width:${compRate}%;background:${ctrlStatusColor(compRate)}"></div></div>
        </div>
      </div>
      <div>
        <div class="section-title">Nəzarət Tətbiq Faizi</div>
        <div style="padding:20px;background:#F8FAFC;border-radius:12px;border:1px solid #E2E8F0;margin-bottom:12px">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8;margin-bottom:8px">Tətbiq Nisbəti</div>
          <div style="font-size:36px;font-weight:900;color:${ctrlStatusColor(ctrlRate)}">${ctrlRate}%</div>
          <div class="prog-bar" style="margin-top:8px"><div class="prog-fill" style="width:${ctrlRate}%;background:${ctrlStatusColor(ctrlRate)}"></div></div>
          <div style="margin-top:8px;font-size:11px;font-weight:700;color:#64748B">${ic} / ${tc} nəzarət tətbiq edilib</div>
        </div>
        <div style="padding:14px 16px;border-radius:12px;border:1px solid ${rwc>0?'#FECACA':'#BBF7D0'};background:${rwc>0?'#FEF2F2':'#F0FDF4'}">
          <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:#94A3B8">Nəzarətsiz Risklər</div>
          <div style="font-size:28px;font-weight:900;color:${rwc>0?'#DC2626':'#059669'};margin-top:4px">${rwc}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Uyğunluq Metrikləri — Cədvəl</div>
      <table class="data-table">
        <thead>
          <tr><th>Göstərici</th><th class="center">Dəyər</th><th class="center">Faiz</th><th>Vəziyyət</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>Tətbiq edilmiş nəzarətlər</td>
            <td class="center mono">${ic} / ${tc}</td>
            <td class="center mono">${fmtPct(ic,tc)}</td>
            <td>${badge(ctrlStatus(ctrlRate), ctrlStatusColor(ctrlRate))}</td>
          </tr>
          <tr>
            <td>Qismən tətbiq edilmiş nəzarətlər</td>
            <td class="center mono">${pc} / ${tc}</td>
            <td class="center mono">${fmtPct(pc,tc)}</td>
            <td>${badge('Tamamlanmalıdır', '#D97706')}</td>
          </tr>
          <tr>
            <td>Tamamlanmış qiymətləndirmələr</td>
            <td class="center mono">${ca} / ${ta}</td>
            <td class="center mono">${fmtPct(ca,ta)}</td>
            <td>${badge(ctrlStatus(compRate), ctrlStatusColor(compRate))}</td>
          </tr>
          <tr>
            <td>Nəzarətsiz risklər</td>
            <td class="center mono" style="color:${rwc>0?'#DC2626':'#059669'}">${rwc}</td>
            <td class="center">—</td>
            <td>${rwc===0 ? badge('Tam','#059669') : badge('Açıq','#DC2626')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

// ── Executive Tab HTML ────────────────────────────────────────────────────────
function executiveHTML(s: DashboardSummary, _org: string, _now: string): string {
  const totalRisks = s.totalRisks ?? 0;
  const cr = s.criticalRisks ?? 0;
  const hr = s.highRisks ?? 0;
  const mr = s.mediumRisks ?? 0;
  const lr = s.lowRisks ?? 0;
  const or_ = s.overdueRisks ?? 0;
  const ca = s.completedAssessments ?? 0;
  const ta = s.totalAssessments ?? 0;
  const ic = s.implementedControls ?? 0;
  const tc = s.totalControls ?? 0;
  const top5 = s.top5Risks ?? [];
  const audit = (s.recentAuditActivity ?? []).slice(0, 5);

  const overallScore = Math.round(
    (cr * 4 + hr * 3 + mr * 2 + lr) / Math.max(totalRisks, 1) * 10
  );
  const sc = scoreColor(overallScore);
  const scoreLabel = overallScore < 15 ? 'Aşağı' : overallScore < 25 ? 'Orta' : 'Yüksək';

  const compRate = ta > 0 ? Math.round((ca / ta) * 100) : 0;
  const ctrlRate = tc > 0 ? Math.round((ic / tc) * 100) : 0;

  const [riskPostLabel, riskPostColor] = postureLabel(100 - Math.min(overallScore * 3, 100));
  const [compPostLabel, compPostColor] = postureLabel(compRate);
  const [ctrlPostLabel, ctrlPostColor] = postureLabel(ctrlRate);

  const top5Rows = top5.map(r => `
    <tr>
      <td>${r.title}</td>
      <td>${r.department || '—'}</td>
      <td>${r.owner || '—'}</td>
      <td class="center mono">${r.score}</td>
      <td>${r.status}</td>
      <td class="center">${fmtDate(r.dueDate)}</td>
      <td class="center">${badge(r.level, levelColor(r.level))}</td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:#94A3B8;padding:20px">Məlumat yoxdur</td></tr>`;

  const auditRows = audit.map(e => `
    <tr>
      <td>${e.action}${e.entity_type ? ` — <span style="color:#94A3B8">${e.entity_type}</span>` : ''}</td>
      <td>${e.performed_by || '—'}</td>
      <td class="center">${new Date(e.timestamp).toLocaleString('az-AZ')}</td>
    </tr>`).join('') || '';

  return `
    <div class="section">
      <div class="section-title">Ümumi Risk Balı</div>
      <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:stretch">
        <div class="score-card" style="background:${sc}10;border-color:${sc}30">
          <div style="font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#94A3B8">Ümumi Risk Skoru</div>
          <div class="score-big" style="color:${sc}">${overallScore}</div>
          <span class="score-tag" style="background:${sc}20;color:${sc};border:1px solid ${sc}40">${scoreLabel} Səviyyə</span>
        </div>
        <div class="kpi-grid kpi-grid-4" style="margin-bottom:0">
          <div class="kpi-card" style="background:#FEF2F2;border-color:#FECACA">
            <div class="kpi-label">Kritik Risklər</div>
            <div class="kpi-value" style="color:${cr>0?'#DC2626':'#CBD5E1'}">${cr}</div>
            <div class="kpi-sub">Ümumi ${totalRisks} risk</div>
          </div>
          <div class="kpi-card" style="background:${or_>0?'#FFF7ED':'#F8FAFC'};border-color:${or_>0?'#FED7AA':'#E2E8F0'}">
            <div class="kpi-label">Gecikmiş Risklər</div>
            <div class="kpi-value" style="color:${or_>0?'#EA580C':'#CBD5E1'}">${or_}</div>
            <div class="kpi-sub">${or_>0?'Tədbir tələb olunur':'Gecikmiş yoxdur'}</div>
          </div>
          <div class="kpi-card" style="background:#EFF6FF;border-color:#BFDBFE">
            <div class="kpi-label">Uyğunluq Tamamlanması</div>
            <div class="kpi-value" style="color:${compRate>=80?'#059669':compRate>=50?'#D97706':'#DC2626'}">${compRate}%</div>
            <div class="kpi-sub">${ca}/${ta} tamamlanmış</div>
          </div>
          <div class="kpi-card" style="background:#F5F3FF;border-color:#DDD6FE">
            <div class="kpi-label">Nəzarət Tətbiqi</div>
            <div class="kpi-value" style="color:${ctrlRate>=80?'#059669':ctrlRate>=50?'#D97706':'#DC2626'}">${ctrlRate}%</div>
            <div class="kpi-sub">${ic}/${tc} tətbiq edilmiş</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Ümumi Vəziyyət — Lövhə İcmalı</div>
      <div class="posture-grid">
        <div class="posture-card" style="background:${riskPostColor}10;border-color:${riskPostColor}30">
          <div class="posture-label">Risk Mövqeyi</div>
          <div class="posture-value" style="color:${riskPostColor}">${riskPostLabel}</div>
          <div class="posture-sub" style="color:${riskPostColor}">Ümumi risk balı: ${overallScore}</div>
        </div>
        <div class="posture-card" style="background:${compPostColor}10;border-color:${compPostColor}30">
          <div class="posture-label">Uyğunluq Mövqeyi</div>
          <div class="posture-value" style="color:${compPostColor}">${compPostLabel}</div>
          <div class="posture-sub" style="color:${compPostColor}">Tamamlanma: ${compRate}%</div>
        </div>
        <div class="posture-card" style="background:${ctrlPostColor}10;border-color:${ctrlPostColor}30">
          <div class="posture-label">Nəzarət Mövqeyi</div>
          <div class="posture-value" style="color:${ctrlPostColor}">${ctrlPostLabel}</div>
          <div class="posture-sub" style="color:${ctrlPostColor}">Tətbiq: ${ctrlRate}%</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Top 5 Risk (Ciddilik üzrə)</div>
      <table class="data-table">
        <thead><tr><th>Risk Adı</th><th>Şöbə</th><th>Sahib</th><th class="center">Bal</th><th>Status</th><th class="center">Son Tarix</th><th class="center">Səviyyə</th></tr></thead>
        <tbody>${top5Rows}</tbody>
      </table>
    </div>

    ${audit.length > 0 ? `
    <div class="section">
      <div class="section-title">Son Audit Fəaliyyəti</div>
      <table class="data-table">
        <thead><tr><th>Əməliyyat</th><th>İstifadəçi</th><th class="center">Tarix & Saat</th></tr></thead>
        <tbody>${auditRows}</tbody>
      </table>
    </div>` : ''}
  `;
}

// ── Main export function ──────────────────────────────────────────────────────
export function printMonitoringReport(
  tab: TabKey,
  summary: DashboardSummary | null,
  organizationName: string
) {
  if (!summary) {
    alert('Məlumatlar hələ yüklənməyib. Zəhmət olmasa bir az gözləyin.');
    return;
  }

  const now = new Date().toLocaleDateString('az-AZ', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const contentFn = tab === 'risk' ? riskHTML
    : tab === 'compliance' ? complianceHTML
    : executiveHTML;

  const content = contentFn(summary, organizationName, now);

  const html = `<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${TAB_TITLES[tab]} — ${organizationName}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
<div class="page">
  <div class="report-header">
    <div class="report-header-top">
      <div>
        <div class="report-org">${organizationName}</div>
        <div class="report-title">${TAB_TITLES[tab]}</div>
        <div class="report-subtitle">Risk İdarəetmə Platformu — Avtomatlaşdırılmış Hesabat</div>
      </div>
      <div class="report-meta">
        <strong>${now}</strong>
        <span>Hesabat tarixi</span>
      </div>
    </div>
    <div class="accent-bar"></div>
  </div>

  ${content}

  <div class="footer">
    <span>${organizationName} · ${TAB_TITLES[tab]}</span>
    <span>Bu hesabat Risk İdarəetmə Platformu tərəfindən avtomatik yaradılmışdır · ${now}</span>
  </div>
</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 400);
  };
</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=960,height=800');
  if (!win) {
    alert('Pop-up bloklandı. Zəhmət olmasa brauzerdə pop-up-a icazə verin.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
