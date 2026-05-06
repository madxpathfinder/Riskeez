import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Download,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  LayoutDashboard,
  ShieldCheck as Shield
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
import { Badge, Button, Card, PageHeader, StatCard, RiskBadge, Modal } from '../common';
import { RiskStatus, AssessmentStatus, RiskLevel, Risk } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { aiService, AIResponse } from '../../services/aiService';
import { auditLogService } from '../../services/auditLogService';
import { notificationService } from '../../services/notificationService';
import { NotificationType } from '../../types/notification';
import { Notification } from '../../types/notification';
import { FileText, Bell, HelpCircle, CheckCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';
import { dashboardService, DashboardSummary } from '../../services/dashboardService';
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

  // Clear sub-breadcrumb when Dashboard mounts
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

  // API summary state
  const [apiSummary, setApiSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Load dashboard summary from API when in api mode
  useEffect(() => {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      setSummaryLoading(true);
      dashboardService.getDashboardSummary()
        .then(data => {
          setApiSummary(data);
          setSummaryError(null);
        })
        .catch(() => setSummaryError('Failed to load dashboard data'))
        .finally(() => setSummaryLoading(false));
    }
  }, []);

  // Derived counts — prefer API data when available
  const criticalCount = apiSummary ? apiSummary.risksBySeverity.critical : risks.filter((r: any) => r.level === RiskLevel.CRITICAL).length;
  const highCount = apiSummary ? apiSummary.risksBySeverity.high : risks.filter((r: any) => r.level === RiskLevel.HIGH).length;
  const mediumCount = apiSummary ? apiSummary.risksBySeverity.medium : risks.filter((r: any) => r.level === RiskLevel.MEDIUM).length;
  const lowCount = apiSummary ? apiSummary.risksBySeverity.low : risks.filter((r: any) => r.level === RiskLevel.LOW).length;
  const openCount = apiSummary ? apiSummary.openRisks : risks.filter((r: any) => r.status === RiskStatus.OPEN).length;
  const overdueCount = apiSummary ? apiSummary.overdueRisks : 0;
  const totalRisks = apiSummary ? apiSummary.totalRisks : risks.length;

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
      await notificationService.addNotification({
        title: t('notifications.insightsTitle'),
        message: t('notifications.insightsMessage'),
        type: NotificationType.SUCCESS
      });
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
    handleReanalyze();
    loadNotifications();
    window.addEventListener('riskeez_notifications_updated', loadNotifications);
    return () => window.removeEventListener('riskeez_notifications_updated', loadNotifications);
  }, []);

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
    { name: 'Critical', value: criticalCount, color: '#DC2626' },
    { name: 'High', value: highCount, color: '#EA580C' },
    { name: 'Medium', value: mediumCount, color: '#D97706' },
    { name: 'Low', value: lowCount, color: '#059669' },
  ];

  const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

  // FAQ items from i18n — accessed directly since t() only handles strings
  const faqItems: Array<{ q: string; a: string }> = getTranslation(language).faq?.items || [];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        title={t('nav.dashboard')}
        subtitle={`${t('dashboard.description')} for ${organization?.name || 'your organization'}`}
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
            <Button icon={Plus} onClick={() => setActiveTab('assessments')}>{t('dashboard.startAssessment')}</Button>
          </>
        }
      />

      {/* Loading / error state for API summary */}
      {summaryLoading && (
        <div className="text-center py-4 text-sm text-slate-400 font-bold uppercase tracking-widest">{t('common.loading')}...</div>
      )}
      {summaryError && (
        <div className="text-center py-4 text-sm text-rose-500 font-bold">{summaryError}</div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-md transition-all">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('common.critical')}</p>
          <h3 className="text-4xl font-black mt-2 text-rose-600 tabular-nums">{criticalCount}</h3>
          <div className="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
             <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(criticalCount / Math.max(totalRisks, 1)) * 100}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">{t('common.status')}</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('common.high')}</p>
          <h3 className="text-4xl font-black mt-2 text-orange-500 tabular-nums">{highCount}</h3>
          <div className="mt-4 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
             <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(highCount / Math.max(totalRisks, 1)) * 100}%` }} />
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">{t('riskRegister.severity')}</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('common.open')}</p>
          <h3 className="text-4xl font-black mt-2 text-slate-800 tabular-nums">{openCount}</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">{t('nav.riskRegister')}</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('dashboard.overdue')}</p>
          <h3 className={`text-4xl font-black mt-2 tabular-nums ${overdueCount > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
            {String(overdueCount).padStart(2, '0')}
          </h3>
          <p className="text-[10px] text-rose-500 font-bold mt-4 uppercase tracking-widest">{t('dashboard.actionRequired')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title={t('dashboard.distributionByCategory')} subtitle="Risk surface area analysis">
              <div className="h-[280px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 20, right: 20, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={80}
                      tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }}
                    />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title={t('dashboard.intelligenceSnapshot')} subtitle="Severity breakdown of identified issues">
              <div className="h-[280px] flex items-center">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={levelData}
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={8}
                        dataKey="value"
                        stroke="none"
                      >
                        {levelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                 </ResponsiveContainer>
                 <div className="space-y-3 pr-8">
                    {levelData.map(l => (
                      <div key={l.name} className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{l.name} ({l.value})</span>
                      </div>
                    ))}
                 </div>
              </div>
            </Card>
          </div>

          <Card title={t('dashboard.topRisks')} noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/30">
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.title')}</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('common.score')}</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('common.severity')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {risks.slice(0, 5).map((r: Risk) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                      <td className="px-8 py-5">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-accent transition-colors">{r.title}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{r.category}</p>
                      </td>
                      <td className="px-4 py-5 text-center font-black text-slate-700 tabular-nums">{r.score}</td>
                      <td className="px-6 py-5 text-right">
                        <RiskBadge level={r.level} />
                      </td>
                    </tr>
                  ))}
                  {risks.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-8 py-12 text-center text-sm text-slate-400 font-bold">{t('common.noData')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 flex flex-col relative overflow-hidden group shadow-saas-lg">
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                   <div className="w-10 h-10 bg-accent/20 rounded-2xl flex items-center justify-center text-accent shadow-sm border border-accent/20">
                      <ShieldCheck size={20} />
                   </div>
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-accent/80">{t('dashboard.intelligenceSnapshot')}</h4>
                </div>
                <h3 className="text-xl font-black mb-4 leading-tight text-white">{t('dashboard.postureSummary')}</h3>
                <p className="text-sm text-slate-300 font-medium leading-relaxed italic pr-4">
                  {aiSummary}
                </p>
                <div className="mt-8 pt-8 border-t border-slate-800 flex items-center justify-between">
                   <div>
                      <p className="text-[10px] font-black opacity-40 uppercase tracking-widest text-slate-400 font-bold">Analytic Engine</p>
                      <p className="text-xs font-black text-emerald-400">{isAnalyzing ? t('riskRegister.thinking') : 'Operational'}</p>
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

          <Card title={t('common.actions')}>
             <div className="space-y-3">
                <button onClick={() => setActiveTab('assessments')} className="w-full flex items-center justify-between p-5 rounded-[2rem] border border-slate-100 hover:border-accent hover:shadow-saas transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white transition-all shadow-inner">
                         <Plus size={22} />
                      </div>
                      <div className="text-left">
                         <p className="text-sm font-black text-slate-900">{t('dashboard.startAssessment')}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('nav.assessments')}</p>
                      </div>
                   </div>
                   <ArrowRight size={18} className="text-slate-300 group-hover:text-accent translate-x-0 group-hover:translate-x-1.5 transition-all" />
                </button>
                <button onClick={() => setActiveTab('risks')} className="w-full flex items-center justify-between p-5 rounded-[2rem] border border-slate-100 hover:border-accent hover:shadow-saas transition-all group">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white transition-all shadow-inner">
                         <ShieldAlert size={22} />
                      </div>
                      <div className="text-left">
                         <p className="text-sm font-black text-slate-900">{t('nav.riskRegister')}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">View findings</p>
                      </div>
                   </div>
                   <ArrowRight size={18} className="text-slate-300 group-hover:text-accent translate-x-0 group-hover:translate-x-1.5 transition-all" />
                </button>
             </div>
          </Card>
        </div>
      </div>

      {/* Executive Summary Modal */}
      <Modal
        isOpen={isExecSummaryOpen}
        onClose={() => setIsExecSummaryOpen(false)}
        title={t('dashboard.executiveSummary')}
        subtitle="Strategic overview of organization risk posture"
      >
        <div className="space-y-8">
           <div className="p-6 bg-slate-900 rounded-3xl text-white">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Health Score</p>
              <div className="flex items-baseline gap-4">
                <h3 className="text-4xl font-black mt-2">{avgScore}%</h3>
                <RiskBadge level={getOverallRiskLevel(avgScore)} />
              </div>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 text-rose-900">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('common.critical')} Findings</p>
                 <p className="text-2xl font-black mt-1">{criticalCount}</p>
              </div>
              <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100 text-orange-900">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{t('common.high')} Priority</p>
                 <p className="text-2xl font-black mt-1">{highCount}</p>
              </div>
           </div>

           <div className="space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Strategic Posture</h4>
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
