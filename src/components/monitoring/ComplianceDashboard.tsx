import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { Card } from '../common';
import { DashboardSummary } from '../../services/dashboardService';
import { useLanguage } from '../../contexts/LanguageContext';

interface Props {
  summary: DashboardSummary | null;
  organizationName: string;
}

export const ComplianceDashboard: React.FC<Props> = ({ summary, organizationName }) => {
  const { t } = useLanguage();

  const totalControls = summary?.totalControls ?? 0;
  const implementedControls = summary?.implementedControls ?? 0;
  const partialControls = summary?.partialControls ?? 0;
  const missingControls = summary?.missingControls ?? 0;
  const completedAssessments = summary?.completedAssessments ?? 0;
  const pendingAssessments = summary?.pendingAssessments ?? 0;
  const totalAssessments = summary?.totalAssessments ?? 0;
  const risksWithoutControls = summary?.risksWithoutControls ?? 0;

  const complianceRate = totalAssessments > 0
    ? Math.round((completedAssessments / totalAssessments) * 100)
    : 0;

  const controlsBarData = [
    { name: t('monitoring.implemented') || 'Tətbiq edilmiş', value: implementedControls, color: '#10B981' },
    { name: t('monitoring.partial') || 'Qismən', value: partialControls, color: '#F59E0B' },
    { name: t('monitoring.notImplemented') || 'Tətbiq edilməmiş', value: missingControls, color: '#EF4444' },
  ];

  const assessmentPieData = [
    { name: t('dashboard.resolved') || 'Tamamlanmış', value: completedAssessments, color: '#10B981' },
    { name: 'Gözləyən', value: pendingAssessments, color: '#F59E0B' },
  ];

  const kpiCards = [
    {
      label: 'Ümumi Nəzarət',
      value: totalControls,
      color: 'text-slate-800',
      bg: 'bg-white',
    },
    {
      label: 'Tətbiq Edilmiş',
      value: implementedControls,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Tamamlanmış Qiymətləndirmə',
      value: completedAssessments,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
    },
    {
      label: 'Nəzarətsiz Risklər',
      value: risksWithoutControls,
      color: risksWithoutControls > 0 ? 'text-rose-600' : 'text-slate-300',
      bg: risksWithoutControls > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Print header — only visible when printing */}
      <div className="print-only">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{organizationName}</p>
        <h2 className="text-xl font-black text-slate-900 mt-1">Uyğunluq & Nəzarət Monitorinqi</h2>
        <p className="text-xs text-slate-400 mt-0.5">Çap tarixi: {new Date().toLocaleDateString('az-AZ')}</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-[2rem] p-6 border shadow-sm ${card.bg}`}
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{card.label}</p>
            <h3 className={`text-4xl font-black mt-2 tabular-nums ${card.color}`}>{card.value}</h3>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls status bar chart */}
        <Card
          title={t('monitoring.controlsStatus') || 'Nəzarət Statusu'}
          subtitle="Tətbiq vəziyyəti üzrə bölgü"
        >
          <div className="h-[220px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={controlsBarData} margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: '#64748B', fontWeight: 700 }}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={48}>
                  {controlsBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Assessment completion donut */}
        <Card
          title={t('monitoring.assessmentCompletion') || 'Qiymətləndirmə Tamamlanması'}
          subtitle={`${complianceRate}% tamamlanmış`}
        >
          <div className="h-[220px] flex items-center">
            <ResponsiveContainer width="55%" height="100%">
              <PieChart>
                <Pie
                  data={assessmentPieData}
                  innerRadius={56}
                  outerRadius={76}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {assessmentPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 pl-2 flex-grow">
              {assessmentPieData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
              <div className="mt-4 pt-3 border-t border-slate-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uyğunluq Faizi</p>
                <p className={`text-2xl font-black tabular-nums mt-1 ${complianceRate >= 80 ? 'text-emerald-600' : complianceRate >= 50 ? 'text-amber-500' : 'text-rose-600'}`}>
                  {complianceRate}%
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Compliance metrics table */}
      <Card title="Uyğunluq Göstəriciləri" noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/30">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Göstərici</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Dəyər</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Faiz</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vəziyyət</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-slate-900">Tətbiq edilmiş nəzarətlər</td>
                <td className="px-4 py-4 text-center font-black text-slate-700 tabular-nums">{implementedControls}/{totalControls}</td>
                <td className="px-4 py-4 text-center font-black tabular-nums text-emerald-600">
                  {totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 0}%
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${implementedControls / Math.max(totalControls, 1) >= 0.8 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                    {implementedControls / Math.max(totalControls, 1) >= 0.8 ? 'Yaxşı' : 'Diqqət tələb edir'}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-slate-900">Qismən tətbiq edilmiş nəzarətlər</td>
                <td className="px-4 py-4 text-center font-black text-slate-700 tabular-nums">{partialControls}/{totalControls}</td>
                <td className="px-4 py-4 text-center font-black tabular-nums text-amber-500">
                  {totalControls > 0 ? Math.round((partialControls / totalControls) * 100) : 0}%
                </td>
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest bg-amber-50 border-amber-100 text-amber-700">
                    Tamamlanmalıdır
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-slate-900">Tamamlanmış qiymətləndirmələr</td>
                <td className="px-4 py-4 text-center font-black text-slate-700 tabular-nums">{completedAssessments}/{totalAssessments}</td>
                <td className="px-4 py-4 text-center font-black tabular-nums text-blue-600">{complianceRate}%</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${complianceRate >= 80 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : complianceRate >= 50 ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                    {complianceRate >= 80 ? 'Yaxşı' : complianceRate >= 50 ? 'Orta' : 'Zəif'}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 text-sm font-bold text-slate-900">Nəzarətsiz risklər</td>
                <td className="px-4 py-4 text-center font-black tabular-nums text-rose-600">{risksWithoutControls}</td>
                <td className="px-4 py-4 text-center font-black tabular-nums text-slate-400">—</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${risksWithoutControls === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                    {risksWithoutControls === 0 ? 'Tam' : 'Açıq'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
