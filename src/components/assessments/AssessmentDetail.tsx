import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Download,
  Settings,
  Send,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Plus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Printer,
  Loader2,
  Scale
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Badge, Button, Card, RiskBadge, PageHeader, StatCard, Modal } from '../common';
import { AssessmentStatus, RiskLevel, Risk, AnswerType } from '../../types';
import { ASSESSMENT_QUESTIONS } from '../../data/questionnaire';
import { aiService, AIResponse } from '../../services/aiService';
import { assessmentService } from '../../services/assessmentService';
import { questionService } from '../../services/questionService';
import { documentService } from '../../services/documentService';
import { riskService } from '../../services/riskService';
import { auditLogService } from '../../services/auditLogService';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface AssessmentDetailProps {
  assessment: any;
  store: any;
  onBack: () => void;
  refreshData?: () => void;
}

export const AssessmentDetail = ({ assessment, store, onBack, refreshData }: AssessmentDetailProps) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<AIResponse | null>(assessment.aiAnalysis || null);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementResults, setRefinementResults] = useState<AIResponse | null>(null);
  const [isRefinementModalOpen, setIsRefinementModalOpen] = useState(false);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [evidenceData, setEvidenceData] = useState({ title: '', type: 'Policy', content: '' });
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isAddingRisk, setIsAddingRisk] = useState<string | null>(null);
  const [addedRiskIds, setAddedRiskIds] = useState<Set<string>>(new Set());

  // Loaded answers from API (fresh on mount)
  const [loadedAnswers, setLoadedAnswers] = useState<any[]>([]);
  const [answersLoading, setAnswersLoading] = useState(true);

  // Inferred risks from assessment data (from DB) or store
  const inferredRisks: any[] = (assessment as any).inferredRisks || [];

  const { risks, answers, documents } = store;
  const { userData } = useAuth();
  const { success, error, info } = useToast();
  const isAdmin = userData?.role === 'Admin' || userData?.role === 'Risk Manager';

  // Load answers on mount
  useEffect(() => {
    setAnswersLoading(true);
    assessmentService.getAnswers(assessment.id)
      .then(ans => setLoadedAnswers(ans))
      .catch(() => setLoadedAnswers([]))
      .finally(() => setAnswersLoading(false));
  }, [assessment.id]);

  const assessmentRisks = risks.filter((r: any) => r.assessmentId === assessment.id);
  // Use loaded answers (API) falling back to store answers
  const assessmentAnswers = loadedAnswers.length > 0
    ? loadedAnswers
    : answers.filter((a: any) => a.assessmentId === assessment.id);
  const assessmentDocs = documents.filter((d: any) => d.organizationId === assessment.organizationId);

  // Compute official level from score
  const officialScore = assessment.overallScore || 0;
  const officialLevel = officialScore <= 25 ? 'Critical' : officialScore <= 50 ? 'High' : officialScore <= 75 ? 'Medium' : 'Low';
  const aiSuggestedLevel: string | null = (aiReport as any)?.suggestedLevel || null;
  const aiLevelDiffers = aiSuggestedLevel && aiSuggestedLevel.toLowerCase() !== officialLevel.toLowerCase();

  const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const resp = await aiService.analyzeAssessment({
        assessment,
        answers: assessmentAnswers,
        risks: assessmentRisks,
        officialScore,
        officialLevel
      });
      // Add suggestedLevel to response for comparison
      const enriched = { ...resp, suggestedLevel: resp.relatedRisks?.length ? 'High' : officialLevel };
      setAiReport(enriched);
      // Save to DB
      await assessmentService.saveAIAnalysis(assessment.id, enriched);
      success(t('assessments.analysisComplete') || 'Analysis Complete', 'Strategic insights generated from assessment data.');
      await auditLogService.log('assessment_ai_analysis_generated', 'Assessment', `AI analysis triggered for ${assessment.title}`);
      if (aiLevelDiffers) {
        await auditLogService.log('ai_risk_level_disagreement_detected', 'Assessment', `AI suggested ${enriched.suggestedLevel}, official is ${officialLevel} for ${assessment.title}`);
      }
    } catch (err) {
      error('Analysis Failed', 'Could not reach AI optimization engine.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefineRegistry = async () => {
    setIsRefining(true);
    try {
      const resp = await aiService.refineRiskRegisterFromAssessment(assessmentAnswers, risks);
      setRefinementResults(resp);
      setIsRefinementModalOpen(true);
      await auditLogService.log('risk_register_refined_from_assessment', 'Assessment', `Registry refinement suggestion generated for ${assessment.title}`);
    } catch (err) {
      error('Refinement Failed', 'AI could not process registry logic.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleGenerateFullReport = async () => {
    setIsGeneratingReport(true);
    try {
      const result = await assessmentService.generateReport(assessment.id);
      setReportContent(result.report);
      setIsReportOpen(true);
      await auditLogService.log('assessment_report_generated', 'Assessment', `Report generated for ${assessment.title}`);
      success('Report Generated', 'Full assessment report ready.');
    } catch (err) {
      error('Report Failed', 'Could not generate report.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleAddInferredRiskToRegistry = async (inferred: any) => {
    const key = inferred.title;
    setIsAddingRisk(key);
    try {
      const newRisk = await riskService.createRisk({
        title: inferred.title,
        description: `Inferred from assessment: ${assessment.title}. Reason: ${inferred.reason}`,
        category: inferred.category,
        owner: 'Unassigned',
        status: 'Open' as any,
        likelihood: inferred.likelihood || 3,
        impact: inferred.impact || 3,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        assessmentId: assessment.id,
        recommendation: (inferred.suggestedControls || []).join('; ')
      });
      setAddedRiskIds(prev => new Set([...prev, key]));
      if (store.refresh) await store.refresh();
      success('Risk Added', `"${inferred.title}" added to Risk Register.`);
      await auditLogService.log('inferred_risk_added_to_register', 'Assessment', `Inferred risk "${inferred.title}" added from assessment ${assessment.id}`);
    } catch (err) {
      error('Failed', 'Could not add risk to register.');
    } finally {
      setIsAddingRisk(null);
    }
  };

  const handleApplyRefinement = async (risk: string) => {
    try {
      await riskService.createRisk({
        title: risk.split('(')[0].trim(),
        description: `Inferred from assessment: ${assessment.title}`,
        category: 'Strategic',
        owner: 'Unassigned',
        status: 'Open' as any,
        likelihood: 3,
        impact: 3,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        assessmentId: assessment.id,
        recommendation: 'Mitigate according to AI suggestion.'
      });
      if (store.refresh) await store.refresh();
      success('Risk Added', 'Suggestion successfully integrated into registry.');
    } catch {
      error('Failed', 'Could not add risk to register.');
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingQuestion.id.startsWith('new-')) {
      await questionService.createQuestion(editingQuestion);
    } else {
      await questionService.updateQuestion(editingQuestion.id, editingQuestion);
    }
    setIsQuestionModalOpen(false);
    if (refreshData) refreshData();
    success('Question Saved', 'Registry framework updated.');
  };

  const handleAddEvidence = async () => {
    await documentService.addEvidence({
      ...evidenceData,
      assessmentId: assessment.id
    });
    setEvidenceData({ title: '', type: 'Policy', content: '' });
    setIsEvidenceModalOpen(false);
    success('Evidence Added', 'Proof linked to current assessment.');
  };

  const tabs = [
    { id: 'overview', label: t('dashboard.executiveSummary') || 'Overview' },
    { id: 'questionnaire', label: t('assessments.indicators') || 'Indicators' },
    { id: 'risks', label: t('assessments.inferredRisks') || 'Inferred Risks' },
    { id: 'ai-comparison', label: 'AI vs Official' },
    { id: 'evidence', label: t('assessments.proofEvidence') || 'Evidence' },
    { id: 'summary', label: t('assessments.executiveBrief') || 'Brief' }
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
           <button 
            onClick={onBack} 
            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
           >
              <ArrowLeft size={18} className="text-slate-500" strokeWidth={3} />
           </button>
           <div>
              <div className="flex items-center gap-3">
                 <h1 className="text-3xl font-black text-slate-900 tracking-tight">{assessment.title}</h1>
                 <Badge color={assessment.status === AssessmentStatus.COMPLETED ? 'green' : 'blue'}>
                    {assessment.status}
                 </Badge>
              </div>
              <p className="text-sm text-slate-500 font-bold mt-1 opacity-60 uppercase tracking-widest">
                Scope: {assessment.scope} • Created {format(new Date(assessment.createdAt), 'MMM d, yyyy')}
              </p>
           </div>
        </div>
        <div className="flex items-center gap-3">
           {isAdmin && (
             <Button variant="secondary" onClick={handleRefineRegistry} disabled={isRefining}>
               {isRefining ? t('assessments.refining') : t('assessments.refineRegistry')}
             </Button>
           )}
           <Button variant="secondary" icon={isGeneratingReport ? Loader2 : Printer} onClick={handleGenerateFullReport} disabled={isGeneratingReport}>{t('assessments.fullReport') || 'Full Report'}</Button>
           <Button 
            icon={Send} 
            className="bg-slate-900" 
            onClick={handleAnalyzeWithAI}
            disabled={isAnalyzing}
           >
            {isAnalyzing ? t('assessments.analyzing') : t('assessments.analyzeWithAI')}
           </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-100 p-1 bg-slate-50/50 rounded-2xl w-fit">
         {tabs.map((tab) => (
           <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
              activeTab === tab.id 
              ? 'bg-white text-accent shadow-sm ring-1 ring-slate-100' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
           >
             {tab.label}
           </button>
         ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
             {aiReport && (
               <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white border border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="relative z-10 space-y-4">
                     <div className="flex items-center gap-3">
                        <ShieldCheck className="text-emerald-400" />
                        <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400">{t('assessments.analysisComplete')}</h4>
                     </div>
                     <p className="text-sm text-slate-300 italic">"{aiReport.summary}"</p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        <div>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t('assessments.confirmedFindings')}</p>
                           <ul className="space-y-1">
                              {aiReport.confirmedFindings.map((f, i) => <li key={i} className="text-xs text-slate-400">• {f}</li>)}
                           </ul>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Recommendations</p>
                           <ul className="space-y-1">
                              {aiReport.recommendations?.map((r, i) => <li key={i} className="text-xs text-emerald-400/80">• {r}</li>)}
                           </ul>
                        </div>
                     </div>
                  </div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
               </div>
             )}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title={t('dashboard.postureSummary')} className="md:col-span-2">
                   <div className="grid grid-cols-2 gap-10 p-4">
                      <div>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('assessments.complianceScore')}</p>
                         <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black text-slate-900 tabular-nums leading-none tracking-tighter">{assessment.overallScore}</span>
                            <span className="text-sm font-bold text-slate-300">/ 100</span>
                         </div>
                         <div className="mt-6 h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-1000 ${assessment.overallScore > 70 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]'}`} style={{ width: `${assessment.overallScore}%` }} />
                         </div>
                      </div>
                      <div className="flex flex-col justify-between">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('assessments.inferredSeverity')}</p>
                            <RiskBadge level={assessment.riskLevel} />
                         </div>
                         <div className="mt-auto p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('assessments.lastValidated')}</p>
                            <p className="text-sm font-black text-slate-800">{assessment.completedAt ? format(new Date(assessment.completedAt), 'MMMM d, yyyy') : t('assessments.auditPending')}</p>
                         </div>
                      </div>
                   </div>
                </Card>

                <Card title={t('assessments.engagementMetrics')}>
                   <div className="space-y-5 px-2 py-4">
                      <div className="flex justify-between items-center">
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-widest opacity-60">{t('assessments.findings')}</span>
                         <span className="text-base font-black text-slate-900 tabular-nums">{assessmentRisks.length}</span>
                      </div>
                      <div className="h-px bg-slate-50" />
                      <div className="flex justify-between items-center">
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-widest opacity-60">{t('assessments.artifacts')}</span>
                         <span className="text-base font-black text-slate-900 tabular-nums">{assessmentDocs.length}</span>
                      </div>
                      <div className="h-px bg-slate-50" />
                      <div className="flex justify-between items-center">
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-widest opacity-60">{t('assessments.criticalGaps')}</span>
                         <span className="text-base font-black text-rose-600 tabular-nums">04</span>
                      </div>
                   </div>
                </Card>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title={t('assessments.complianceRoadmap')}>
                   <div className="space-y-5 py-4">
                      {[
                        'Implement mandatory multi-factor authentication (MFA) across all legacy systems.',
                        'Conduct a data privacy impact assessment (DPIA) for client-facing portals.',
                        'Revise business continuity plan (BCP) to include specific regional failure scenarios.'
                      ].map((rec, i) => (
                        <div key={i} className="flex gap-4 group cursor-pointer p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                           <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black mt-0.5 shrink-0 shadow-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {i+1}
                           </div>
                           <p className="text-sm text-slate-600 font-bold leading-relaxed">{rec}</p>
                        </div>
                      ))}
                   </div>
                </Card>
                <Card title="Pending Proof" subtitle="Required evidence to boost posture">
                    <div className="space-y-3 py-2">
                       {[
                         { title: 'Information Security Policy', cat: 'Governance & Culture', priority: 'High' },
                         { title: 'Incident Response Drill Logs', cat: 'Crisis Resilience', priority: 'Critical' },
                         { title: 'Vendor Security Assessment (VSA)', cat: 'Supply Chain', priority: 'Medium' }
                       ].map((item, i) => (
                         <div 
                           key={i} 
                           onClick={() => setIsEvidenceModalOpen(true)}
                           className="flex items-center justify-between p-4 rounded-[1.5rem] border border-slate-100 hover:border-accent hover:shadow-saas transition-all group cursor-pointer"
                         >
                            <div className="flex items-center gap-4">
                               <div className={`w-2 h-2 rounded-full ${item.priority === 'Critical' ? 'bg-rose-600' : item.priority === 'High' ? 'bg-rose-400' : 'bg-amber-400'} group-hover:animate-pulse`} />
                               <div>
                                  <p className="text-sm font-black text-slate-700">{item.title}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">{item.cat}</p>
                               </div>
                            </div>
                            <Plus size={16} className="text-slate-300 group-hover:text-accent" strokeWidth={3} />
                         </div>
                       ))}
                    </div>
                    <p className="mt-4 text-[10px] text-slate-400 font-medium italic">Pending Proof means evidence required but not yet uploaded to support findings.</p>
                 </Card>
             </div>
          </motion.div>
        )}

        {activeTab === 'questionnaire' && (
          <motion.div key="questionnaire" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
             <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <div>
                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('assessments.indicators')}</h4>
                   <p className="text-xs text-slate-400 font-bold mt-1">{t('assessments.auditIndicatorsStatus')}</p>
                </div>
                {isAdmin && (
                  <Button size="sm" icon={Plus} onClick={() => { setEditingQuestion({ category: 'Access Control', text: '', weight: 10, answerType: AnswerType.YES_NO, helpText: '', id: `new-${Date.now()}` }); setIsQuestionModalOpen(true); }}>
                    {t('assessments.newQuestion')}
                  </Button>
                )}
             </div>
             <Card noPadding className="overflow-hidden border-none shadow-saas">
                {answersLoading && (
                  <div className="flex items-center gap-3 p-8 text-sm text-accent font-bold">
                    <Loader2 size={16} className="animate-spin" /> Loading answers...
                  </div>
                )}
                <div className="divide-y divide-slate-50">
                   {ASSESSMENT_QUESTIONS.map((q) => {
                     const ans = assessmentAnswers.find((a: any) => (a.questionId || a.question_id) === q.id);
                     return (
                       <div 
                         key={q.id} 
                         onClick={() => { if (isAdmin) { setEditingQuestion(q); setIsQuestionModalOpen(true); } else { info('Indicator Detail', `Indicator: ${q.category}. Status: ${ans?.value || 'Pending'}`); } }}
                         className="p-8 flex justify-between gap-12 hover:bg-slate-50/50 transition-all border-l-4 border-transparent hover:border-accent cursor-pointer group"
                       >
                          <div className="space-y-4 flex-grow max-w-3xl">
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">{q.category}</span>
                                {isAdmin && <Settings size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
                             </div>
                             <p className="text-lg font-black text-slate-900 leading-tight tracking-tight group-hover:text-accent transition-colors">{q.text}</p>
                             {ans?.notes && (
                               <div className="p-5 bg-blue-50/30 border border-blue-100 rounded-2xl relative">
                                  <p className="text-xs text-slate-600 font-bold italic leading-relaxed">
                                    "{ans.notes}"
                                  </p>
                                  <div className="absolute top-2 right-2 w-6 h-6 text-blue-200"><FileText size={20} /></div>
                               </div>
                             )}
                          </div>
                          <div className="text-right shrink-0 pt-1">
                             <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm transition-all border ${
                               ans?.value === 'Yes' ? 'bg-emerald-500 border-emerald-500 text-white' : 
                               ans?.value === 'No' ? 'bg-rose-500 border-rose-500 text-white' : 
                               'bg-slate-50 border-slate-100 text-slate-300'
                             }`}>
                                {ans?.value || (ans as any)?.answer || 'Pending'}
                             </div>
                          </div>
                       </div>
                     );
                   })}
                </div>
             </Card>
          </motion.div>
        )}

        {activeTab === 'risks' && (
          <motion.div key="risks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
             {/* Disclaimer */}
             <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-sm font-bold">
               <AlertTriangle size={18} className="shrink-0 mt-0.5" />
               <p>These risks are inferred from assessment answers. Adding to the Register requires authorized user approval. <span className="font-black">AI suggestions do not override the official risk score unless approved by an authorized user.</span></p>
             </div>

             {/* Inferred risks from DB */}
             {inferredRisks.length > 0 ? (
               <div className="space-y-4">
                 <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Inferred Risk Gaps ({inferredRisks.length})</h3>
                 {inferredRisks.map((inferred: any, i: number) => {
                   const key = inferred.title;
                   const alreadyAdded = addedRiskIds.has(key);
                   return (
                     <div key={i} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                       <div className="flex items-start justify-between gap-4">
                         <div className="flex-grow space-y-2">
                           <div className="flex items-center gap-3">
                             <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-white ${
                               inferred.level === 'critical' ? 'bg-rose-600' : inferred.level === 'high' ? 'bg-orange-500' : inferred.level === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                             }`}>{inferred.level?.toUpperCase()}</span>
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{inferred.category}</span>
                           </div>
                           <h4 className="text-base font-black text-slate-900">{inferred.title}</h4>
                           <p className="text-sm text-slate-500 font-medium">{inferred.reason}</p>
                           <div className="flex gap-6 pt-1">
                             <span className="text-[10px] font-black text-slate-400 uppercase">Likelihood: <span className="text-slate-700">{inferred.likelihood}</span></span>
                             <span className="text-[10px] font-black text-slate-400 uppercase">Impact: <span className="text-slate-700">{inferred.impact}</span></span>
                             <span className="text-[10px] font-black text-slate-400 uppercase">Score: <span className="text-slate-700">{inferred.score}</span></span>
                           </div>
                           {inferred.suggestedControls?.length > 0 && (
                             <div className="mt-2">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Suggested Controls</p>
                               {inferred.suggestedControls.map((c: string, j: number) => (
                                 <p key={j} className="text-xs text-slate-600 font-medium">• {c}</p>
                               ))}
                             </div>
                           )}
                         </div>
                         <div className="flex flex-col gap-2 shrink-0">
                           {alreadyAdded ? (
                             <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600"><CheckCircle2 size={14} /> Added</span>
                           ) : (
                             <Button size="sm" icon={isAddingRisk === key ? Loader2 : Plus} disabled={!!isAddingRisk}
                               onClick={() => handleAddInferredRiskToRegistry(inferred)}>
                               {isAddingRisk === key ? 'Adding...' : 'Add to Register'}
                             </Button>
                           )}
                         </div>
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : assessment.status === AssessmentStatus.COMPLETED ? (
               <div className="py-16 text-center">
                 <CheckCircle2 size={48} className="mx-auto text-emerald-300 mb-4" />
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No risk gaps inferred from this assessment.</p>
               </div>
             ) : (
               <div className="py-16 text-center">
                 <ShieldAlert size={48} className="mx-auto text-slate-200 mb-4" />
                 <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Complete the assessment to generate inferred risks.</p>
               </div>
             )}

             {/* Also show register risks linked to this assessment */}
             {assessmentRisks.length > 0 && (
               <div className="space-y-3">
                 <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Linked Register Risks ({assessmentRisks.length})</h3>
                 {assessmentRisks.map((r: Risk) => (
                   <div key={r.id} className="p-5 bg-white rounded-2xl border border-slate-100 flex items-center justify-between">
                     <div>
                       <p className="font-black text-slate-900 text-sm">{r.title}</p>
                       <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{r.category} • Score: {r.score}</p>
                     </div>
                     <RiskBadge level={r.level} />
                   </div>
                 ))}
               </div>
             )}
          </motion.div>
        )}

        {activeTab === 'ai-comparison' && (
          <motion.div key="ai-comparison" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
            <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white">
              <div className="flex items-center gap-3 mb-4">
                <Scale size={20} className="text-accent" />
                <h3 className="font-black text-lg">Compare AI vs Official Risk Level</h3>
              </div>
              <p className="text-slate-400 text-sm font-medium">
                The <strong className="text-white">Official Score</strong> is deterministically calculated (Likelihood × Impact or weighted answers).
                The <strong className="text-white">AI Suggestion</strong> is advisory only and does NOT automatically override the official score.
              </p>
            </div>

            {/* Warning banner if AI disagrees */}
            {aiLevelDiffers && (
              <div className="p-5 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-start gap-3 text-amber-900">
                <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-black text-sm">⚠ AI Risk Level Disagreement Detected</p>
                  <p className="text-sm font-medium mt-1">Official level is <strong>{officialLevel}</strong> but AI suggests <strong>{aiSuggestedLevel}</strong>. An authorized user must review and approve any changes.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Official */}
              <div className="p-6 bg-white rounded-[2rem] border-2 border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Official Score</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-black text-slate-900 tabular-nums">{officialScore}</span>
                  <span className="text-slate-400 font-bold">/ 100</span>
                </div>
                <div className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white ${
                  officialLevel === 'Critical' ? 'bg-rose-600' : officialLevel === 'High' ? 'bg-orange-500' : officialLevel === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>{officialLevel}</div>
                <p className="text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">Deterministic — cannot be overridden by AI</p>
              </div>

              {/* Calculated */}
              <div className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Calculated Method</p>
                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                  Score = (Yes Answers × Weight) / (Total Non-N/A Weight) × 100
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Yes answers</span>
                    <span>{assessmentAnswers.filter((a:any) => (a.value||a.answer) === 'Yes').length}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>No answers</span>
                    <span>{assessmentAnswers.filter((a:any) => (a.value||a.answer) === 'No').length}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>N/A (excluded)</span>
                    <span>{assessmentAnswers.filter((a:any) => (a.value||a.answer) === 'N/A').length}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <span>Total answered</span>
                    <span>{assessmentAnswers.length}</span>
                  </div>
                </div>
              </div>

              {/* AI */}
              <div className={`p-6 rounded-[2rem] border-2 shadow-sm ${aiReport ? 'bg-white border-accent/30' : 'bg-slate-50 border-dashed border-slate-200'}`}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">AI Advisory</p>
                {aiReport ? (
                  <>
                    <div className={`inline-flex px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-white mb-4 ${
                      aiSuggestedLevel === 'Critical' ? 'bg-rose-600' : aiSuggestedLevel === 'High' ? 'bg-orange-500' : aiSuggestedLevel === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}>{aiSuggestedLevel || officialLevel} (suggested)</div>
                    <p className="text-sm text-slate-500 font-medium italic leading-relaxed">"{aiReport.summary}"</p>
                    <p className="text-[10px] font-black text-rose-500 mt-4 uppercase tracking-widest">Advisory only — no automatic override</p>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm font-bold mb-4">No AI analysis yet</p>
                    <Button size="sm" icon={Send} onClick={handleAnalyzeWithAI} disabled={isAnalyzing}>
                      {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Missing info & recommendations */}
            {aiReport && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Missing Information">
                  {aiReport.missingInformation?.length ? (
                    <ul className="space-y-2 py-2">
                      {aiReport.missingInformation.map((m, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                          <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-slate-400 py-4">No missing information identified.</p>}
                </Card>
                <Card title="AI Recommendations">
                  {aiReport.recommendations?.length ? (
                    <ul className="space-y-2 py-2">
                      {aiReport.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                          <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-slate-400 py-4">Run AI analysis for recommendations.</p>}
                </Card>
              </div>
            )}

            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
              ⚠ Disclaimer: AI suggestions are advisory only. They do not replace official deterministic scoring or authorized risk decisions. All AI-suggested risk level changes require explicit approval by an authorized Risk Manager or Administrator.
            </div>
          </motion.div>
        )}        {activeTab === 'summary' && (
          <motion.div key="summary" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
             <div className="p-12 bg-slate-900 rounded-[3rem] text-white shadow-2xl border border-slate-800 relative overflow-hidden">
                <div className="relative z-10">
                   <div className="flex items-center gap-4 mb-10">
                      <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30 text-white">
                         <ShieldCheck size={24} strokeWidth={3} />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t('assessments.intelligenceSynthesis')}</h4>
                        <h3 className="text-2xl font-black mt-1">{t('assessments.executiveResilienceBrief')}</h3>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                      <div className="space-y-8">
                         <div className="space-y-4">
                           <h5 className="text-lg font-black text-white/90">{t('assessments.macroObservation')}</h5>
                           <p className="text-slate-400 font-medium leading-relaxed italic">
                              "{(aiReport?.summary || 'Analyzing...').replace(/"/g, '')}"
                           </p>
                         </div>
                         <div className="space-y-4">
                            <h5 className="text-lg font-black text-white/90">{t('assessments.strategicImplication')}</h5>
                            <p className="text-slate-400 font-medium leading-relaxed">
                               {aiReport?.assumptions[0] || 'Continued reliance on manual oversight increases the likelihood of human error in security monitoring.'}
                            </p>
                         </div>
                      </div>
                      <div className="space-y-8">
                         <div className="p-8 bg-white/[0.03] rounded-[2.5rem] border border-white/10 shadow-inner overflow-y-auto max-h-[300px]">
                            <h4 className="text-xs font-black mb-6 flex items-center gap-3 uppercase tracking-widest text-emerald-400">
                               <TrendingUp size={16} strokeWidth={3} />
                               {t('assessments.impactOptimizedActions')}
                            </h4>
                            <ul className="space-y-6">
                               {(aiReport?.recommendations || [
                                 'Implement mandatory MFA for all admin accounts.',
                                 'Establish a formal incident response drill schedule.',
                                 'Audit vendor security protocols quarterly.'
                               ]).map((rec, i) => (
                                 <li key={i} className="flex gap-4">
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full mt-2 shrink-0 animate-pulse" />
                                    <p className="text-[11px] font-bold text-slate-300 leading-relaxed uppercase tracking-wide">{rec}</p>
                                 </li>
                               ))}
                            </ul>
                         </div>
                         <div className="flex gap-4">
                            <Button className="flex-1" icon={Download} onClick={handleGenerateFullReport}>PDF BRIEF</Button>
                            <Button variant="secondary" className="flex-1 bg-white/5 border-white/10 text-white" onClick={() => { navigator.clipboard.writeText(aiReport?.summary || ''); success('Copied', 'Brief text copied to clipboard.'); }}>COPY TEXT</Button>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-[100px] opacity-40 pointer-events-none" />
             </div>
          </motion.div>
        )}

        {activeTab === 'evidence' && (
           <motion.div key="evidence" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 {assessmentDocs.map((doc: any) => (
                   <Card key={doc.id} className="hover:border-accent transition-all group p-6 rounded-[2rem]">
                      <div className="flex items-start justify-between mb-6">
                         <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                            <FileText size={28} />
                         </div>
                         <button className="p-2 text-slate-300 hover:text-accent transition-colors"><Download size={20} /></button>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-accent transition-colors leading-tight">{doc.name}</h4>
                      <p className="text-[10px] text-slate-400 font-black uppercase mt-2 tracking-widest">Added {format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</p>
                      <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                         <Badge color="green">Verified</Badge>
                         <span className="text-[10px] font-black text-slate-200 tracking-widest">#S-712</span>
                      </div>
                   </Card>
                 ))}
                 <button 
                  onClick={() => setIsEvidenceModalOpen(true)}
                  className="aspect-square rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300 hover:border-accent hover:bg-accent/5 hover:text-accent transition-all group p-8"
                 >
                    <Plus size={40} className="mb-4 transition-transform group-hover:scale-110" strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-center">Add Document</span>
                 </button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <Modal
        isOpen={isQuestionModalOpen}
        onClose={() => setIsQuestionModalOpen(false)}
        title={editingQuestion?.id.startsWith('new-') ? t('assessments.newQuestionTitle') : t('assessments.adjustControlTitle')}
        subtitle={t('assessments.modifyParametersDesc')}
      >
        <form onSubmit={handleSaveQuestion} className="space-y-6">
           <div className="space-y-4">
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.category')}</label>
                 <select 
                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold mt-2"
                   value={editingQuestion?.category}
                   onChange={e => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                 >
                    <option>Access Control</option>
                    <option>Data Privacy</option>
                    <option>Infrastructure</option>
                    <option>Governance</option>
                    <option>Operational</option>
                 </select>
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('assessments.questionText')}</label>
                 <textarea 
                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold mt-2 h-32"
                   value={editingQuestion?.text}
                   onChange={e => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                   placeholder="e.g., Do you maintain an up-to-date registry of all IT assets?"
                 />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('assessments.weight')}</label>
                    <input 
                      type="number"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold mt-2"
                      value={editingQuestion?.weight}
                      onChange={e => setEditingQuestion({ ...editingQuestion, weight: parseInt(e.target.value) })}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('assessments.answerType')}</label>
                    <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold mt-2">
                       <option>Yes/No</option>
                       <option>Multiple Choice</option>
                       <option>Text Entry</option>
                    </select>
                 </div>
              </div>
           </div>
           <div className="pt-6 flex gap-4">
              <Button type="submit" className="flex-1">{t('common.save')}</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setIsQuestionModalOpen(false)}>{t('common.cancel')}</Button>
           </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRefinementModalOpen}
        onClose={() => setIsRefinementModalOpen(false)}
        title={t('assessments.registryRefinementTitle')}
        subtitle={t('assessments.aiRefinementDesc')}
      >
        <div className="space-y-6">
           <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed italic">
                 "{refinementResults?.summary}"
              </p>
           </div>
           <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('assessments.actionableSuggestions')}</h4>
              {(refinementResults?.recommendations || []).map((rec, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl group hover:border-accent transition-all">
                   <p className="text-sm font-bold text-slate-700">{rec}</p>
                   <Button size="sm" variant="secondary" onClick={() => handleApplyRefinement(rec)}>Apply</Button>
                </div>
              ))}
           </div>
           <Button variant="secondary" className="w-full" onClick={() => setIsRefinementModalOpen(false)}>{t('common.close')}</Button>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        title={t('assessments.fullReport') || 'Assessment Report'}
        subtitle={`Generated ${new Date().toLocaleDateString()}`}
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <Button icon={Printer} onClick={() => window.print()} variant="secondary">Print / Save PDF</Button>
          </div>
          <div id="assessment-report-print" className="bg-slate-50 rounded-2xl p-6 max-h-[60vh] overflow-y-auto">
            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">{reportContent}</pre>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        title={t('assessments.addEvidenceTitle')}
        subtitle={t('assessments.linkEvidenceDesc')}
      >
        <div className="space-y-6">
           <div className="space-y-4">
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('assessments.evidenceTitle')}</label>
                 <input 
                   type="text"
                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold mt-2"
                   placeholder="e.g., Q1 Network Audit Logs"
                   value={evidenceData.title}
                   onChange={e => setEvidenceData({ ...evidenceData, title: e.target.value })}
                 />
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('assessments.type')}</label>
                 <select 
                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold mt-2"
                   value={evidenceData.type}
                   onChange={e => setEvidenceData({ ...evidenceData, type: e.target.value })}
                 >
                    <option>Policy</option>
                    <option>Audit Record</option>
                    <option>Incident Log</option>
                    <option>Technical Spec</option>
                    <option>Other</option>
                 </select>
              </div>
              <div>
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('assessments.summaryNarrative')}</label>
                 <textarea 
                   className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold mt-2 h-32"
                   placeholder="Paste content summarize or provide context..."
                   value={evidenceData.content}
                   onChange={e => setEvidenceData({ ...evidenceData, content: e.target.value })}
                 />
              </div>
           </div>
           <div className="pt-6 flex gap-4">
              <Button className="flex-1" onClick={handleAddEvidence} disabled={!evidenceData.title}>{t('documents.upload')}</Button>
              <Button variant="secondary" className="flex-1" onClick={() => setIsEvidenceModalOpen(false)}>{t('common.cancel')}</Button>
           </div>
        </div>
      </Modal>
    </div>
  );
};
