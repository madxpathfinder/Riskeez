import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  MessageSquareText,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Loader2,
  LayoutGrid,
  HelpCircle,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge, Button } from '../common';
import { AssessmentStatus, RiskLevel } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { assessmentService } from '../../services/assessmentService';
import { auditLogService } from '../../services/auditLogService';
import { APP_CONFIG } from '../../config/appConfig';
import { useBranding } from '../../contexts/BrandingContext';

interface AssessmentWizardProps {
  store: any;
  onCancel: () => void;
  continuationAssessment?: any;
}

// Answer options: Bəli=0 risk, Qismən=partial, Xeyr=full risk, N/A=excluded
const ANSWER_OPTIONS = [
  { value: 'yes',     labelAz: 'Bəli',   labelEn: 'Yes',     icon: CheckCircle2, color: 'emerald' },
  { value: 'partial', labelAz: 'Qismən', labelEn: 'Partial', icon: Minus,        color: 'amber'   },
  { value: 'no',      labelAz: 'Xeyr',   labelEn: 'No',      icon: X,            color: 'rose'    },
  { value: 'n/a',     labelAz: 'N/A',    labelEn: 'N/A',     icon: Clock,        color: 'slate'   },
];

const RISK_LEVEL_AZ: Record<string, string> = {
  critical: 'Kritik', high: 'Yüksək', medium: 'Orta', low: 'Aşağı',
};

export const AssessmentWizard = ({ store, onCancel, continuationAssessment }: AssessmentWizardProps) => {
  const { t } = useLanguage();
  const { organization, userData } = useAuth();
  const { appName } = useBranding();
  const { success, error: toastError } = useToast();

  // Step: 1=scope, 2=metadata, 3=categories, 4=questions, 5=preview, 6=complete
  const [step, setStep] = useState(continuationAssessment ? 4 : 1);
  const [details, setDetails] = useState({
    title: continuationAssessment?.title || '',
    scope: continuationAssessment?.scope || '',
    lead: continuationAssessment?.startedBy || userData?.name || ''
  });

  const [assessmentId, setAssessmentId] = useState<string | null>(continuationAssessment?.id || null);
  const [isCreating, setIsCreating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Category selection
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Questions loaded from DB based on selected categories
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});

  const [completionResult, setCompletionResult] = useState<{
    score: number; riskLevel: string; inferredRisks: any[]
  } | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const uniqueCategories = Array.from(new Set(questions.map((q) => q.category || q.category_key)));

  // Load categories on mount
  useEffect(() => {
    assessmentService.getCategories().then((cats) => {
      setAvailableCategories(cats);
    }).catch(() => {});
  }, []);

  // Load existing answers when continuing
  useEffect(() => {
    if (continuationAssessment?.id) {
      assessmentService.getAnswers(continuationAssessment.id).then((existing) => {
        const map: Record<string, string> = {};
        existing.forEach((a: any) => { map[a.questionId || a.question_id] = a.value || a.answer; });
        setLocalAnswers(map);
      }).catch(() => {});
    }
  }, [continuationAssessment]);

  const loadQuestionsByCategories = async (cats: string[]) => {
    setIsLoadingQuestions(true);
    try {
      const qs = await assessmentService.getQuestions(cats.length > 0 ? cats : undefined);
      setQuestions(qs);
      setCurrentQuestionIndex(0);
    } catch {
      const { ASSESSMENT_QUESTIONS } = await import('../../data/questionnaire');
      setQuestions(ASSESSMENT_QUESTIONS as any[]);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

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
    } catch (err: any) {
      toastError('Yaradılma Xətası', err?.message || 'Qiymətləndirmə yaradıla bilmədi.');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  const handleNext = async () => {
    if (step === 2) {
      setStep(3);
      return;
    }
    if (step === 3) {
      // Load questions, then create assessment, then go to questions step
      await loadQuestionsByCategories(selectedCategories);
      const id = await ensureAssessmentCreated();
      if (!id) return;
      setStep(4);
      return;
    }
    if (step === 4 && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    if (step === 4 && currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (step === 4) {
      setStep(3);
    } else if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  const handleAnswerQuestion = async (val: string) => {
    if (!currentQuestion) return;
    const qId = currentQuestion.id;
    setLocalAnswers((prev) => ({ ...prev, [qId]: val }));
    setIsSavingAnswer(true);
    try {
      if (assessmentId && APP_CONFIG.DATA_PROVIDER === 'api') {
        await assessmentService.saveAnswer(assessmentId, qId, val, observations[qId]);
      } else {
        await store.addAnswer({ assessmentId: assessmentId || 'new', questionId: qId, value: val });
      }
    } catch {
      // silent
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const answeredCount = Object.keys(localAnswers).length;
  const calculateCompletion = () =>
    questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

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
        // local fallback: new scoring (no=4, partial=2, yes=0)
        const SCORE_MAP: Record<string, number> = { 'yes': 0, 'bəli': 0, 'partial': 2, 'qismən': 2, 'no': 4, 'xeyr': 4 };
        const vals = Object.values(localAnswers).filter((v) => v.toLowerCase() !== 'n/a');
        const num = vals.reduce((s, v) => s + (SCORE_MAP[v.toLowerCase()] ?? 0), 0);
        const den = vals.length * 4;
        const score = den > 0 ? Math.round((num / den) * 100) : 0;
        const level = score >= 76 ? 'critical' : score >= 51 ? 'high' : score >= 26 ? 'medium' : 'low';
        result = { score, riskLevel: level, inferredRisks: [] };

        await store.saveAssessment({
          id: finalId,
          organizationId: organization?.id || 'org-1',
          title: details.title,
          scope: details.scope,
          status: AssessmentStatus.COMPLETED,
          overallScore: score,
          riskLevel: level as RiskLevel,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        });
      }

      setCompletionResult(result);
      success(
        t('assessments.analysisComplete') || 'Qiymətləndirmə Tamamlandı',
        `Risk göstəricisi: ${result.score}/100 — ${RISK_LEVEL_AZ[result.riskLevel] || result.riskLevel.toUpperCase()}`
      );
      await auditLogService.log('assessment_completed', 'Assessment', `Assessment "${details.title}" tamamlandı. Bal: ${result.score}`);
      if (store.refresh) await store.refresh();
      setStep(6);
    } catch (err: any) {
      toastError('Tamamlama Xətası', err?.message || 'Qiymətləndirmə tamamlana bilmədi.');
    } finally {
      setIsCompleting(false);
    }
  };

  const steps = [
    { id: 1, name: 'Əhatə Dairəsi' },
    { id: 2, name: 'Metadata' },
    { id: 3, name: 'Kateqoriyalar' },
    { id: 4, name: 'Suallar' },
    { id: 5, name: 'Önizləmə' },
    { id: 6, name: 'Tamamlandı' },
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
              {organization?.name || appName} • {assessmentId ? `ID: ${assessmentId.slice(-6)}` : 'Yeni Kampaniya'}
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-6">
          {steps.map((s) => (
            <div key={s.id} className={`flex items-center gap-2 transition-all duration-500 ${step === s.id ? 'opacity-100 scale-105' : 'opacity-20 hover:opacity-40'}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black ${step >= s.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-slate-200 text-slate-500'}`}>
                {step > s.id ? <CheckCircle2 size={14} /> : s.id}
              </div>
              <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">{s.name}</p>
            </div>
          ))}
        </div>

        <Button variant="ghost" size="sm" onClick={onCancel} icon={X} className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 hover:text-rose-500">
          {t('common.cancel')}
        </Button>
      </div>

      <div className="flex-grow flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-72 bg-white border-r border-slate-100 p-8 flex flex-col justify-between hidden xl:flex">
          <div className="space-y-8">
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('common.status')}</h4>
              <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden shadow-inner">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(step / 6) * 100}%` }}
                  className="h-full bg-accent rounded-full"
                />
              </div>
              <div className="flex justify-between items-center mt-3">
                <p className="text-[10px] text-slate-500 font-black uppercase opacity-60 tracking-widest">Gedişat</p>
                <p className="text-[10px] text-accent font-black uppercase tracking-widest">{t('common.step')} {step} / 6</p>
              </div>
            </div>

            {step === 4 && (
              <div className="overflow-hidden">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Kateqoriyalar</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-2">
                  {uniqueCategories.map((cat: string) => {
                    const isCurrent = currentQuestion?.category === cat || currentQuestion?.category_key === cat;
                    const isDone = questions.filter((q) => q.category === cat || q.category_key === cat).every((q) => localAnswers[q.id]);
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Məsləhət</span>
                </div>
                <p className="text-xs text-slate-300 font-medium leading-relaxed italic opacity-80">
                  {step <= 2 ? "Əhatə dairəsini dəqiq müəyyən edin." :
                   step === 3 ? "Qiymətləndirmənizə uyğun kateqoriyaları seçin." :
                   step === 4 ? "'Xeyr' cavabları avtomatik risk nəticəsi yaradır." :
                   "Cavablar analiz edilir... Risk göstəricisi çəkili uyğunsuzluqdan hesablanır."}
                </p>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/20 rounded-full -mr-12 -mt-12 blur-3xl" />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-grow overflow-y-auto bg-slate-50/50">
          <div className="max-w-2xl mx-auto py-12 px-8">
            <AnimatePresence mode="wait">

              {/* Step 1: Scope */}
              {step === 1 && (
                <motion.div key="st1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Audit Əhatəsi</h1>
                    <p className="text-slate-500 font-medium text-lg mt-2">Bu dövrün məntiqi sərhədlərini müəyyən edin.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 pt-4">
                    {['Tam Təşkilat', 'Xüsusi Şöbə', 'Coğrafi Bölgə', 'Layihə Əsaslı'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setDetails((d) => ({ ...d, scope: opt }))}
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
                              {opt === 'Tam Təşkilat' ? 'İdarə Heyəti Səviyyəsi' : 'Fokuslu Əməliyyat'}
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
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Kampaniya Metadata</h1>
                    <p className="text-slate-500 font-medium text-lg mt-2">İzlənilə bilən identifikasiya parametrləri.</p>
                  </div>
                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-saas-lg space-y-8 pt-12">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Əsas Başlıq *</label>
                      <input
                        type="text"
                        value={details.title}
                        onChange={(e) => setDetails((d) => ({ ...d, title: e.target.value }))}
                        placeholder="Məs: Q3 Kibertəhlükəsizlik Qiymətləndirilməsi"
                        className="w-full bg-slate-50 border border-slate-100/50 rounded-2xl px-6 py-5 text-sm font-black focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-slate-300 placeholder:font-bold"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Məsul Rəhbər</label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} strokeWidth={3} />
                        <input
                          type="text"
                          value={details.lead}
                          onChange={(e) => setDetails((d) => ({ ...d, lead: e.target.value }))}
                          placeholder="Audit rəhbərinin adı..."
                          className="w-full bg-slate-50 border border-slate-100/50 rounded-2xl pl-14 pr-6 py-5 text-sm font-black focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-slate-300 placeholder:font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Category selection */}
              {step === 3 && (
                <motion.div key="st3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Risk Kateqoriyaları</h1>
                    <p className="text-slate-500 font-medium text-lg mt-2">
                      Qiymətləndirilməyə daxil etmək istədiyiniz kateqoriyaları seçin.
                      {selectedCategories.length === 0 && <span className="text-slate-400"> (Hamısı seçiləcək)</span>}
                    </p>
                  </div>

                  {availableCategories.length === 0 ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 size={32} className="animate-spin text-accent" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {availableCategories.map((cat: any) => {
                        const isSelected = selectedCategories.includes(cat.key);
                        return (
                          <button
                            key={cat.key}
                            onClick={() => toggleCategory(cat.key)}
                            className={`p-6 text-left rounded-[2rem] border-2 transition-all duration-300 group ${
                              isSelected
                                ? 'bg-white border-accent shadow-saas-lg scale-[1.01]'
                                : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-grow">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-300 ${isSelected ? 'bg-accent text-white' : 'bg-slate-50 text-slate-400'}`}>
                                  <LayoutGrid size={18} />
                                </div>
                                <p className={`font-black text-sm leading-tight ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {cat.name_az}
                                </p>
                                <p className="text-[10px] text-slate-400 font-bold mt-1">{cat.question_count} sual</p>
                              </div>
                              <div className={`w-6 h-6 rounded-full border-[3px] flex items-center justify-center shrink-0 mt-1 transition-all ${isSelected ? 'border-accent bg-accent' : 'border-slate-200'}`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {selectedCategories.length > 0 && (
                    <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10 text-sm text-accent font-bold">
                      {selectedCategories.length} kateqoriya seçildi · {
                        availableCategories
                          .filter((c: any) => selectedCategories.includes(c.key))
                          .reduce((sum: number, c: any) => sum + Number(c.question_count || 0), 0)
                      } sual
                    </div>
                  )}

                  {isLoadingQuestions && (
                    <div className="flex items-center gap-3 text-sm text-accent font-bold">
                      <Loader2 size={16} className="animate-spin" />
                      Suallar yüklənir...
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 4: Questions */}
              {step === 4 && currentQuestion && (
                <motion.div key={`st4-${currentQuestionIndex}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                  <div className="flex items-start justify-between gap-8">
                    <div className="flex-grow">
                      <div className="inline-flex px-3 py-1 bg-accent/10 rounded-lg text-[10px] font-black text-accent uppercase tracking-widest border border-accent/10 mb-3">
                        {currentQuestion.category || currentQuestion.category_key}
                      </div>
                      {currentQuestion.section && (
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">{currentQuestion.section}</div>
                      )}
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{currentQuestion.text}</h1>
                      {currentQuestion.help_text && (
                        <p className="text-sm text-slate-400 font-medium mt-3 italic">"{currentQuestion.help_text}"</p>
                      )}
                      {currentQuestion.suggested_mitigation && (
                        <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
                          <HelpCircle size={13} className="shrink-0 mt-0.5 text-accent/60" />
                          <span className="italic">{currentQuestion.suggested_mitigation}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 pt-2">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Sual</p>
                      <p className="text-3xl font-black text-slate-900 tabular-nums">
                        {currentQuestionIndex + 1}<span className="text-sm opacity-20 ml-1">/ {questions.length}</span>
                      </p>
                    </div>
                  </div>

                  {/* 4-option answer grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4">
                    {ANSWER_OPTIONS.map(({ value, labelAz, icon: Icon, color }) => {
                      const isSelected = localAnswers[currentQuestion.id] === value;
                      const colorMap: Record<string, string> = {
                        emerald: isSelected ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50/50',
                        amber:   isSelected ? 'bg-amber-500 border-amber-500 text-white shadow-lg'   : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200 hover:bg-amber-50/50',
                        rose:    isSelected ? 'bg-rose-500 border-rose-500 text-white shadow-lg'     : 'bg-white border-slate-100 text-slate-500 hover:border-rose-200 hover:bg-rose-50/50',
                        slate:   isSelected ? 'bg-slate-500 border-slate-500 text-white shadow-lg'   : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50/50',
                      };
                      return (
                        <button
                          key={value}
                          onClick={() => handleAnswerQuestion(value)}
                          disabled={isSavingAnswer}
                          className={`p-6 rounded-[2.5rem] border-2 font-black text-xs uppercase tracking-widest transition-all duration-300 focus:outline-none flex flex-col items-center gap-3 ${colorMap[color]} ${isSavingAnswer ? 'opacity-70 cursor-wait' : 'scale-[1.01]'}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-white/20' : 'bg-slate-50'}`}>
                            <Icon size={20} strokeWidth={3} />
                          </div>
                          {labelAz}
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-saas-lg space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sübut / Müşahidə (könüllü)</label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm font-bold focus:ring-4 focus:ring-accent/10 outline-none transition-all min-h-[100px] resize-none placeholder:text-slate-300"
                      placeholder="Tapıntıları, istinad faylları və ya azaldıcı qeydləri daxil edin..."
                      value={observations[currentQuestion.id] || ''}
                      onChange={(e) => setObservations((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                    />
                  </div>

                  {isSavingAnswer && (
                    <div className="flex items-center gap-2 text-xs text-accent font-bold">
                      <Loader2 size={14} className="animate-spin" /> Cavab saxlanılır...
                    </div>
                  )}
                </motion.div>
              )}

              {/* Step 5: Preview inferred risks */}
              {step === 5 && (
                <motion.div key="st5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Kəşfiyyat Önizləməsi</h1>
                    <p className="text-slate-500 font-medium text-lg mt-2">Strukturlaşdırılmış cavablardan aşkarlanan boşluqlar. Rəsmi analiz üçün tamamlayın.</p>
                  </div>
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-sm font-bold flex items-start gap-3">
                    <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                    <p>
                      <span className="font-black">Xülasə:</span> {Object.values(localAnswers).filter((v) => v === 'yes' || v === 'bəli').length} Bəli, {' '}
                      {Object.values(localAnswers).filter((v) => v === 'partial' || v === 'qismən').length} Qismən, {' '}
                      {Object.values(localAnswers).filter((v) => v === 'no' || v === 'xeyr').length} Xeyr, {' '}
                      {Object.values(localAnswers).filter((v) => v === 'n/a').length} N/A — {questions.length} göstəricidən.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {uniqueCategories.map((cat) => {
                      const catQs = questions.filter((q) => q.category === cat || q.category_key === cat);
                      const noCount = catQs.filter((q) => ['no','xeyr'].includes((localAnswers[q.id] || '').toLowerCase())).length;
                      const partialCount = catQs.filter((q) => ['partial','qismən'].includes((localAnswers[q.id] || '').toLowerCase())).length;
                      if (noCount === 0 && partialCount === 0) return null;
                      const riskyRatio = (noCount + partialCount) / catQs.length;
                      const level = noCount / catQs.length > 0.5 ? 'Kritik' : riskyRatio > 0.4 ? 'Yüksək' : 'Orta';
                      const colorClass = level === 'Kritik' ? 'rose' : level === 'Yüksək' ? 'orange' : 'amber';
                      return (
                        <div key={cat} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-${colorClass}-50 text-${colorClass}-600`}>
                              <AlertTriangle size={20} />
                            </div>
                            <div>
                              <p className="font-black text-slate-900">{cat} — Risk Boşluğu</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">
                                {noCount} xeyr · {partialCount} qismən / {catQs.length} yoxlama
                              </p>
                            </div>
                          </div>
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-${colorClass}-500 text-white`}>
                            {level}
                          </span>
                        </div>
                      );
                    }).filter(Boolean)}
                    {Object.values(localAnswers).filter((v) => ['no','xeyr','partial','qismən'].includes(v.toLowerCase())).length === 0 && (
                      <div className="p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center">
                        <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-3" />
                        <p className="font-black text-emerald-900">Əla! Cavab verilmiş suallarda risk boşluğu aşkarlanmadı.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 6: Complete */}
              {step === 6 && completionResult && (
                <motion.div key="st6" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10 text-center py-8">
                  <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-emerald-50/30">
                    <CheckCircle2 size={48} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-4">
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Audit Təsdiqləndi</h1>
                    <p className="text-slate-500 font-medium text-lg max-w-sm mx-auto leading-relaxed">
                      <span className="text-slate-900 font-black underline decoration-accent decoration-wavy underline-offset-8">{details.title}</span> üzrə qiymətləndirmə tamamlandı.
                    </p>
                  </div>

                  <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl max-w-sm mx-auto space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Göstəricisi</span>
                      <Badge color={['critical','high'].includes(completionResult.riskLevel) ? 'red' : completionResult.riskLevel === 'medium' ? 'yellow' : 'green'}>
                        {RISK_LEVEL_AZ[completionResult.riskLevel] || completionResult.riskLevel.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black text-slate-900 tabular-nums">{completionResult.score}</span>
                      <span className="text-sm text-slate-400 font-bold">/ 100</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${completionResult.score > 50 ? 'bg-rose-500' : completionResult.score > 25 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${completionResult.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 font-bold text-center">Aşağı risk = daha az "Xeyr" cavabı</p>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-slate-500 uppercase tracking-widest text-[10px]">Cavablandırılıb</span>
                        <span className="font-black text-slate-900 tabular-nums">{answeredCount} / {questions.length}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-slate-500 uppercase tracking-widest text-[10px]">Risk Boşluqları</span>
                        <span className="font-black text-slate-900 tabular-nums">{completionResult.inferredRisks?.length || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 justify-center">
                    <Button onClick={onCancel} className="bg-emerald-500 hover:bg-emerald-600 min-w-[180px]">
                      Qiymətləndirməyə Bax
                    </Button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Footer navigation */}
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
            Geri
          </button>
          {step === 4 && (
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
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Tamamlanma</p>
            <p className="text-sm font-black text-slate-900 tabular-nums mt-1">{calculateCompletion()}%</p>
          </div>

          {step === 6 ? null : step === 5 ? (
            <Button
              onClick={complete}
              disabled={isCompleting}
              icon={isCompleting ? Loader2 : CheckCircle2}
              className="min-w-[220px] h-14 shadow-saas-lg bg-emerald-500 hover:bg-emerald-600"
            >
              {isCompleting ? 'İşlənilir...' : 'Reyestrə Əlavə Et'}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={
                (step === 1 && !details.scope) ||
                (step === 2 && !details.title) ||
                isCreating || isLoadingQuestions
              }
              icon={isCreating || isLoadingQuestions ? Loader2 : ArrowRight}
              className="min-w-[180px] h-12 shadow-saas-lg"
            >
              {isCreating ? 'Yaradılır...' :
               isLoadingQuestions ? 'Yüklənir...' :
               step === 4 && currentQuestionIndex < questions.length - 1 ? 'Növbəti Göstərici' :
               'Davam Et'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
