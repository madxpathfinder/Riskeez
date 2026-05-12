import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Plus, Download, Printer, 
  ExternalLink, TrendingUp, ShieldCheck, 
  AlertTriangle, ArrowRight, X, Clock,
  PieChart as PieIcon, LayoutDashboard,
  Search, Filter, Trash2, Brain, CheckSquare,
  ChevronRight, Save, Info, ShieldAlert,
  Calendar, User, FileBarChart, SearchX
} from 'lucide-react';
import { format } from 'date-fns';
import { Card, Button, Badge, EmptyState, PageHeader, Breadcrumbs, TableSkeleton, ConfirmDialog } from '../common';
import { RiskLevel, RiskStatus } from '../../types';
import { reportService, Report } from '../../services/reportService';
import { auditLogService } from '../../services/auditLogService';
import { AIFrontService } from '../../services/aiFrontService';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { Permission } from '../../services/permissionService';

export const ReportsPage = ({ store, onNavigate }: any) => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const { risks, assessments, controls, documents } = store;
  const { success, error: toastError } = useToast();
  const canCreate = hasPermission(Permission.REPORTS_CREATE);
  const canDelete = hasPermission(Permission.REPORTS_DELETE);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Report Generation State
  const [newReportTitle, setNewReportTitle] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [reportOptions, setReportOptions] = useState({
    includeRiskRegister: true,
    includeEvidence: true,
    includePlan: true,
    includeAISummary: true
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const data = await reportService.getReports();
      setReports(data);
    } catch (err: any) {
      toastError(t('reports.fetchErrorTitle'), err?.message || t('reports.fetchError'));
    } finally {
      setReportsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedAssessmentId || !newReportTitle) return;
    
    setIsLoading(true);
    try {
      const assessment = assessments.find((a: any) => a.id === selectedAssessmentId);
      const scoreAverage = risks.length > 0 ? risks.reduce((acc: number, r: any) => acc + (r.score || 0), 0) / risks.length : 0;
      
      let executiveSummary = t('reports.defaultExecSummary');
      
      if (reportOptions.includeAISummary) {
        const context = {
          assessmentTitle: assessment?.title,
          riskCount: risks.length,
          criticalRiskCount: risks.filter((r: any) => r.level === RiskLevel.CRITICAL).length,
          controlCount: controls.length,
          docCount: documents.length,
          topRisks: risks.sort((a: any, b: any) => b.score - a.score).slice(0, 3).map((r: any) => r.title)
        };
        
        const response = await AIFrontService.generate('executive_summary', context);
        executiveSummary = response.summary || response.answer || executiveSummary;
      }

      const report = await reportService.createReport({
        title: newReportTitle,
        assessmentId: selectedAssessmentId,
        overallScore: Math.round(scoreAverage * 10) / 10,
        riskLevel: scoreAverage > 15 ? 'Critical' : scoreAverage > 10 ? 'High' : scoreAverage > 5 ? 'Medium' : 'Low',
        createdBy: 'Administrator',
        config: reportOptions,
        content: {
          executiveSummary,
          risks: risks.sort((a: any, b: any) => b.score - a.score).slice(0, 5),
          recommendations: [
            t('reports.rec1'),
            t('reports.rec2'),
            t('reports.rec3'),
          ]
        }
      });

      await fetchReports();
      success(t('reports.reportFinalized'), t('reports.reportFinalizedDesc').replace('{title}', newReportTitle));
      await auditLogService.log('report_generated', 'Reporting', `Generated intelligence report: ${newReportTitle}`);
      setShowGenerateModal(false);
      setSelectedReport(report);
    } catch (err) {
      toastError(t('reports.generationFailed'), t('reports.generationFailedDesc'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const report = reports.find(r => r.id === deleteConfirmId);
      await reportService.deleteReport(deleteConfirmId);
      await fetchReports();
      success(t('reports.reportExpunged'), t('reports.reportExpungedDesc'));
      await auditLogService.log('report_deleted', 'Reporting', `Deleted report: ${report?.title || deleteConfirmId}`);
    } catch (err) {
      toastError(t('reports.deletionInhibited'), t('reports.deletionInhibitedDesc'));
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handlePrint = async (report: Report) => {
    await auditLogService.log('report_printed', 'Reporting', `Generated print stream for: ${report.title}`);
    window.print();
  };

  const handleExport = async (report: Report) => {
    await auditLogService.log('report_exported', 'Reporting', `Data extract triggered: ${report.title}`);
    success(t('reports.exportSeeded'), t('reports.exportSeededDesc'));
  };

  const viewReport = async (report: Report) => {
    setSelectedReport(report);
    await auditLogService.log('report_viewed', 'Reporting', `Access log: ${report.title}`);
  };

  return (
    <div className="space-y-8 pb-20 print:p-0">
      <div className="print:hidden">
        <Breadcrumbs onHomeClick={() => onNavigate('dashboard')} items={[{ label: t('nav.reports') }, { label: t('reports.formalArchives') }]} />
        <PageHeader
          title={t('reports.title')}
          subtitle={t('reports.subtitle')}
          actions={
            canCreate ? <Button icon={Plus} onClick={() => setShowGenerateModal(true)} className="font-black shadow-saas h-11">{t('reports.generateNewReport')}</Button> : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 print:hidden">
         {[
            { l: t('reports.archivedReports'), v: reports.length, i: FileBarChart, c: 'blue' },
            { l: t('reports.aggregatedExposure'), v: reports.length > 0 ? reports[0].overallScore : '0.0', i: ShieldAlert, c: 'rose' },
            { l: t('reports.remediationVelocity'), v: 'Strategic', i: TrendingUp, c: 'amber' },
            { l: t('reports.governanceHealth'), v: '84%', i: ShieldCheck, c: 'emerald' }
         ].map((stat, i) => (
           <Card key={i} className="hover:shadow-saas transition-all border-slate-100/50 bg-white shadow-sm rounded-[2rem]">
              <div className="flex items-center gap-5">
                 <div className={`shrink-0 w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-accent group-hover:bg-accent/10 transition-colors`}>
                    <stat.i size={24} strokeWidth={2.5} />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.l}</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">{stat.v}</p>
                 </div>
              </div>
           </Card>
         ))}
      </div>

      <Card noPadding className="print:hidden overflow-hidden shadow-saas rounded-[2.5rem] border-slate-100 bg-white">
         {reportsLoading ? (
           <TableSkeleton rows={5} />
         ) : reports.length > 0 ? (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="pl-10 pr-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[350px]">{t('reports.title')} &amp; {t('reports.originLabel')}</th>
                        <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.scopeBasis')}</th>
                        <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('reports.scoreProfile')}</th>
                        <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('common.severity')}</th>
                        <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.archiveDate')}</th>
                        <th className="pl-4 pr-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('common.actions')}</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {reports.map((report: Report) => (
                       <tr key={report.id} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="pl-10 pr-4 py-8" onClick={() => viewReport(report)}>
                             <div className="flex items-center gap-5 cursor-pointer">
                                <div className="shrink-0 w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-accent group-hover:bg-accent/5 transition-all shadow-inner">
                                   <FileText size={22} />
                                </div>
                                <div className="max-w-[280px]">
                                   <p className="font-black text-slate-900 group-hover:text-accent transition-colors text-sm truncate">{report.title}</p>
                                   <p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-widest">{t('reports.originLabel')}: {report.createdBy}</p>
                                </div>
                             </div>
                          </td>
                          <td className="px-4 py-8 text-xs font-black text-slate-500 uppercase tracking-tighter cursor-pointer" onClick={() => viewReport(report)}>
                             <div className="bg-slate-100 px-3 py-1 rounded-lg inline-block">
                                {assessments.find((a: any) => a.id === report.assessmentId)?.title || t('reports.globalReview')}
                             </div>
                          </td>
                          <td className="px-4 py-8 text-center font-black text-slate-700 tabular-nums text-sm">
                             {report.overallScore} <span className="text-slate-300">/ 25</span>
                          </td>
                          <td className="px-4 py-8 text-center">
                             <Badge color={report.riskLevel === 'Critical' || report.riskLevel === 'High' ? 'red' : 'green'} className="tracking-[0.1em]">
                                {report.riskLevel}
                             </Badge>
                          </td>
                          <td className="px-4 py-8 font-black text-[11px] text-slate-400 tabular-nums uppercase whitespace-nowrap">
                             {format(new Date(report.createdAt), 'MMM dd, yyyy')}
                          </td>
                          <td className="pl-4 pr-10 py-8 text-right">
                             <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all">
                                <Button variant="ghost" size="sm" icon={ExternalLink} onClick={() => viewReport(report)} title="View Detail" className="w-10 h-10 p-0 rounded-xl bg-white border border-slate-100" />
                                <Button variant="ghost" size="sm" icon={Printer} onClick={() => handlePrint(report)} title="Print Stream" className="w-10 h-10 p-0 rounded-xl bg-white border border-slate-100" />
                                {canDelete && <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setDeleteConfirmId(report.id)} title="Purge Archive" className="w-10 h-10 p-0 rounded-xl bg-white border border-slate-100 text-rose-400 hover:bg-rose-50 hover:border-rose-100" />}
                             </div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         ) : (
            <div className="py-24">
              <EmptyState
                icon={SearchX}
                title={t('reports.archiveEmpty')}
                description={t('reports.archiveEmptyDesc')}
                onAction={canCreate ? () => setShowGenerateModal(true) : undefined}
                actionLabel={t('reports.generateInitial')}
              />
            </div>
         )}
      </Card>

      <AnimatePresence>
         {showGenerateModal && (
           <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
              >
                  <div className="px-10 py-9 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t('reports.generateReport')}</h3>
                        <p className="text-[11px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">{t('reports.subtitle')}</p>
                     </div>
                     <button onClick={() => setShowGenerateModal(false)} className="w-12 h-12 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-2xl transition-all text-slate-400">
                        <X size={20} />
                     </button>
                  </div>
                  
                  <div className="p-10 space-y-10">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('reports.reportTitle')}</label>
                        <input
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4.5 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all outline-none"
                          placeholder={t('reports.reportTitlePlaceholder')}
                          value={newReportTitle}
                          onChange={e => setNewReportTitle(e.target.value)}
                        />
                     </div>

                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('reports.focusScope')}</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4.5 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all outline-none appearance-none"
                          value={selectedAssessmentId}
                          onChange={e => setSelectedAssessmentId(e.target.value)}
                        >
                           <option value="">{t('reports.selectAssessment')}</option>
                           {assessments.map((a: any) => <option key={a.id} value={a.id}>{a.title}</option>)}
                        </select>
                     </div>

                     <div className="space-y-6">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('reports.extractionComponents')}</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {[
                             { id: 'includeRiskRegister', label: t('reports.riskProtocol'), icon: FileText },
                             { id: 'includeEvidence', label: t('reports.artifactGaps'), icon: CheckSquare },
                             { id: 'includePlan', label: t('reports.remedationRoadmap'), icon: TrendingUp },
                             { id: 'includeAISummary', label: t('reports.aiSynthesis'), icon: Brain },
                           ].map((opt) => (
                             <button 
                                key={opt.id}
                                onClick={() => setReportOptions({ ...reportOptions, [opt.id]: !((reportOptions as any)[opt.id]) })}
                                className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all group ${
                                  (reportOptions as any)[opt.id] 
                                    ? 'bg-accent/5 border-accent text-accent' 
                                    : 'bg-white border-slate-50 text-slate-400 hover:border-slate-200'
                                }`}
                             >
                                <opt.icon size={20} className={(reportOptions as any)[opt.id] ? 'text-accent' : 'text-slate-300 group-hover:text-slate-400'} />
                                <span className="text-xs font-black uppercase tracking-tight">{opt.label}</span>
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="px-10 py-9 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
                     <Button variant="ghost" onClick={() => setShowGenerateModal(false)} className="h-14 px-8 font-black">{t('reports.abort')}</Button>
                     <Button
                       className="h-14 px-10 font-black shadow-glow-accent"
                       onClick={handleGenerate}
                       loading={isLoading}
                       disabled={!newReportTitle || !selectedAssessmentId}
                     >
                        {t('reports.generateAndFinalize')}
                     </Button>
                  </div>
              </motion.div>
           </div>
         )}
      </AnimatePresence>

      <AnimatePresence>
         {selectedReport && (
           <ReportDetailView 
             report={selectedReport} 
             onClose={() => setSelectedReport(null)} 
             store={store} 
             onPrint={() => handlePrint(selectedReport)}
             onExport={() => handleExport(selectedReport)}
           />
         )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title={t('reports.purgeTitle')}
        description={t('reports.purgeDescription')}
        confirmLabel={t('reports.permanentExpunge')}
        variant="danger"
      />
    </div>
  );
};

const ReportDetailView = ({ report, onClose, store, onPrint, onExport }: any) => {
  const { t } = useLanguage();
  const { appName } = useBranding();
  const { risks, assessments, controls, documents } = store;
  const assessment = assessments.find((a: any) => a.id === report.assessmentId);
  const criticalRisks = risks.filter((r: any) => r.level === 'Critical');
  const highRisks = risks.filter((r: any) => r.level === 'High');
  
  // Calculate distribution
  const distribution = [
    { label: t('common.critical'), count: criticalRisks.length, color: 'bg-rose-500' },
    { label: t('common.high'), count: highRisks.length, color: 'bg-orange-500' },
    { label: t('common.medium'), count: risks.filter((r: any) => r.level === 'Medium').length, color: 'bg-amber-500' },
    { label: t('common.low'), count: risks.filter((r: any) => r.level === 'Low').length, color: 'bg-emerald-500' }
  ];

  const totalRisks = risks.length || 1;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:bg-white print:p-0 print:block print:inset-auto print:z-0">
       <motion.div 
         initial={{ scale: 0.95, opacity: 0 }} 
         animate={{ scale: 1, opacity: 1 }} 
         className="bg-white border rounded-[40px] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:shadow-none print:max-h-none print:w-full print:rounded-none print:border-none"
       >
          <div className="p-10 border-b border-slate-100 flex items-center justify-between print:hidden bg-white/80 backdrop-blur sticky top-0 z-20">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-900 text-white rounded-[20px] flex items-center justify-center">
                   <FileText size={28} />
                </div>
                <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight">{report.title}</h2>
                   <div className="flex items-center gap-3 mt-1">
                      <Badge color="blue">{t('reports.governanceProtocol')}</Badge>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                         <Clock size={12} /> {t('reports.generatedOn')} {format(new Date(report.createdAt), 'MMMM dd, yyyy')}
                      </span>
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <Button variant="secondary" icon={Download} onClick={onExport}>{t('reports.exportRegister')}</Button>
                <Button variant="primary" icon={Printer} onClick={onPrint} className="bg-slate-900 text-white border-slate-900">{t('reports.printReport')}</Button>
                <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400"><X size={24} /></button>
             </div>
          </div>

          <div className="flex-grow overflow-y-auto no-scrollbar print:overflow-visible">
             <div className="max-w-4xl mx-auto p-12 lg:p-24 space-y-24 print:p-0 print:max-w-none">
                
                {/* Cover Page Header */}
                <div className="space-y-12 text-center py-12">
                   <div className="flex justify-center mb-8">
                      <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white ring-8 ring-slate-50">
                        <ShieldCheck size={40} strokeWidth={2.5} />
                      </div>
                   </div>
                   <div className="space-y-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-accent">{t('reports.boardReport')}</p>
                      <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-[1.1]">{report.title}</h1>
                      <p className="text-lg text-slate-500 font-bold max-w-xl mx-auto leading-relaxed">
                         {t('reports.reportSubtitle')} {assessment?.title || t('reports.reportSubtitleDefault')}.
                      </p>
                   </div>
                   <div className="flex items-center justify-center gap-12 pt-8">
                      <div className="text-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('reports.status')}</p>
                         <p className="text-sm font-black text-slate-900">{t('reports.finalized')}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-100" />
                      <div className="text-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('reports.authorLabel')}</p>
                         <p className="text-sm font-black text-slate-900">{report.createdBy}</p>
                      </div>
                      <div className="w-px h-8 bg-slate-100" />
                      <div className="text-center">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('reports.versionLabel')}</p>
                         <p className="text-sm font-black text-slate-900">v1.2.4</p>
                      </div>
                   </div>
                </div>

                {/* Score Summary Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 py-16 border-y border-slate-100 bg-slate-50/30 -mx-12 px-12 rounded-[4rem]">
                   <div className="space-y-6 text-center md:text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 justify-center md:justify-start">
                        <TrendingUp size={14} className="text-accent" /> {t('reports.overallExposure')}
                      </p>
                      <div className="flex items-baseline gap-2 justify-center md:justify-start">
                        <span className="text-6xl font-black text-slate-900 tracking-tighter">{report.overallScore}</span>
                        <span className="text-xl font-black text-slate-300">/ 25</span>
                      </div>
                      <Badge color={report.riskLevel === 'Critical' ? 'red' : 'orange'} className="h-7 px-4">
                        {report.riskLevel} {t('reports.hazard')}
                      </Badge>
                   </div>
                   
                   <div className="space-y-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">{t('reports.riskDistribution')}</p>
                      <div className="space-y-3">
                         {distribution.map(d => (
                            <div key={d.label} className="space-y-1.5">
                               <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                                  <span className="text-slate-500">{d.label}</span>
                                  <span className="text-slate-900">{d.count}</span>
                               </div>
                               <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${d.color} transition-all duration-1000 ease-out`} 
                                    style={{ width: `${(d.count / totalRisks) * 100}%` }}
                                  />
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-6 text-center md:text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.complianceHealth')}</p>
                      <div className="relative inline-flex items-center justify-center mx-auto md:mx-0">
                         <svg className="w-24 h-24 transform -rotate-90">
                            <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                            <circle className="text-emerald-500 transition-all duration-1000" strokeWidth="8" strokeDasharray={251.2} strokeDashoffset={251.2 * (1 - 0.72)} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="48" cy="48" />
                         </svg>
                         <span className="absolute text-xl font-black text-slate-900">72%</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 leading-tight">Current posture relative to SOC2 Maturity requirements.</p>
                   </div>
                </div>

                {/* Executive Summary */}
                <section className="space-y-8">
                   <div className="flex items-center gap-6">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight whitespace-nowrap">{t('reports.executiveSummary')}</h3>
                      <div className="h-px bg-slate-100 flex-grow" />
                   </div>
                   <div className="prose prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-[1.8] prose-p:text-lg prose-p:font-medium space-y-6">
                      <p className="first-letter:text-5xl first-letter:font-black first-letter:text-slate-900 first-letter:mr-3 first-letter:float-left">
                        {report.content?.executiveSummary}
                      </p>
                      {!report.config.includeAISummary && (
                        <p>{t('reports.riskLandscapePara')}</p>
                      )}
                      <p className="bg-slate-50 border border-slate-100 p-8 rounded-[2rem] text-slate-500 italic text-base">
                         "{t('reports.analysisDisclaimer')}"
                      </p>
                   </div>
                </section>

                {/* Critical Risks & Findings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                   <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                          <ShieldAlert size={20} />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('reports.criticalExposures')}</h4>
                      </div>
                      <div className="space-y-4">
                         {report.content?.risks?.slice(0, 3).map((r: any) => (
                           <div key={r.id} className="group p-6 bg-white border border-slate-100 rounded-3xl hover:border-rose-200 transition-all shadow-sm">
                              <div className="flex justify-between items-start mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{r.category}</span>
                                <Badge color="red" className="font-bold">Score: {r.score}</Badge>
                              </div>
                              <p className="font-black text-slate-900 text-lg group-hover:text-rose-500 transition-colors">{r.title}</p>
                              <p className="text-xs text-slate-500 font-bold mt-2 line-clamp-2 leading-relaxed">{r.description}</p>
                              <div className="flex items-center gap-2 mt-4 text-[10px] font-black uppercase text-slate-400">
                                <Clock size={12} /> {t('reports.ownedBy')} {r.owner}
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                          <AlertTriangle size={20} />
                        </div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('reports.auditFindings')}</h4>
                      </div>
                      <div className="space-y-6">
                         {[
                            { t: t('reports.auditFinding1Title'), d: t('reports.auditFinding1Desc'), c: 'rose' },
                            { t: t('reports.auditFinding2Title'), d: t('reports.auditFinding2Desc'), c: 'rose' },
                            { t: t('reports.auditFinding3Title'), d: t('reports.auditFinding3Desc'), c: 'amber' },
                            { t: t('reports.auditFinding4Title'), d: t('reports.auditFinding4Desc'), c: 'amber' }
                         ].map((f, i) => (
                           <div key={i} className="flex gap-5 border-b border-slate-50 pb-6 last:border-0">
                              <div className={`w-2 h-2 rounded-full mt-2 bg-${f.c}-500 shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.3)]`} />
                              <div>
                                 <p className="font-black text-slate-900 leading-none mb-2">{f.t}</p>
                                 <p className="text-xs text-slate-500 font-bold leading-relaxed">{f.d}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                      {report.config.includeEvidence && (
                        <div className="p-8 bg-slate-900 rounded-[2rem] text-white space-y-4">
                           <div className="flex items-center gap-3">
                             <Info size={18} className="text-accent" />
                             <h5 className="font-black text-sm uppercase tracking-widest">{t('reports.missingDocTitle')}</h5>
                           </div>
                           <p className="text-xs font-bold text-slate-400 leading-relaxed">
                               {t('reports.missingDocumentationDesc')} {t('reports.missingDocSOC')}:
                           </p>
                           <div className="flex flex-wrap gap-2">
                             <Badge color="slate" className="bg-white/10 text-white border-0">{t('reports.badge1')}</Badge>
                             <Badge color="slate" className="bg-white/10 text-white border-0">{t('reports.badge2')}</Badge>
                             <Badge color="slate" className="bg-white/10 text-white border-0">{t('reports.badge3')}</Badge>
                           </div>
                        </div>
                      )}
                   </div>
                </div>

                {/* Strategy Roadmap */}
                {report.config.includePlan && (
                  <section className="space-y-12">
                     <div className="text-center space-y-4">
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{t('reports.remediationStrategy')}</h3>
                        <p className="text-slate-500 font-bold">{t('reports.roadmapSubtitle')}</p>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                           { phase: t('reports.phase1'), days: t('reports.phase1Days'), color: 'accent', items: [t('reports.phase1Item1'), t('reports.phase1Item2'), t('reports.phase1Item3')] },
                           { phase: t('reports.phase2'), days: t('reports.phase2Days'), color: 'indigo-500', items: [t('reports.phase2Item1'), t('reports.phase2Item2'), t('reports.phase2Item3')] },
                           { phase: t('reports.phase3'), days: t('reports.phase3Days'), color: 'emerald-500', items: [t('reports.phase3Item1'), t('reports.phase3Item2'), t('reports.phase3Item3')] }
                        ].map((p:any, i:number) => (
                           <div key={i} className="relative p-10 bg-slate-50/50 rounded-[3rem] border border-slate-100 overflow-hidden group">
                              <div className={`absolute top-0 right-0 p-3 bg-accent text-white rounded-bl-[1.5rem] text-[9px] font-black uppercase tracking-widest`}>
                                 {p.days}
                              </div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{p.phase}</p>
                              <ul className="space-y-4">
                                 {p.items.map((item: string, idx: number) => (
                                    <li key={idx} className="flex gap-3 text-xs font-bold text-slate-700 leading-tight">
                                       <ChevronRight size={14} className={`text-accent shrink-0 mt-0.5`} />
                                       {item}
                                    </li>
                                 ))}
                              </ul>
                           </div>
                        ))}
                     </div>
                  </section>
                )}

                {/* Risk Register Appendix */}
                {report.config.includeRiskRegister && (
                  <section className="pt-12 border-t border-slate-100 page-break-before">
                     <div className="flex items-center justify-between mb-12">
                        <div>
                           <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('reports.riskRegisterAppendix')}</h3>
                           <p className="text-xs text-slate-400 font-bold mt-1">Granular breakdown of identified organizational hazards.</p>
                        </div>
                        <Badge color="slate" className="h-8 px-5">{t('reports.internalUseOnly')}</Badge>
                     </div>
                     <div className="overflow-x-auto border border-slate-100 rounded-[2rem]">
                        <table className="w-full text-left">
                           <thead>
                              <tr className="bg-slate-50 border-b border-slate-100">
                                 <th className="pl-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.identifier')}</th>
                                 <th className="px-5 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.hazard')}</th>
                                 <th className="px-5 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('reports.score')}</th>
                                 <th className="px-5 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.status')}</th>
                                 <th className="pr-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.owner')}</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-50 text-[11px] font-bold">
                              {risks.map((r: any) => (
                                <tr key={r.id}>
                                   <td className="pl-8 py-5 text-slate-400 tabular-nums">#{r.id.slice(-4).toUpperCase()}</td>
                                   <td className="px-5 py-5 text-slate-900">{r.title}</td>
                                   <td className="px-5 py-5 text-center text-slate-900 tabular-nums">{r.score}</td>
                                   <td className="px-5 py-5"><Badge color={r.status === RiskStatus.MITIGATED ? 'green' : 'slate'} className="text-[9px]">{r.status}</Badge></td>
                                   <td className="pr-8 py-5 text-slate-500 whitespace-nowrap">{r.owner}</td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </section>
                )}

                {/* Final Footer / Disclaimer */}
                <div className="text-center pt-24 space-y-6">
                   <div className="flex items-center justify-center gap-6 saturate-0 opacity-30 h-12">
                      <div className="w-px h-full bg-slate-400" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">{appName} GRC Protocol</p>
                      <div className="w-px h-full bg-slate-400" />
                   </div>
                   <div className="p-10 bg-slate-50 rounded-[2rem] text-left max-w-2xl mx-auto space-y-4 border border-slate-100">
                      <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{t('reports.professionalDisclaimer')}</h5>
                      <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase">
                         {t('reports.disclaimerText')}
                      </p>
                   </div>
                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Document ID: {report.id} • Proprietary & Confidential</p>
                </div>
             </div>
          </div>
       </motion.div>
    </div>
  );
};
