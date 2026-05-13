import React from 'react';
import { Card } from '../common';
import { DashboardSummary } from '../../services/dashboardService';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  summary: DashboardSummary | null;
  organizationName: string;
}

const levelBg = (level: string) => {
  const l = level?.toLowerCase();
  if (l === 'critical') return 'bg-rose-50 border-rose-100 text-rose-700';
  if (l === 'high') return 'bg-orange-50 border-orange-100 text-orange-700';
  if (l === 'medium') return 'bg-amber-50 border-amber-100 text-amber-700';
  return 'bg-emerald-50 border-emerald-100 text-emerald-700';
};

export const ExecutiveDashboard: React.FC<Props> = ({ summary, organizationName }) => {
  const { t } = useLanguage();

  const totalRisks = summary?.totalRisks ?? 0;
  const criticalRisks = summary?.criticalRisks ?? 0;
  const highRisks = summary?.highRisks ?? 0;
  const mediumRisks = summary?.mediumRisks ?? 0;
  const lowRisks = summary?.lowRisks ?? 0;
  const overdueRisks = summary?.overdueRisks ?? 0;
  const completedAssessments = summary?.completedAssessments ?? 0;
  const totalAssessments = summary?.totalAssessments ?? 0;
  const implementedControls = summary?.implementedControls ?? 0;
  const totalControls = summary?.totalControls ?? 0;
  const top5Risks = summary?.top5Risks ?? [];
  const recentAudit = summary?.recentAuditActivity ?? [];

  // Overall risk score formula
  const overallScore = Math.round(
    (criticalRisks * 4 + highRisks * 3 + mediumRisks * 2 + lowRisks) /
      Math.max(totalRisks, 1) * 10
  );

  const scoreColor =
    overallScore < 15
      ? 'text-emerald-500'
      : overallScore < 25
      ? 'text-amber-500'
      : 'text-rose-600';

  const scoreBg =
    overallScore < 15
      ? 'bg-emerald-50 border-emerald-100'
      : overallScore < 25
      ? 'bg-amber-50 border-amber-100'
      : 'bg-rose-50 border-rose-100';

  const scoreLabel =
    overallScore < 15 ? 'Aşağı' : overallScore < 25 ? 'Orta' : 'Yüksək';

  const complianceRate =
    totalAssessments > 0 ? Math.round((completedAssessments / totalAssessments) * 100) : 0;
  const controlsRate =
    totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0;

  const postureStatus = (rate: number) =>
    rate >= 80 ? { label: 'Yaxşı', cls: 'bg-emerald-50 border-emerald-100 text-emerald-700' }
    : rate >= 50 ? { label: 'Orta', cls: 'bg-amber-50 border-amber-100 text-amber-700' }
    : { label: 'Zəif', cls: 'bg-rose-50 border-rose-100 text-rose-700' };

  const riskPosture = postureStatus(100 - Math.min(overallScore * 3, 100));
  const compliancePosture = postureStatus(complianceRate);
  const controlsPosture = postureStatus(controlsRate);

  return (
    <div className="space-y-6">
      {/* Print header */}
      <div className="print-only">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{organizationName}</p>
        <h2 className="text-xl font-black text-slate-900 mt-1">İcraiyyə İcmalı</h2>
        <p className="text-xs text-slate-400 mt-0.5">Çap tarixi: {new Date().toLocaleDateString('az-AZ')}</p>
      </div>

      {/* Overall Risk Score + KPI row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Big score card */}
        <div className={`lg:col-span-1 rounded-[2.5rem] p-8 border shadow-sm flex flex-col justify-between ${scoreBg}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t('monitoring.overallScore') || 'Ümumi Risk Skoru'}
          </p>
          <div>
            <h2 className={`text-7xl font-black tabular-nums leading-none mt-4 ${scoreColor}`}>
              {overallScore}
            </h2>
            <span className={`inline-flex mt-3 items-center px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${scoreColor} border-current/20`}>
              {scoreLabel} Səviyyə
            </span>
          </div>
        </div>

        {/* 4 KPI cards */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kritik Risklər</p>
            <h3 className={`text-4xl font-black mt-2 tabular-nums ${criticalRisks > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
              {criticalRisks}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Ümumi {totalRisks} risk</p>
          </div>

          <div className={`${overdueRisks > 0 ? 'bg-orange-50 border-orange-100' : 'bg-white border-slate-100'} border rounded-[2rem] p-6`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gecikmiş Risklər</p>
            <h3 className={`text-4xl font-black mt-2 tabular-nums ${overdueRisks > 0 ? 'text-orange-600' : 'text-slate-300'}`}>
              {overdueRisks}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">
              {overdueRisks > 0 ? 'Tədbir tələb olunur' : 'Gecikmiş yoxdur'}
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uyğunluq Tamamlanması</p>
            <h3 className={`text-4xl font-black mt-2 tabular-nums ${complianceRate >= 80 ? 'text-emerald-600' : complianceRate >= 50 ? 'text-amber-500' : 'text-rose-600'}`}>
              {complianceRate}%
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">
              {completedAssessments}/{totalAssessments} tamamlanmış
            </p>
          </div>

          <div className="bg-violet-50 border border-violet-100 rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nəzarət Tətbiqi</p>
            <h3 className={`text-4xl font-black mt-2 tabular-nums ${controlsRate >= 80 ? 'text-emerald-600' : controlsRate >= 50 ? 'text-amber-500' : 'text-rose-600'}`}>
              {controlsRate}%
            </h3>
            <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">
              {implementedControls}/{totalControls} tətbiq edilmiş
            </p>
          </div>
        </div>
      </div>

      {/* Overall Status section */}
      <Card title="Ümumi Vəziyyət" subtitle="Lövhə üçün hazırlanmış icmal">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-2xl border p-5 ${riskPosture.cls}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
              {t('monitoring.riskPosture') || 'Risk Mövqeyi'}
            </p>
            <p className="text-2xl font-black mt-2">{riskPosture.label}</p>
            <p className="text-xs font-bold mt-1 opacity-70">Ümumi risk balı: {overallScore}</p>
          </div>
          <div className={`rounded-2xl border p-5 ${compliancePosture.cls}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
              {t('monitoring.compliancePosture') || 'Uyğunluq Mövqeyi'}
            </p>
            <p className="text-2xl font-black mt-2">{compliancePosture.label}</p>
            <p className="text-xs font-bold mt-1 opacity-70">Tamamlanma: {complianceRate}%</p>
          </div>
          <div className={`rounded-2xl border p-5 ${controlsPosture.cls}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">
              {t('monitoring.controlsPosture') || 'Nəzarət Mövqeyi'}
            </p>
            <p className="text-2xl font-black mt-2">{controlsPosture.label}</p>
            <p className="text-xs font-bold mt-1 opacity-70">Tətbiq: {controlsRate}%</p>
          </div>
        </div>
      </Card>

      {/* Top 5 Risks */}
      <Card title="Top 5 Risk" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/30">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.title')}</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.top5Dept')}</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.top5Owner')}</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('common.score')}</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.top5Status')}</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.top5DueDate')}</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('common.severity')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {top5Risks.length > 0 ? top5Risks.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4"><p className="text-sm font-bold text-slate-900">{r.title}</p></td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-bold">{r.department || '—'}</td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-bold">{r.owner || '—'}</td>
                  <td className="px-4 py-4 text-center font-black text-slate-700 tabular-nums">{r.score}</td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-bold">{r.status}</td>
                  <td className="px-4 py-4 text-xs text-slate-400 font-bold tabular-nums">
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${levelBg(r.level)}`}>
                      {r.level}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-8 py-12 text-center text-sm text-slate-400 font-bold">
                    {t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recent Audit Activity */}
      {recentAudit.length > 0 && (
        <Card title="Son Audit Fəaliyyəti" subtitle="Son 5 qeyd">
          <div className="space-y-3">
            {recentAudit.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-start gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-50">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                <div className="min-w-0 flex-grow">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {entry.action}
                    {entry.entity_type && (
                      <span className="text-slate-400 font-medium"> — {entry.entity_type}</span>
                    )}
                  </p>
                  {entry.description && (
                    <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">{entry.description}</p>
                  )}
                  <p className="text-[10px] text-slate-300 font-bold mt-1 tabular-nums">
                    {entry.performed_by && <span className="text-slate-400">{entry.performed_by} · </span>}
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
