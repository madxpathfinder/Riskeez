import html2canvas from 'html2canvas';
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

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #1E293B; }
  .page { max-width: 960px; margin: 0 auto; padding: 0; }

  .report-header {
    background: #0F172A; color: #fff;
    padding: 28px 36px 22px;
  }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; }
  .org-label { font-size: 10px; font-weight: 800; letter-spacing: .14em;
    text-transform: uppercase; color: #64748B; margin-bottom: 6px; }
  .report-title { font-size: 24px; font-weight: 900; letter-spacing: -.02em; color: #F1F5F9; }
  .report-subtitle { font-size: 11px; color: #475569; margin-top: 3px; font-weight: 600; }
  .meta { text-align: right; }
  .meta-date { font-size: 13px; font-weight: 800; color: #CBD5E1; }
  .meta-label { font-size: 10px; color: #475569; font-weight: 600; margin-top: 2px; }
  .accent-bar {
    height: 3px; margin-top: 20px;
    background: linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%);
  }

  .content-area { padding: 28px 36px; }
  .content-area img { width: 100%; height: auto; display: block; border-radius: 8px; }

  .footer {
    margin: 0 36px 28px;
    padding-top: 14px;
    border-top: 1px solid #E2E8F0;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #94A3B8;
    font-weight: 600;
  }
  .confidential {
    display: inline-block;
    margin: 0 36px 18px;
    padding: 4px 12px;
    background: #FEF3C7;
    border: 1px solid #FDE68A;
    border-radius: 20px;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: #92400E;
  }

  @media print {
    body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    @page { size: A4 portrait; margin: 0; }
  }
`;

export async function printMonitoringReport(
  tab: TabKey,
  summary: DashboardSummary | null,
  organizationName: string,
  tabElement: HTMLElement | null,
  onStart?: () => void,
  onEnd?: () => void,
) {
  if (!summary) {
    alert('Məlumatlar hələ yüklənməyib. Zəhmət olmasa bir az gözləyin.');
    return;
  }
  if (!tabElement) {
    alert('Tab məzmunu tapılmadı.');
    return;
  }

  onStart?.();

  try {
    // Capture the full tab content (including charts) as PNG
    const canvas = await html2canvas(tabElement, {
      scale: 1.8,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // Capture full scrollable height, not just visible viewport
      height: tabElement.scrollHeight,
      width: tabElement.scrollWidth,
      windowHeight: tabElement.scrollHeight,
      scrollY: 0,
    });

    const imageDataUrl = canvas.toDataURL('image/png', 1.0);
    const now = fmtNow();

    const html = `<!DOCTYPE html>
<html lang="az">
<head>
  <meta charset="UTF-8">
  <title>${TAB_TITLES[tab]} — ${organizationName}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
<div class="page">

  <!-- Header -->
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

  <!-- Dashboard screenshot -->
  <div class="content-area">
    <img src="${imageDataUrl}" alt="${TAB_TITLES[tab]}">
  </div>

  <!-- Confidential notice -->
  <div class="confidential">Məxfi · Yalnız daxili istifadə üçün</div>

  <!-- Footer -->
  <div class="footer">
    <span>${organizationName} · ${TAB_TITLES[tab]}</span>
    <span>Bu hesabat Risk İdarəetmə Platformu tərəfindən avtomatik yaradılmışdır · ${now}</span>
  </div>

</div>
<script>
  window.onload = function() { setTimeout(function() { window.print(); }, 300); };
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1000,height=800');
    if (!win) {
      alert('Pop-up bloklandı. Zəhmət olmasa brauzerinizdə pop-up-a icazə verin və yenidən cəhd edin.');
      return;
    }
    win.document.write(html);
    win.document.close();
  } finally {
    onEnd?.();
  }
}
