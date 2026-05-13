import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
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
} from 'recharts';
import { Button, Card, PageHeader } from '../common';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';
import { dashboardService, DashboardSummary, DashboardFilters } from '../../services/dashboardService';
import { DashboardTimeSeries } from '../dashboard/DashboardTimeSeries';
import { DashboardRiskMap } from '../dashboard/DashboardRiskMap';
import { ComplianceDashboard } from './ComplianceDashboard';
import { ExecutiveDashboard } from './ExecutiveDashboard';
import { APP_CONFIG } from '../../config/appConfig';
import { RiskLevel, RiskStatus } from '../../types';

interface MonitoringPageProps {
  store: any;
  setActiveTab?: (tab: string) => void;
  onNavigate?: (tab: string) => void;
}

type TabKey = 'risk' | 'compliance' | 'executive';

export const MonitoringPage: React.FC<MonitoringPageProps> = ({ store }) => {
  const { t } = useLanguage();
  const { organization } = useAuth();
  const { clearSubLabel } = useBreadcrumb();
  const rrNavigate = useNavigate();

  useEffect(() => { clearSubLabel(); }, [clearSubLabel]);

  const { risks, assessments } = store;

  const [activeTab, setActiveTab] = useState<TabKey>('risk');

  // Filter state
  const [timeRange, setTimeRange] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // API summary state
  const [apiSummary, setApiSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const buildFilters = useCallback((): DashboardFilters => {
    const filters: DashboardFilters = {};
    const now = new Date();
    if (timeRange === '7d') { const d = new Date(now); d.setDate(d.getDate() - 7); filters.from = d.toISOString().split('T')[0]; }
    else if (timeRange === '30d') { const d = new Date(now); d.setDate(d.getDate() - 30); filters.from = d.toISOString().split('T')[0]; }
    else if (timeRange === '90d') { const d = new Date(now); d.setDate(d.getDate() - 90); filters.from = d.toISOString().split('T')[0]; }
    else if (timeRange === 'year') { filters.from = `${now.getFullYear()}-01-01`; }
    if (statusFilter) filters.status = statusFilter;
    return filters;
  }, [timeRange, statusFilter]);

  const fetchSummary = useCallback(() => {
    if (APP_CONFIG.DATA_PROVIDER !== 'api') return;
    setSummaryLoading(true);
    dashboardService.getDashboardSummary(buildFilters())
      .then(data => { setApiSummary(data); setSummaryError(null); })
      .catch(() => setSummaryError('Failed to load monitoring data'))
      .finally(() => setSummaryLoading(false));
  }, [buildFilters]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  // Navigate to Risk Register with pre-applied URL filters
  const navigateToRisks = (filter: Record<string, string>) => {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
    rrNavigate(`/risks?${params.toString()}`);
  };

  // Derived counts — prefer API data when available
  const criticalCount = apiSummary ? apiSummary.risksBySeverity.critical : risks.filter((r: any) => r.level === RiskLevel.CRITICAL).length;
  const highCount = apiSummary ? apiSummary.risksBySeverity.high : risks.filter((r: any) => r.level === RiskLevel.HIGH).length;
  const mediumCount = apiSummary ? apiSummary.risksBySeverity.medium : risks.filter((r: any) => r.level === RiskLevel.MEDIUM).length;
  const lowCount = apiSummary ? apiSummary.risksBySeverity.low : risks.filter((r: any) => r.level === RiskLevel.LOW).length;
  const openCount = apiSummary ? apiSummary.openRisks : risks.filter((r: any) => r.status === RiskStatus.OPEN).length;
  const resolvedCount = apiSummary ? (apiSummary.resolvedRisks ?? 0) : 0;
  const unresolvedCount = apiSummary ? (apiSummary.unresolvedRisks ?? 0) : 0;
  const overdueCount = apiSummary ? apiSummary.overdueRisks : 0;
  const totalRisks = apiSummary ? apiSummary.totalRisks : risks.length;
  const departmentSummary = apiSummary?.departmentSummary ?? [];
  const riskMap = apiSummary?.riskMap ?? [];

  const categoryData = apiSummary
    ? apiSummary.risksByCategory.map(c => ({ name: c.category, value: c.count }))
    : [
        { name: 'Operational', value: risks.filter((r: any) => r.category?.includes('Operational')).length },
        { name: 'Compliance', value: risks.filter((r: any) => r.category?.includes('Compliance')).length },
        { name: 'Financial', value: risks.filter((r: any) => r.category?.includes('Financial')).length },
        { name: 'IT/Security', value: risks.filter((r: any) => r.category?.includes('Security') || r.category?.includes('IT')).length },
      ];

  const levelData = [
    { name: t('common.critical'), value: criticalCount, color: '#DC2626' },
    { name: t('common.high'), value: highCount, color: '#EA580C' },
    { name: t('common.medium'), value: mediumCount, color: '#D97706' },
    { name: t('common.low'), value: lowCount, color: '#059669' },
  ];
  const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  const orgName = organization?.name || '';

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'risk', label: t('monitoring.riskTab') || 'Risk Monitorinqi' },
    { key: 'compliance', label: t('monitoring.complianceTab') || 'Uyğunluq & Nəzarət' },
    { key: 'executive', label: t('monitoring.executiveTab') || 'İcraiyyə İcmalı' },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Page header — hidden on print */}
      <div className="no-print">
        <PageHeader
          title={t('monitoring.title') || 'Monitorinq'}
          subtitle={`Risk monitorinqi və uyğunluq idarəetməsi — ${orgName}`}
          actions={
            <Button
              variant="secondary"
              icon={Printer}
              onClick={() => window.print()}
            >
              {t('monitoring.exportPdf') || 'PDF İxrac'}
            </Button>
          }
        />
      </div>

      {/* Filter bar — hidden on print */}
      <div className="no-print flex flex-wrap gap-3 items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('dashboard.timeRange')}:</span>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value)}
          className="bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20 shadow-sm"
        >
          <option value="">{t('dashboard.allTime')}</option>
          <option value="7d">{t('dashboard.last7Days')}</option>
          <option value="30d">{t('dashboard.last30Days')}</option>
          <option value="90d">{t('dashboard.last90Days')}</option>
          <option value="year">{t('dashboard.thisYear')}</option>
        </select>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('dashboard.statusFilter')}:</span>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20 shadow-sm"
        >
          <option value="">{t('dashboard.allStatuses')}</option>
          <option value="open">{t('dashboard.openRisks')}</option>
          <option value="resolved">{t('dashboard.resolvedRisks')}</option>
          <option value="unresolved">{t('dashboard.unresolvedRisks')}</option>
          <option value="overdue">{t('dashboard.overdueOnly')}</option>
        </select>
        {summaryLoading && (
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
            {t('common.loading')}...
          </span>
        )}
        {summaryError && <span className="text-[10px] text-rose-500 font-bold">{summaryError}</span>}
      </div>

      {/* Tab buttons — hidden on print */}
      <div className="no-print flex gap-2 border-b border-slate-100 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest rounded-t-2xl transition-all border-b-2 -mb-[2px] ${
              activeTab === tab.key
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — wrap in print area */}
      <div id="monitoring-print-area">

        {/* ── Tab 1: Risk Monitorinqi ── */}
        <div className={activeTab === 'risk' ? 'block' : 'hidden'}>
          {/* Print header for this tab */}
          <div className="print-only mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{orgName}</p>
            <h2 className="text-xl font-black text-slate-900 mt-1">Risk Monitorinqi</h2>
            <p className="text-xs text-slate-400 mt-0.5">Çap tarixi: {new Date().toLocaleDateString('az-AZ')}</p>
          </div>

          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <button
                onClick={() => navigateToRisks({ severity: 'Critical' })}
                className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all text-left group"
              >
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('common.critical')}</p>
                <h3 className="text-4xl font-black mt-2 text-rose-600 tabular-nums group-hover:scale-105 transition-transform">{criticalCount}</h3>
                <div className="mt-3 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(criticalCount / Math.max(totalRisks, 1)) * 100}%` }} />
                </div>
              </button>

              <button
                onClick={() => navigateToRisks({ severity: 'High' })}
                className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-left group"
              >
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('common.high')}</p>
                <h3 className="text-4xl font-black mt-2 text-orange-500 tabular-nums group-hover:scale-105 transition-transform">{highCount}</h3>
                <div className="mt-3 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(highCount / Math.max(totalRisks, 1)) * 100}%` }} />
                </div>
              </button>

              <button
                onClick={() => navigateToRisks({ status: 'Open' })}
                className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all text-left group"
              >
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('common.open')}</p>
                <h3 className="text-4xl font-black mt-2 text-slate-800 tabular-nums group-hover:scale-105 transition-transform">{openCount}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-3 uppercase tracking-widest">{t('nav.riskRegister')}</p>
              </button>

              <button
                onClick={() => navigateToRisks({ overdue: 'true' })}
                className="lg:col-span-2 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all text-left group"
              >
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('dashboard.overdue')}</p>
                <h3 className={`text-4xl font-black mt-2 tabular-nums group-hover:scale-105 transition-transform ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                  {String(overdueCount).padStart(2, '0')}
                </h3>
                <p className="text-[10px] text-rose-500 font-bold mt-3 uppercase tracking-widest">{t('dashboard.actionRequired')}</p>
              </button>
            </div>

            {/* Time Series */}
            <DashboardTimeSeries
              setActiveTab={(tab) => rrNavigate(`/${tab === 'risks' ? 'risks' : tab}`)}
              departments={departmentSummary.map(d => d.department)}
              owners={Array.from(new Set(risks.map((r: any) => r.owner))).filter(Boolean) as string[]}
            />

            {/* Risk Map + Mini Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-5">
                <DashboardRiskMap riskMap={riskMap} navigateToRisks={navigateToRisks} />
              </div>
              <div className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
                <Card title={t('dashboard.distributionByCategory')} subtitle={t('dashboard.riskSurfaceArea')}>
                  <div className="h-[200px] pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} layout="vertical" margin={{ left: 16, right: 16, top: 0, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={72} tick={{ fontSize: 9, fill: '#64748B', fontWeight: 700 }} />
                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                          {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card title={t('dashboard.severityBreakdown')} subtitle="">
                  <div className="h-[200px] flex items-center">
                    <ResponsiveContainer width="60%" height="100%">
                      <PieChart>
                        <Pie data={levelData} innerRadius={50} outerRadius={68} paddingAngle={6} dataKey="value" stroke="none">
                          {levelData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2.5 pl-2 flex-grow">
                      {levelData.map(l => (
                        <div key={l.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">{l.name} ({l.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card title={t('dashboard.resolved')} className="md:col-span-2">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('dashboard.resolved')}</p>
                      <p className="text-3xl font-black text-emerald-600 tabular-nums mt-1">{resolvedCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('dashboard.unresolved')}</p>
                      <p className="text-3xl font-black text-amber-500 tabular-nums mt-1">{unresolvedCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.medium')}</p>
                      <p className="text-3xl font-black text-amber-400 tabular-nums mt-1">{mediumCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.low')}</p>
                      <p className="text-3xl font-black text-emerald-500 tabular-nums mt-1">{lowCount}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab 2: Uyğunluq & Nəzarət ── */}
        <div className={activeTab === 'compliance' ? 'block' : 'hidden'}>
          <ComplianceDashboard summary={apiSummary} organizationName={orgName} />
        </div>

        {/* ── Tab 3: İcraiyyə İcmalı ── */}
        <div className={activeTab === 'executive' ? 'block' : 'hidden'}>
          <ExecutiveDashboard summary={apiSummary} organizationName={orgName} />
        </div>
      </div>
    </div>
  );
};
