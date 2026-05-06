import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShieldCheck,
  MessageSquareText,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Plus,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge, Button } from '../common';
import { AssessmentStatus, RiskLevel } from '../../types';
import { ASSESSMENT_QUESTIONS } from '../../data/questionnaire';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { assessmentService } from '../../services/assessmentService';
import { answerService } from '../../services/answerService';
import { auditLogService } from '../../services/auditLogService';
import { APP_CONFIG } from '../../config/appConfig';

interface AssessmentWizardProps {
  store: any;
  onCancel: () => void;
  continuationAssessment?: any; // pass existing Draft/InProgress assessment to continue
}

export const AssessmentWizard = ({ store, onCancel, continuationAssessment }: AssessmentWizardProps) => {
  const { t } = useLanguage();
  const { organization, userData } = useAuth();
  const { success, error: toastError, info } = useToast();

  // Step state
  const [step, setStep] = useState(continuationAssessment ? 3 : 1);
  const [details, setDetails] = useState({
    title: continuationAssessment?.title || '',
    scope: continuationAssessment?.scope || '',
    lead: continuationAssessment?.startedBy || userData?.name || ''
  });

  // Assessment ID — set after creation in DB
  const [assessmentId, setAssessmentId] = useState<string | null>(continuationAssessment?.id || null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [observations, setObservations] = useState<Record<string, string>>({});
  // Local answers map: questionId → value
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});

  // Completion result
  const [completionResult, setCompletionResult] = useState<{ score: number; riskLevel: string; inferredRisks: any[] } | null>(null);

  const questions = ASSESSMENT_QUESTIONS;
  const currentQuestion = questions[currentQuestionIndex];
  const categories = Array.from(new Set(questions.map(q => q.category)));

  // Load existing answers if continuing
  useEffect(() => {
    if (continuationAssessment?.id) {
      assessmentService.getAnswers(continuationAssessment.id).then(existingAnswers => {
        const map: Record<string, string> = {};
        existingAnswers.forEach((a: any) => {
          map[a.questionId || a.question_id] = a.value || a.answer;
        });
        setLocalAnswers(map);
        // Jump to first unanswered question
        const firstUnanswered = questions.findIndex(q => !map[q.id]);
        if (firstUnanswered > 0) setCurrentQuestionIndex(firstUnanswered);
      }).catch(() => {});
    }
  }, [continuationAssessment]);

  // Create assessment in DB when moving past step 2
  const ensureAssessmentCreated = async (): Promise<string | null> => {
    if (assessmentId) return assessmentId;
    setIsCreating(true);
    try {
      const created = await assessmentService.createAssessment({
        title: details.title,
        scope: details.scope,
        startedBy: details.lead || userData?.name || 'Unknown',
      });
      setAssessmentId(created.id);
      await auditLogService.log('assessment_started', 'Assessment', `Assessment "${details.title}" started`);
      return created.id;
    } catch (err) {
      toastError('Creation Failed', 'Could not create assessment in database.');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = async () => {
    if (step === 2) {
      // Create assessment before entering questionnaire
      const id = await ensureAssessmentCreated();
      if (!id) return;
      setStep(3);
      return;
    }
    if (step === 3 && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      return;
    }
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (step === 3 && currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    } else if (step === 3) {
      setStep(2);
    } else {
      setStep(prev => prev - 1);
    }
  };

  const handleAnswerQuestion = async (val: string) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;

    // Optimistic local update
    setLocalAnswers(prev => ({ ...prev, [qId]: val }));
    setIsSavingAnswer(true);

    try {
      if (assessmentId && APP_CONFIG.DATA_PROVIDER === 'api') {
        await assessmentService.saveAnswer(assessmentId, qId, val, observations[qId]);
      } else {
        // local store fallback
        await store.addAnswer({ assessmentId: assessmentId || 'new', questionId: qId, value: val });
      }
    } catch {
      // silent - local state already updated
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const answeredCount = Object.keys(localAnswers).length;
  const calculateCompletion = () => Math.round((answeredCount / questions.length) * 100);

  const complete = async () => {
    setIsCompleting(true);
    try {
      let finalId = assessmentId;
      if (!finalId) {
        finalId = await ensureAssessmentCreated();
        if (!finalId) return;
      }

      let result;
      if (APP_CONFIG.DATA_PROVIDER === 'api') {
        result = await assessmentService.completeAssessment(finalId);
      } else {
        // local fallback: calculate score from local answers
        const yesCount = Object.values(localAnswers).filter(v => v === 'Yes').length;
        const nonNACount = Object.values(localAnswers).filter(v => v !== 'N/A').length;
        const score = nonNACount > 0 ? Math.round((yesCount / nonNACount) * 100) : 0;
        const level = score <= 25 ? 'critical' : score <= 50 ? 'high' : score <= 75 ? 'medium' : 'low';
        result = { score, riskLevel: level, inferredRisks: [] };

        // save locally
        await store.saveAssessment({
          id: finalId,
          organizationId: organization?.id || 'org-1',
          title: details.title,
          scope: details.scope,
          status: AssessmentStatus.COMPLETED,
          overallScore: score,
          riskLevel: level as RiskLevel,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        });
      }

      setCompletionResult(result);
      success(t('assessments.analysisComplete') || 'Assessment Complete', `Score: ${result.score}/100 — ${result.riskLevel.toUpperCase()}`);
      await auditLogService.log('assessment_completed', 'Assessment', `Assessment "${details.title}" completed. Score: ${result.score}`);

      // Refresh store
      if (store.refresh) await store.refresh();
      setStep(5);
    } catch (err: any) {
      toastError('Completion Failed', err?.message || 'Could not complete assessment.');
    } finally {
      setIsCompleting(false);
    }
  };

  const steps = [
    { id: 1, name: t('assessments.scope'), desc: 'Define environment' },
    { id: 2, name: 'Metadata', desc: 'Campaign metadata' },
    { id: 3, name: t('assessments.indicators'), desc: 'GRC framework' },
    { id: 4, name: t('assessments.inferredRisks'), desc: 'Intelligence discovery' },
    { id: 5, name: 'Complete', desc: 'Registry issued' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shadow-sm relative z-10">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20">
             <ShieldCheck size={20} />
           </div>
           <div>
             <h2 className="text-sm font-black text-slate-900 leading-tight">{t('assessments.title')}</h2>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
               {organization?.name || 'Riskeez'} • {assessmentId ? `ID: ${assessmentId.slice(-6)}` : 'New Campaign'}
             </p>
           </div>
        </div>

        <div className="hidden lg:flex items-center gap-10">
           {steps.map((s) => (
             <div key={s.id} className={`flex items-center gap-3 transition-all duration-500 ${step === s.id ? 'opacity-100 scale-105' : 'opacity-20 hover:opacity-40'}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${step >= s.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-slate-200 text-slate-500'}`}>
                   {step > s.id ? <CheckCircle2 size={14} /> : s.id}
                </div>
                <div className="text-left">
                   <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">{s.name}</p>
                </div>
             </div>
           ))}
        </div>

        <Button variant="ghost" size="sm" onClick={onCancel} icon={X} className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 hover:text-rose-500">{t('common.cancel')}</Button>
      </div>

      <div className="flex-grow flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-72 bg-white border-r border-slate-100 p-8 flex flex-col justify-between hidden xl:flex">
           <div className="space-y-8">
              <div>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('common.status')}</h4>
                 <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(step / 5) * 100}%` }}
                      className="h-full bg-accent rounded-full"
                    />
                 </div>
                 <div className="flex justify-between items-center mt-3">
                   <p className="text-[10px] text-slate-500 font-black uppercase opacity-60 tracking-widest">Progress</p>
                   <p className="text-[10px] text-accent font-black uppercase tracking-widest">{t('common.step')} {step} / 5</p>
                 </div>
              </div>

              {step === 3 && (
                <div className="overflow-hidden">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Domain Analysis</h4>
                   <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                      {categories.map((cat: string) => {
                        const isCurrent = currentQuestion?.category === cat;
                        const isDone = questions.filter(q => q.category === cat).every(q => localAnswers[q.id]);
                        return (
                          <div key={cat} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-300 ${isCurrent ? 'bg-accent/5 border-accent shadow-sm' : 'border-transparent opacity-50'}`}>
                             {isDone ? (
                               <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                 <CheckCircle2 size={11} strokeWidth={3} />
                               </div>
                             ) : (
                               <div className={`w-2 h-2 rounded-full shrink-0 ${isCurrent ? 'bg-accent animate-pulse' : 'bg-slate-200'}`} />
                             )}
                             <span className="text-[10px] font-black text-slate-700 leading-tight uppercase tracking-widest">{cat}</span>
                          </div>
                        );
                      })}
                   </div>
                </div>
              )}

              <div className="p-6 bg-slate-900 rounded-[2rem] text-white relative overflow-hidden">
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                       <MessageSquareText size={14} className="text-accent" strokeWidth={3} />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contextual Guard</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium leading-relaxed italic opacity-80">
                      {step <= 2 ? "Define scope precisely. Full Org audits require comprehensive evidence across all domains." :
                       step === 3 ? "Be precise. 'No' answers trigger downstream risk inferences automatically." :
                       "Analyzing responses... Posture score calculated from weighted compliance answers."}
                    </p>
                 </div>
                 <div className="absolute top-0 right-0 w-24 h-24 bg-accent/20 rounded-full -mr-12 -mt-12 blur-3xl" />
              </div>
           </div>
        </div>

        {/* Main Content */}
        <div className="flex-grow overflow-y-auto bg-slate-50/50">
           <div className="max-w-2xl mx-auto py-12 px-8">
              <AnimatePresence mode="wait">

                 {/* Step 1: Scope */}
                 {step === 1 && (
                    <motion.div key="st1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                       <div>
                          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Audit Scope</h1>
                          <p className="text-slate-500 font-medium text-lg mt-2">Define the logical boundaries of this cycle.</p>
                       </div>
                       <div className="grid grid-cols-1 gap-4 pt-4">
                         {['Full Organization', 'Specific Department', 'Geographic Region', 'Project Based'].map((opt) => (
                            <button
                             key={opt}
                             onClick={() => setDetails(d => ({ ...d, scope: opt }))}
                             className={`w-full p-8 text-left rounded-[2rem] border-2 transition-all duration-300 flex items-center justify-between group ${
                               details.scope === opt
                               ? 'bg-white border-accent shadow-saas-lg scale-[1.01]'
                               : 'bg-white border-slate-100 hover:border-slate-200'
                             }`}
                            >
                              <div className="flex items-center gap-6">
                                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${details.scope === opt ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-slate-50 text-slate-400'}`}>
                                    <ShieldCheck size={24} />
                                 </div>
                                 <div className="pr-4">
                                    <p className={`font-black text-lg ${details.scope === opt ? 'text-slate-900' : 'text-slate-700'}`}>{opt}</p>
                                    <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest opacity-60">
                                      {opt === 'Full Organization' ? 'Board Level Review' : 'Focused Operation'}
                                    </p>
                                 </div>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-[3px] flex items-center justify-center transition-all ${details.scope === opt ? 'border-accent bg-accent scale-110' : 'border-slate-200'}`}>
                                 {details.scope === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                            </button>
                         ))}
                       </div>
                    </motion.div>
                 )}

                 {/* Step 2: Metadata */}
                 {step === 2 && (
                    <motion.div key="st2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                       <div>
                          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Campaign Metadata</h1>
                          <p className="text-slate-500 font-medium text-lg mt-2">Identification parameters for traceability.</p>
                       </div>
                       <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-saas-lg space-y-8 pt-12">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Reference Title *</label>
                            <input
                             type="text"
                             value={details.title}
                             onChange={(e) => setDetails(d => ({ ...d, title: e.target.value }))}
                             placeholder="e.g. Q3 SOC2 Security Briefing"
                             className="w-full bg-slate-50 border border-slate-100/50 rounded-2xl px-6 py-5 text-sm font-black focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-slate-300 placeholder:font-bold"
                            />
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Governance Officer</label>
                            <div className="relative">
                              <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={3} />
                              <input
                               type="text"
                               value={details.lead}
                               onChange={(e) => setDetails(d => ({ ...d, lead: e.target.value }))}
                               placeholder="Audit lead name..."
                               className="w-full bg-slate-50 border border-slate-100/50 rounded-2xl pl-14 pr-6 py-5 text-sm font-black focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-slate-300 placeholder:font-bold"
                              />
                            </div>
                          </div>
                       </div>
                       {isCreating && (
                         <div className="flex items-center gap-3 text-sm text-accent font-bold">
                           <Loader2 size={16} className="animate-spin" />
                           Creating assessment in database...
                         </div>
                       )}
                    </motion.div>
                 )}

                 {/* Step 3: Questions */}
                 {step === 3 && (
                    <motion.div key="st3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                       <div className="flex items-start justify-between gap-8">
                          <div className="flex-grow">
                             <div className="inline-flex px-3 py-1 bg-accent/10 rounded-lg text-[10px] font-black text-accent uppercase tracking-widest border border-accent/10 mb-3">
                                {currentQuestion?.category}
                             </div>
                             <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{currentQuestion?.text}</h1>
                             {currentQuestion?.helpText && <p className="text-sm text-slate-400 font-medium mt-3 italic">"{currentQuestion.helpText}"</p>}
                          </div>
                          <div className="text-right shrink-0 pt-2">
                             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Check</p>
                             <p className="text-3xl font-black text-slate-900 tabular-nums">{currentQuestionIndex + 1}<span className="text-sm opacity-20 ml-1">/ {questions.length}</span></p>
                          </div>
                       </div>

                       <div className="grid grid-cols-3 gap-6 pt-4">
                         {['Yes', 'No', 'N/A'].map((val) => {
                           const isSelected = localAnswers[currentQuestion?.id] === val;
                           return (
                             <button
                              key={val}
                              onClick={() => handleAnswerQuestion(val)}
                              disabled={isSavingAnswer}
                              className={`p-8 rounded-[2.5rem] border-2 font-black text-xs uppercase tracking-widest transition-all duration-300 focus:outline-none flex flex-col items-center gap-4 ${
                                isSelected
                                  ? 'bg-accent border-accent text-white shadow-saas-lg scale-[1.05]'
                                  : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50/50'
                              } ${isSavingAnswer ? 'opacity-70 cursor-wait' : ''}`}
                             >
                               <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-white/20' : 'bg-slate-50'}`}>
                                  {val === 'Yes' ? <CheckCircle2 size={24} strokeWidth={3} /> : val === 'No' ? <X size={24} strokeWidth={3} /> : <Clock size={24} strokeWidth={3} />}
                               </div>
                               {val === 'Yes' ? t('common.yes') : val === 'No' ? t('common.no') : 'N/A'}
                             </button>
                           );
                         })}
                       </div>

                       <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-saas-lg space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Evidence / Observations (optional)</label>
                          <textarea
                           className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-accent/10 outline-none transition-all min-h-[120px] resize-none placeholder:text-slate-300"
                           placeholder="Type findings, reference files, or mitigation logs here..."
                           value={observations[currentQuestion?.id] || ''}
                           onChange={(e) => setObservations(prev => ({ ...prev, [currentQuestion?.id]: e.target.value }))}
                          />
                       </div>

                       {isSavingAnswer && (
                         <div className="flex items-center gap-2 text-xs text-accent font-bold">
                           <Loader2 size={14} className="animate-spin" /> Saving answer...
                         </div>
                       )}
                    </motion.div>
                 )}

                 {/* Step 4: Preview inferred risks */}
                 {step === 4 && (
                    <motion.div key="st4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                       <div>
                          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Intelligence Preview</h1>
                          <p className="text-slate-500 font-medium text-lg mt-2">Detected gaps from your structured input. Complete to finalize analysis.</p>
                       </div>
                       <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-bold flex items-start gap-3">
                          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                          <p>
                            <span className="font-black">Summary:</span> You answered {Object.values(localAnswers).filter(v=>v==='Yes').length} Yes, {Object.values(localAnswers).filter(v=>v==='No').length} No, {Object.values(localAnswers).filter(v=>v==='N/A').length} N/A out of {questions.length} indicators.
                            Complete to generate your official score and inferred risk report.
                          </p>
                       </div>
                       <div className="space-y-4">
                         {categories.map(cat => {
                           const catQs = questions.filter(q => q.category === cat);
                           const noCount = catQs.filter(q => localAnswers[q.id] === 'No').length;
                           if (noCount === 0) return null;
                           const noRatio = noCount / catQs.length;
                           const level = noRatio > 0.7 ? 'Critical' : noRatio > 0.4 ? 'High' : 'Medium';
                           const color = level === 'Critical' ? 'rose' : level === 'High' ? 'orange' : 'amber';
                           return (
                             <div key={cat} className={`p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between`}>
                                <div className="flex items-center gap-4">
                                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${color}-50 text-${color}-600`}>
                                      <AlertTriangle size={20} />
                                   </div>
                                   <div>
                                      <p className="font-black text-slate-900">{cat} Risk Gap</p>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">{noCount}/{catQs.length} controls failed</p>
                                   </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-${color}-500 text-white`}>
                                  {level}
                                </span>
                             </div>
                           );
                         }).filter(Boolean)}
                         {Object.values(localAnswers).filter(v=>v==='No').length === 0 && (
                           <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center">
                             <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-3" />
                             <p className="font-black text-emerald-900">Excellent! No risk gaps detected in answered questions.</p>
                           </div>
                         )}
                       </div>
                    </motion.div>
                 )}

                 {/* Step 5: Complete */}
                 {step === 5 && completionResult && (
                    <motion.div key="st5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10 text-center py-8">
                       <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-emerald-50/30">
                         <CheckCircle2 size={48} strokeWidth={2.5} />
                       </div>
                       <div className="space-y-4">
                          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Audit Validated</h1>
                          <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto leading-relaxed">
                             Assessment for <span className="text-slate-900 font-black underline decoration-accent decoration-wavy underline-offset-8">{details.title}</span> is complete.
                          </p>
                       </div>

                       <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl max-w-sm mx-auto space-y-6">
                          <div className="flex justify-between items-center">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Score</span>
                             <Badge color={completionResult.riskLevel === 'critical' ? 'red' : completionResult.riskLevel === 'high' ? 'red' : completionResult.riskLevel === 'medium' ? 'yellow' : 'green'}>
                               {completionResult.riskLevel?.toUpperCase()} RISK
                             </Badge>
                          </div>
                          <div className="flex items-baseline gap-2">
                             <span className="text-6xl font-black text-slate-900 tabular-nums">{completionResult.score}</span>
                             <span className="text-sm text-slate-400 font-bold">/ 100</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div className={`h-full rounded-full transition-all duration-1000 ${completionResult.score > 70 ? 'bg-emerald-500' : completionResult.score > 40 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${completionResult.score}%` }} />
                          </div>
                          <div className="space-y-3 pt-2">
                             <div className="flex justify-between text-sm font-bold">
                                <span className="text-slate-500 uppercase tracking-widest text-[10px]">Answered</span>
                                <span className="font-black text-slate-900 tabular-nums">{answeredCount} / {questions.length}</span>
                             </div>
                             <div className="flex justify-between text-sm font-bold">
                                <span className="text-slate-500 uppercase tracking-widest text-[10px]">Risk Gaps</span>
                                <span className="font-black text-slate-900 tabular-nums">{completionResult.inferredRisks?.length || 0}</span>
                             </div>
                          </div>
                       </div>

                       <div className="flex gap-4 justify-center">
                         <Button onClick={onCancel} className="bg-emerald-500 hover:bg-emerald-600 min-w-[180px]">
                           View Assessment
                         </Button>
                       </div>
                    </motion.div>
                 )}

              </AnimatePresence>
           </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="bg-white border-t border-slate-100 px-12 py-6 flex items-center justify-between shadow-soft-up relative z-10">
         <div className="flex items-center gap-6">
            <button
               disabled={step === 1 && currentQuestionIndex === 0}
               onClick={handleBack}
               className={`flex items-center gap-2 font-black uppercase tracking-widest text-[10px] transition-all ${
                 step === 1 && currentQuestionIndex === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-slate-900'
               }`}
            >
               <ArrowLeft size={16} strokeWidth={4} />
               Previous
            </button>
            {step === 3 && (
              <div className="flex items-center gap-3 ml-4">
                 <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                   {currentQuestionIndex + 1} <span className="opacity-30">/ {questions.length}</span>
                 </p>
                 <div className="w-40 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-300" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
                 </div>
              </div>
            )}
         </div>

         <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end mr-2">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Completion</p>
               <p className="text-sm font-black text-slate-900 tabular-nums mt-1">{calculateCompletion()}%</p>
            </div>

            {step === 5 ? null : step === 4 ? (
              <Button
                 onClick={complete}
                 disabled={isCompleting}
                 icon={isCompleting ? Loader2 : CheckCircle2}
                 className="min-w-[220px] h-14 shadow-saas-lg bg-emerald-500 hover:bg-emerald-600"
              >
                {isCompleting ? 'Processing...' : 'Finalize to Registry'}
              </Button>
            ) : (
              <Button
                 onClick={handleNext}
                 disabled={
                   (step === 1 && !details.scope) ||
                   (step === 2 && !details.title) ||
                   isCreating
                 }
                 icon={isCreating ? Loader2 : ArrowRight}
                 className="min-w-[180px] h-12 shadow-saas-lg"
              >
                {isCreating ? 'Creating...' :
                 step === 3 && currentQuestionIndex < questions.length - 1 ? 'Next Indicator' :
                 'Review & Continue'}
              </Button>
            )}
         </div>
      </div>
    </div>
  );
};
