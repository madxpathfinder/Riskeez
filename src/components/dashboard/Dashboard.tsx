import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Download,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ShieldCheck as Shield,
  Building2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion } from 'motion/react';
import { Badge, Button, Card, PageHeader, RiskBadge, Modal } from '../common';
import { RiskStatus, AssessmentStatus, RiskLevel, Risk } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { aiService, AIResponse } from '../../services/aiService';
import { auditLogService } from '../../services/auditLogService';
import { notificationService } from '../../services/notificationService';
import { Notification } from '../../types/notification';
import { FileText, Bell, HelpCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';
import { dashboardService, DashboardSummary, DashboardFilters } from '../../services/dashboardService';
import { DashboardTimeSeries } from './DashboardTimeSeries';
import { DashboardRiskMap } from './DashboardRiskMap';
import { APP_CONFIG } from '../../config/appConfig';
import { getTranslation } from '../../i18n';

interface DashboardProps {
  store: any;
  setActiveTab: (tab: string) => void;
  onNavigate?: (tab: string) => void;
}

export const Dashboard = ({ store, setActiveTab, onNavigate }: DashboardProps) => {
  const { t, language } = useLanguage();
  const { risks, assessments, getOverallRiskLevel } = store;
  const { organization } = useAuth();
  const { success, info } = useToast();
  const { clearSubLabel } = useBreadcrumb();
  const rrNavigate = useNavigate();

  useEffect(() => { clearSubLabel(); }, [clearSubLabel]);

  const [aiSummary, setAiSummary] = useState<string>('"Analyzing your risk landscape... Generating real-time insights based on current registry data and assessment outcomes."');
  const [aiDetails, setAiDetails] = useState<AIResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isExecSummaryOpen, setIsExecSummaryOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [faqSearch, setFaqSearch] = useState('');

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
      .catch(() => setSummaryError('Failed to load dashboard data'))
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
  const top5Risks = apiSummary?.top5Risks ?? [];
  const riskMap = apiSummary?.riskMap ?? [];

  const completedAssessments = apiSummary
    ? apiSummary.completedAssessments
    : assessments.filter((a: any) => a.status === AssessmentStatus.COMPLETED).length;

  const avgScore = (() => {
    const completed = assessments.filter((a: any) => a.status === AssessmentStatus.COMPLETED);
    if (completed.length === 0) return 0;
    return Math.round(completed.reduce((acc: number, cur: any) => acc + cur.overallScore, 0) / completed.length);
  })();

  const handleReanalyze = async () => {
    setIsAnalyzing(true);
    try {
      const resp = await aiService.generateDashboardInsights({ risks, assessments });
      setAiSummary(`"${resp.summary}"`);
      setAiDetails(resp);
      success(t('notifications.insightsRefreshed'), t('notifications.insightsRefreshedDesc'));
      await auditLogService.log('ai_dashboard_insights_refreshed', 'System', 'Dashboard insights refreshed via AI analytic engine');
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadNotifications = useCallback(async () => {
    const data = await notificationService.getNotifications();
    setNotifications(data);
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    loadNotifications();
    window.addEventListener('riskeez_notifications_updated', loadNotifications);
    return () => window.removeEventListener('riskeez_notifications_updated', loadNotifications);
  }, [loadNotifications]);

  const markRead = async (id: string) => {
    await notificationService.markNotificationRead(id);
    loadNotifications();
  };

  const clearAllNotifications = async () => {
    if (confirm(t('notifications.confirmClear'))) {
      await notificationService.clearNotifications();
      loadNotifications();
      info(t('notifications.cleared'), t('notifications.clearedDesc'));
    }
  };

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

  const faqItems: Array<{ q: string; a: string }> = getTranslation(language).faq?.items || [];

  const levelColor = (level: string) => {
    const l = level?.toLowerCase();
    if (l === 'critical') return 'text-rose-600';
    if (l === 'high') return 'text-orange-500';
    if (l === 'medium') return 'text-amber-500';
    return 'text-emerald-600';
  };

  const levelBg = (level: string) => {
    const l = level?.toLowerCase();
    if (l === 'critical') return 'bg-rose-50 border-rose-100 text-rose-700';
    if (l === 'high') return 'bg-orange-50 border-orange-100 text-orange-700';
    if (l === 'medium') return 'bg-amber-50 border-amber-100 text-amber-700';
    return 'bg-emerald-50 border-emerald-100 text-emerald-700';
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={t('nav.dashboard')}
        subtitle={`${t('dashboard.description')} ${t('dashboard.forOrg')} ${organization?.name || ''}`}
        actions={
          <>
            <Button variant="secondary" icon={Bell} onClick={() => setIsNotificationsOpen(true)} className="relative h-11 w-11 p-0 rounded-2xl">
               {unreadCount > 0 && (
                 <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white tabular-nums">
                    {unreadCount}
                 </span>
               )}
            </Button>
            <Button variant="secondary" icon={HelpCircle} onClick={() => setIsFAQOpen(true)} className="h-11 w-11 p-0 rounded-2xl" />
            <Button variant="secondary" icon={FileText} onClick={() => setIsExecSummaryOpen(true)}>{t('dashboard.executiveSummary')}</Button>
            <Button icon={Plus} onClick={() => rrNavigate('/assessments')}>{t('dashboard.startAssessment')}</Button>
          </>
        }
      />

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center">
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
        {summaryLoading && <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">{t('common.loading')}...</span>}
        {summaryError && <span className="text-[10px] text-rose-500 font-bold">{summaryError}</span>}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-8 gap-4">
        <div className="lg:col-span-2 bg-brand rounded-[2.5rem] p-8 text-white shadow-saas-lg relative overflow-hidden group border border-brand-light">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('dashboard.postureSummary')}</p>
              <div className="flex items-baseline gap-3 mt-2">
                <h2 className="text-6xl font-black text-white tabular-nums">{avgScore}</h2>
                <span className="text-sm font-bold text-slate-400 opacity-60">/ 100</span>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <Badge color={avgScore > 75 ? 'red' : avgScore > 40 ? 'yellow' : 'green'}>
                {getOverallRiskLevel(avgScore)} LEVEL
              </Badge>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" strokeWidth={3} /> {t('dashboard.improving')}
              </div>
            </div>
          </div>
          <Shield className="absolute -right-8 -bottom-8 text-white/5 w-48 h-48 rotate-12" />
        </div>

        {/* Clickable stat cards */}
        <button
          onClick={() => navigateToRisks({ severity: 'Critical' })}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all text-left group"
        >
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('common.critical')}</p>
          <h3 className="text-4xl font-black mt-2 text-rose-600 tabular-nums group-hover:scale-105 transition-transform">{criticalCount}</h3>
          <div className="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(criticalCount / Math.max(totalRisks, 1)) * 100}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">{t('dashboard.clickToFilter')}</p>
        </button>

        <button
          onClick={() => navigateToRisks({ severity: 'High' })}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-left group"
        >
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('common.high')}</p>
          <h3 className="text-4xl font-black mt-2 text-orange-500 tabular-nums group-hover:scale-105 transition-transform">{highCount}</h3>
          <div className="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(highCount / Math.max(totalRisks, 1)) * 100}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">{t('riskRegister.severity')}</p>
        </button>

        <button
          onClick={() => navigateToRisks({ status: 'Open' })}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all text-left group"
        >
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('common.open')}</p>
          <h3 className="text-4xl font-black mt-2 text-slate-800 tabular-nums group-hover:scale-105 transition-transform">{openCount}</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">{t('nav.riskRegister')}</p>
        </button>

        <button
          onClick={() => navigateToRisks({ status: 'Mitigated' })}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left group"
        >
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('dashboard.resolved')}</p>
          <h3 className="text-4xl font-black mt-2 text-emerald-600 tabular-nums group-hover:scale-105 transition-transform">{resolvedCount}</h3>
          <div className="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(resolvedCount / Math.max(totalRisks, 1)) * 100}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">{t('dashboard.resolvedRisks')}</p>
        </button>

        <button
          onClick={() => navigateToRisks({ status: 'In Progress' })}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-left group"
        >
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('dashboard.unresolved')}</p>
          <h3 className="text-4xl font-black mt-2 text-amber-600 tabular-nums group-hover:scale-105 transition-transform">{unresolvedCount}</h3>
          <div className="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(unresolvedCount / Math.max(totalRisks, 1)) * 100}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">{t('dashboard.unresolvedRisks')}</p>
        </button>

        <button
          onClick={() => navigateToRisks({ overdue: 'true' })}
          className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all text-left group"
        >
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('dashboard.overdue')}</p>
          <h3 className={`text-4xl font-black mt-2 tabular-nums group-hover:scale-105 transition-transform ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
            {String(overdueCount).padStart(2, '0')}
          </h3>
          <p className="text-[10px] text-rose-500 font-bold mt-4 uppercase tracking-widest">{t('dashboard.actionRequired')}</p>
        </button>
      </div>

      {/* ── 3. Time Series Analytics (visible near top) ── */}
      <DashboardTimeSeries
        setActiveTab={(tab) => rrNavigate(`/${tab === 'risks' ? 'risks' : tab}`)}
        departments={departmentSummary.map(d => d.department)}
        owners={Array.from(new Set(risks.map((r: any) => r.owner))).filter(Boolean) as string[]}
      />

      {/* ── 4. Risk Map + Right sidebar (side by side on xl) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Risk Map */}
        <div className="xl:col-span-5">
          <DashboardRiskMap riskMap={riskMap} navigateToRisks={navigateToRisks} />
        </div>

        {/* Right sidebar: AI panel + actions + mini charts */}
        <div className="xl:col-span-7 space-y-6">
          {/* AI Insights panel */}
          <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 flex flex-col relative overflow-hidden group shadow-saas-lg">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-accent/20 rounded-2xl flex items-center justify-center text-accent shadow-sm border border-accent/20">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-accent/80">{t('dashboard.intelligenceSnapshot')}</h4>
              </div>
              <h3 className="text-xl font-black mb-4 leading-tight text-white">{t('dashboard.postureSummary')}</h3>
              <p className="text-sm text-slate-300 font-medium leading-relaxed italic pr-4">{aiSummary}</p>
              <div className="mt-8 pt-8 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black opacity-40 uppercase tracking-widest text-slate-400">{t('dashboard.analyticEngine')}</p>
                  <p className="text-xs font-black text-emerald-400">{isAnalyzing ? t('riskRegister.thinking') : t('dashboard.operational')}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isAnalyzing}
                  onClick={handleReanalyze}
                  className="h-10 px-8 rounded-xl font-black text-[10px] shadow-glow-accent bg-accent border-none text-white hover:scale-105 transition-transform"
                >
                  {isAnalyzing ? t('riskRegister.thinking') : t('dashboard.refreshInsights')}
                </Button>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
          </div>

          {/* Mini charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title={t('dashboard.distributionByCategory')} subtitle={t('dashboard.riskSurfaceArea')}>
              <div className="h-[200px] pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 16, right: 16, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={72} tick={{ fontSize: 9, fill: '#64748B', fontWeight: 700 }} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
                      {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
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
          </div>

          {/* Quick actions */}
          <Card title={t('common.actions')}>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => rrNavigate('/assessments')} className="flex items-center justify-between p-5 rounded-[2rem] border border-slate-100 hover:border-accent hover:shadow-saas transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white transition-all shadow-inner shrink-0">
                    <Plus size={18} />
                  </div>
                  <p className="text-xs font-black text-slate-900 leading-tight">{t('dashboard.startAssessment')}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-accent transition-all shrink-0" />
              </button>
              <button onClick={() => rrNavigate('/risks')} className="flex items-center justify-between p-5 rounded-[2rem] border border-slate-100 hover:border-accent hover:shadow-saas transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white transition-all shadow-inner shrink-0">
                    <ShieldAlert size={18} />
                  </div>
                  <p className="text-xs font-black text-slate-900 leading-tight">{t('nav.riskRegister')}</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:text-accent transition-all shrink-0" />
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* ── 5. Top 5 Risks (full width) ── */}
      <Card title={t('dashboard.top5Title')} noPadding>
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
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => navigateToRisks({ id: r.id })}>
                  <td className="px-6 py-4"><p className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors">{r.title}</p></td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-bold">{r.department || '—'}</td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-bold">{r.owner || '—'}</td>
                  <td className="px-4 py-4 text-center font-black text-slate-700 tabular-nums">{r.score}</td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-bold">{r.status}</td>
                  <td className="px-4 py-4 text-xs text-slate-400 font-bold tabular-nums">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-4 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest ${levelBg(r.level)}`}>{r.level}</span>
                  </td>
                </tr>
              )) : risks.slice(0, 5).sort((a: any, b: any) => b.score - a.score).map((r: Risk) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => navigateToRisks({ severity: r.level })}>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors">{r.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{r.category}</p>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-bold">{(r as any).department || '—'}</td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-bold">{r.owner}</td>
                  <td className="px-4 py-4 text-center font-black text-slate-700 tabular-nums">{r.score}</td>
                  <td className="px-4 py-4 text-xs text-slate-500 font-bold">{r.status}</td>
                  <td className="px-4 py-4 text-xs text-slate-400 font-bold tabular-nums">{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-4 text-right"><RiskBadge level={r.level} /></td>
                </tr>
              ))}
              {risks.length === 0 && top5Risks.length === 0 && (
                <tr><td colSpan={7} className="px-8 py-12 text-center text-sm text-slate-400 font-bold">{t('common.noData')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 6. Department Summary ── */}
      {departmentSummary.length > 0 && (
        <Card title={t('dashboard.departmentRisks')} subtitle={t('dashboard.clickToFilter')} noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-50 bg-slate-50/30">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.department')}</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('riskRegister.totalRisks')}</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('dashboard.resolved')}</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('dashboard.unresolved')}</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('common.critical')}</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('dashboard.overdue')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {departmentSummary.map((dept) => (
                  <tr key={dept.department} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => navigateToRisks({ department: dept.department })}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Building2 size={14} className="text-slate-300 group-hover:text-accent transition-colors" />
                        <span className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors">{dept.department}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center font-black text-slate-700 tabular-nums">{dept.total}</td>
                    <td className="px-4 py-4 text-center"><span className="font-black text-emerald-600 tabular-nums">{dept.resolved}</span></td>
                    <td className="px-4 py-4 text-center"><span className="font-black text-amber-600 tabular-nums">{dept.unresolved}</span></td>
                    <td className="px-4 py-4 text-center"><span className={`font-black tabular-nums ${dept.critical > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{dept.critical}</span></td>
                    <td className="px-4 py-4 text-center"><span className={`font-black tabular-nums ${dept.overdue > 0 ? 'text-rose-500' : 'text-slate-300'}`}>{dept.overdue}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Executive Summary Modal */}
      <Modal
        isOpen={isExecSummaryOpen}
        onClose={() => setIsExecSummaryOpen(false)}
        title={t('dashboard.executiveSummary')}
        subtitle={t('dashboard.strategicOverview')}
      >
        <div className="space-y-8">
          <div className="p-6 bg-slate-900 rounded-3xl text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('dashboard.currentHealthScore')}</p>
            <div className="flex items-baseline gap-4">
              <h3 className="text-4xl font-black mt-2">{avgScore}%</h3>
              <RiskBadge level={getOverallRiskLevel(avgScore)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 text-rose-900">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('dashboard.criticalFindings')}</p>
              <p className="text-2xl font-black mt-1">{criticalCount}</p>
            </div>
            <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 text-orange-900">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('dashboard.highPriority')}</p>
              <p className="text-2xl font-black mt-1">{highCount}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">{t('dashboard.strategicPosture')}</h4>
            <div className="prose prose-slate max-w-none">
              <p className="text-sm text-slate-600 leading-relaxed">
                The organization currently operates at a <strong>{getOverallRiskLevel(avgScore).toLowerCase()}</strong> risk level.
                Immediate focus is required on the <strong>{risks[0]?.category || 'IT Security'}</strong> domain where most critical
                findings have been registered.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mt-4 italic font-medium bg-slate-50 p-4 rounded-xl border-l-4 border-slate-200">
                "{aiSummary.replace(/"/g, '')}"
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex gap-4">
            <Button className="flex-1" icon={Download} onClick={() => window.print()}>{t('reports.downloadPdf')}</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setIsExecSummaryOpen(false)}>{t('common.close')}</Button>
          </div>
        </div>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
      >
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell size={48} className="mx-auto text-slate-100 mb-4" />
              <p className="text-sm font-bold text-slate-400">{t('notifications.empty')}</p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {t('notifications.alerts').replace('{{count}}', String(notifications.length))}
                </p>
                <button onClick={clearAllNotifications} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">{t('notifications.clearAll')}</button>
              </div>
              <div className="space-y-3">
                {notifications.map(n => (
                  <div key={n.id} className={`p-5 rounded-2xl border ${n.read ? 'bg-white border-slate-100' : 'bg-slate-50 border-accent/20 shadow-sm'} transition-all`}>
                    <div className="flex justify-between gap-4">
                      <div className="flex gap-4">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'error' ? 'bg-rose-500' : n.type === 'warning' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                        <div>
                          <p className={`text-sm font-black ${n.read ? 'text-slate-600' : 'text-slate-900'}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-300 font-bold mt-2 tabular-nums">{new Date(n.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                      {!n.read && (
                        <button onClick={() => markRead(n.id)} className="text-accent hover:text-accent-hover p-1">
                          <CheckCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* FAQ Modal */}
      <Modal
        isOpen={isFAQOpen}
        onClose={() => setIsFAQOpen(false)}
        title={t('faq.title')}
        subtitle={t('faq.subtitle')}
      >
        <div className="space-y-6">
          <div className="relative">
            <input
              type="text"
              placeholder={t('faq.searchPlaceholder')}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-3 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
              value={faqSearch}
              onChange={e => setFaqSearch(e.target.value)}
            />
            <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 rotate-45" size={18} />
          </div>

          <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
            {faqItems
              .filter(f =>
                f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
                f.a.toLowerCase().includes(faqSearch.toLowerCase())
              )
              .map((item, i) => (
                <div key={i} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-sm font-black text-slate-900 leading-tight">Q: {item.q}</p>
                  <p className="text-sm text-slate-600 mt-2 font-medium leading-relaxed">A: {item.a}</p>
                </div>
              ))
            }
            {faqItems.filter(f =>
              f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
              f.a.toLowerCase().includes(faqSearch.toLowerCase())
            ).length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400 font-bold">{t('common.noData')}</div>
            )}
          </div>

          <div className="p-6 bg-slate-900 rounded-[2rem] text-slate-400 text-[10px] font-bold leading-relaxed">
            <p className="uppercase tracking-widest text-white mb-2">{t('faq.disclaimerTitle')}</p>
            {t('faq.disclaimer')}
          </div>
        </div>
      </Modal>
    </div>
  );
};
