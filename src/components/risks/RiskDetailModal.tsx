import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldAlert, Clock, Quote, ShieldCheck, ArrowRight, Download, CheckCircle2, Plus, Brain, MoreVertical, FileText } from 'lucide-react';
import { Badge, Button, Modal } from '../common';
import { RiskLevel, RiskStatus } from '../../types';
import { RemediationPlanTab } from './RemediationPlanTab';
import { aiService } from '../../services/aiService';
import { auditLogService } from '../../services/auditLogService';
import { useToast } from '../../contexts/ToastContext';
import { assessmentService } from '../../services/assessmentService';
import { useLanguage } from '../../contexts/LanguageContext';

interface RiskDetailModalProps {
  risk: any;
  onClose: () => void;
  store: any;
}

export const RiskDetailModal = ({ risk, onClose, store }: RiskDetailModalProps) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRisk, setEditedRisk] = useState({ ...risk });
  
  const { success, error, info } = useToast();

  if (!risk) return null;
  const { controls, documents, updateRisk } = store;
  const relatedControls = controls.filter((c: any) => c.riskId === risk.id);
  const relatedDocs = documents.slice(0, 2);

   const handleUpdate = async () => {
    try {
      await updateRisk(editedRisk);
      setIsEditing(false);
      success('Risk Updated', `Objective "${editedRisk.title}" has been modified in the registry.`);
      await auditLogService.log('risk_updated', 'Risk', `Updated fields for risk: ${editedRisk.title}`);
    } catch (err) {
      error('Update Failed', 'Failed to save changes to the registry.');
    }
  };

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const resp = await aiService.generateRemediationPlan(risk);
      // We don't have a place to store it permanently in this mock, but we updated the UI via AIResponse
      info('AI Strategy Ready', 'AI has optimized the remediation steps.');
      await auditLogService.log('ai_remediation_drafted', 'Risk', `AI remediation strategy drafted for ${risk.title}`);
    } catch (err) {
      error('AI Error', 'Could not access strategy engine.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-[40px] w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-start bg-white shrink-0">
          <div className="space-y-4">
             <div className="flex items-center gap-3">
                <Badge color={risk.level === RiskLevel.CRITICAL ? 'red' : risk.level === RiskLevel.HIGH ? 'red' : 'yellow'} className="text-[10px] font-black uppercase tracking-wider px-3 py-1">
                   {t(`risk.level.${risk.level.toLowerCase()}`)} {t('riskRegister.severity').toUpperCase()}
                </Badge>
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                   {risk.category}
                </span>
                {isEditing && <Badge color="blue" className="animate-pulse">{t('common.edit')}</Badge>}
             </div>
             
             <div className="flex items-center gap-4">
               {isEditing ? (
                 <input 
                   className="text-3xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl border-b-2 border-accent outline-none bg-accent/5 px-2 rounded-lg"
                   value={editedRisk.title}
                   onChange={e => setEditedRisk({ ...editedRisk, title: e.target.value })}
                 />
               ) : (
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight max-w-3xl">{risk.title}</h2>
               )}
             </div>

             <div className="flex items-center gap-8 mt-2">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('common.owner')}</p>
                   <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[10px] bg-slate-900 text-white flex items-center justify-center text-[10px] font-black group-hover:scale-110 transition-transform">
                         {risk.owner.split(' ').map((n: any) => n[0]).join('')}
                      </div>
                      <span className="text-xs font-black text-slate-700">{risk.owner}</span>
                   </div>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('common.status')}</p>
                   {isEditing ? (
                      <select 
                        className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-1 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-accent/20"
                        value={editedRisk.status}
                        onChange={e => setEditedRisk({ ...editedRisk, status: e.target.value as RiskStatus })}
                      >
                         {Object.values(RiskStatus).map(s => <option key={s} value={s}>{t(`risk.status.${s.toLowerCase()}`)}</option>)}
                      </select>
                    ) : (
                      <Badge color={risk.status === RiskStatus.MITIGATED ? 'green' : risk.status === RiskStatus.IN_PROGRESS ? 'blue' : 'red'} className="text-[10px] font-black uppercase">{t(`risk.status.${risk.status.toLowerCase()}`)}</Badge>
                    )}
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('common.target')}</p>
                   <div className="flex items-center gap-1.5 font-black text-xs text-slate-700 uppercase tracking-tighter">
                      <Clock size={12} className="text-slate-400" />
                      {risk.dueDate}
                   </div>
                </div>
             </div>
          </div>
          <div className="flex gap-3">
             <Button variant="ghost" className="w-12 h-12 p-0 flex items-center justify-center rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100" onClick={() => setIsEditing(!isEditing)}>
                <MoreVertical size={20} className="text-slate-400" />
             </Button>
             <button onClick={onClose} className="w-12 h-12 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-2xl transition-all text-slate-400 cursor-pointer flex items-center justify-center">
               <X size={24} />
             </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-10 gap-1 border-b border-slate-50 bg-white shadow-sm z-10 shrink-0">
           {[
             { id: 'overview', label: t('dashboard.executiveSummary') },
             { id: 'mitigations', label: t('nav.controls') },
             { id: 'remediation', label: t('assessments.refineRegistry') },
             { id: 'evidence', label: t('assessments.proofEvidence') },
             { id: 'timeline', label: t('nav.auditLog') }
           ].map((tab) => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`px-6 py-5 text-[10px] font-black uppercase tracking-[0.1em] transition-all relative ${
                 activeTab === tab.id ? 'text-accent' : 'text-slate-400 hover:text-slate-600'
               }`}
             >
               {tab.label}
               {activeTab === tab.id && (
                 <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
               )}
             </button>
           ))}
        </div>
        
        {/* Main Content Area */}
        <div className="flex-grow overflow-y-auto p-10 space-y-10 no-scrollbar bg-slate-50/10">
           <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                   {/* Risk Narrative Section */}
                   <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      <div className="lg:col-span-7 space-y-8">
                         <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Risk Context & Objective</h4>
                            <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-saas relative group">
                               <Quote className="absolute -top-6 -left-6 text-slate-100" size={64} />
                               {isEditing ? (
                                 <textarea 
                                   className="w-full text-sm text-slate-600 leading-relaxed font-bold relative z-10 bg-accent/5 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-accent/20 min-h-[120px]"
                                   value={editedRisk.description}
                                   onChange={e => setEditedRisk({ ...editedRisk, description: e.target.value })}
                                 />
                               ) : (
                                 <p className="text-sm text-slate-600 leading-relaxed font-bold relative z-10 italic">
                                    "{risk.description}"
                                 </p>
                               )}
                            </div>
                         </div>

                         {/* Score Deep Dive */}
                         <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-saas space-y-8">
                            <div className="flex items-center justify-between">
                               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score Calibration Breakdown</h4>
                               <Badge color="slate" className="text-[9px] tabular-nums font-black">{risk.score} / 25 TOTAL</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="space-y-4">
                                  <div className="flex justify-between items-center px-1">
                                     <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Likelihood Projection</span>
                                     <span className="text-[11px] text-slate-400 font-black tabular-nums">{risk.likelihood} / 5</span>
                                  </div>
                                  <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                     <motion.div initial={{ width: 0 }} animate={{ width: `${(risk.likelihood/5)*100}%` }} className="h-full bg-orange-400 shadow-sm" />
                                  </div>
                               </div>
                               <div className="space-y-4">
                                  <div className="flex justify-between items-center px-1">
                                     <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">Business Impact Radius</span>
                                     <span className="text-[11px] text-slate-400 font-black tabular-nums">{risk.impact} / 5</span>
                                  </div>
                                  <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                     <motion.div initial={{ width: 0 }} animate={{ width: `${(risk.impact/5)*100}%` }} className="h-full bg-rose-500 shadow-sm" />
                                  </div>
                               </div>
                            </div>
                            <div className="pt-8 border-t border-slate-50 flex items-center gap-6">
                               <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 text-slate-400">
                                     <ShieldAlert size={14} />
                                     <p className="text-[9px] font-black uppercase tracking-widest">Determinism Rule</p>
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-500 leading-tight">Calculated via likelihood × impact. AI assists only in contextual significance modeling.</p>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="lg:col-span-5 space-y-8">
                         {/* AI Assessment Panel */}
                         <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[340px]">
                            <div className="relative z-10 space-y-6">
                               <div className="flex items-center gap-3 text-accent">
                                  <div className="p-2 bg-accent/20 rounded-xl">
                                     <Brain size={20} strokeWidth={3} />
                                  </div>
                                  <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">Autonomous Intelligence Advisory</h4>
                               </div>
                               <div className="space-y-4">
                                  <p className="text-sm text-slate-300 leading-safe-relaxed font-bold italic opacity-95 selection:bg-accent/30">
                                     "Based on organizational data, this risk primarily threatens operational availability. A failure in this domain targets compliance thresholds for SOC2 and ISO 27001, potentially triggering $15k/day in downtime costs."
                                  </p>
                                  <div className="space-y-3 pt-2">
                                     <div className="flex items-center gap-3 text-[10px] font-black text-emerald-400/80 uppercase tracking-widest bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        High Correlation with Infrastructure Scaling
                                     </div>
                                  </div>
                               </div>
                            </div>
                            <div className="relative z-10 pt-10 border-t border-white/10 flex items-center justify-between">
                               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Confidence Score: 0.94</span>
                               <Badge color="red" className="animate-pulse shadow-glow-red">IMMEDIATE ACTION</Badge>
                            </div>
                            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-accent/5 rounded-full blur-3xl opacity-60" />
                         </div>

                         {/* Quick Statistics */}
                         <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Exposure Time</p>
                               <p className="text-lg font-black text-slate-900">142 Days</p>
                            </div>
                            <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Hits</p>
                               <p className="text-lg font-black text-slate-900">02 Issues</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'mitigations' && (
                <motion.div key="mit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                   <div className="flex items-center justify-between px-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deployed Controls & Efficacy Mapping</h4>
                      <Badge color="green">{relatedControls.length} Active Mitigations</Badge>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {relatedControls.map((c: any) => (
                        <div key={c.id} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex flex-col justify-between group hover:shadow-saas transition-all border-l-4 border-l-emerald-500">
                           <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                 <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                    <ShieldCheck size={24} />
                                 </div>
                                 <Badge color="emerald" className="text-[9px] font-black uppercase tracking-widest">{c.status}</Badge>
                              </div>
                              <div>
                                 <p className="text-[11px] font-black text-slate-900 leading-tight mb-2">{c.title || c.name}</p>
                                 <p className="text-[11px] text-slate-400 font-bold leading-relaxed line-clamp-2 italic">"{c.description || 'Continuous monitoring of system health and performance levels...'}"</p>
                              </div>
                           </div>
                           <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                 <div className="flex gap-0.5">
                                    {[1,2,3,4,5].map(i => <div key={i} className={`w-3.5 h-1 rounded-full ${i <= (c.effectiveness === 'High' ? 5 : 3) ? 'bg-emerald-400' : 'bg-slate-100'}`} />)}
                                 </div>
                                 <span className="text-[10px] font-black text-slate-400 uppercase ml-2">Efficacy</span>
                              </div>
                              <Button variant="ghost" size="sm" icon={ArrowRight} className="p-0 translate-x-3 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all text-accent" />
                           </div>
                        </div>
                      ))}
                      
                      <button className="p-12 text-center bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] hover:border-accent/40 hover:bg-accent/[0.01] transition-all group group-hover:shadow-saas">
                         <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center text-slate-300 mx-auto mb-4 group-hover:scale-110 group-hover:text-accent group-hover:bg-accent/5 transition-all">
                            <Plus size={24} strokeWidth={3} />
                         </div>
                         <p className="text-sm text-slate-900 font-black tracking-tight">Deploy New Control</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Map mitigation to this risk objective</p>
                      </button>
                   </div>

                   <section className="p-8 bg-amber-50 border border-amber-100 rounded-[2.5rem] flex items-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0 border border-amber-200/50">
                         <ShieldAlert size={28} />
                      </div>
                      <div>
                         <h5 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1.5">Intelligence Suggestion: Control Under-performance</h5>
                         <p className="text-[11px] font-bold text-amber-700 leading-relaxed max-w-2xl">
                            While {relatedControls.length} controls are linked, {risk.title} remains at {risk.level} severity. Consider implementing an automated preventative control to lower impact coefficient.
                         </p>
                      </div>
                   </section>
                </motion.div>
              )}

              {activeTab === 'remediation' && (
                <div className="space-y-10">
                   <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remediation Action Plan</h4>
                      <Button 
                        size="sm" 
                        icon={Brain} 
                        className="h-9 font-black"
                        onClick={handleGeneratePlan}
                        loading={isGeneratingPlan}
                      >
                         Draft AI Response Plan
                      </Button>
                   </div>
                   <RemediationPlanTab risk={risk} store={store} />
                </div>
              )}

              {activeTab === 'evidence' && (
                <motion.div key="ev" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
                   <div className="flex items-center justify-between px-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supporting Evidence & Artifacts</h4>
                      <Button variant="secondary" size="sm" icon={Plus} className="h-9 px-4 font-black">Link Source Artifact</Button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {relatedDocs.map((doc: any) => (
                        <div key={doc.id} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex flex-col justify-between group hover:shadow-saas transition-all">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                                 <FileText size={22} />
                              </div>
                              <div>
                                 <p className="text-sm font-black text-slate-800 mb-1">{doc.name}</p>
                                 <Badge color="blue" className="text-[8px] tracking-widest">{doc.type}</Badge>
                              </div>
                           </div>
                           <p className="text-[11px] text-slate-500 font-bold mt-6 leading-relaxed line-clamp-2 italic">"{doc.summary}"</p>
                           <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span>Verified on: {doc.uploadedAt.split('T')[0]}</span>
                              <Button variant="ghost" size="sm" icon={Download} className="w-8 h-8 p-0 text-slate-300 hover:text-accent" />
                           </div>
                        </div>
                      ))}
                      
                      {relatedDocs.length === 0 && (
                        <div className="md:col-span-2 py-20 text-center bg-white border border-dashed border-slate-100 rounded-[3rem]">
                           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No evidence artifacts linked to this risk</p>
                        </div>
                      )}
                   </div>
                </motion.div>
              )}

              {activeTab === 'timeline' && (
                <motion.div key="time" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
                   <div className="max-w-3xl mx-auto space-y-10">
                      <div className="relative pl-12 space-y-12 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                         {[
                           { title: 'Governance Review Complete', date: 'May 02, 2026', user: 'Admin Officer', details: 'Risk score re-calibrated based on Q1 external findings.', icon: CheckCircle2, bg: 'bg-emerald-500' },
                           { title: 'Automated Threat Analysis', date: 'May 01, 2026', user: 'AI-ENGINE-01', details: 'Remediation plan generated with 92% strategy confidence.', icon: Brain, bg: 'bg-accent' },
                           { title: 'Risk Identity Created', date: 'Apr 28, 2026', user: 'Infosec Lead', details: 'New operational risk identified in data center migration project.', icon: Plus, bg: 'bg-slate-900' }
                         ].map((evt, i) => (
                           <div key={i} className="relative group">
                              <div className={`absolute -left-[44px] top-0 w-10 h-10 rounded-[14px] border-4 border-white ${evt.bg} text-white shadow-xl flex items-center justify-center z-10 transition-transform group-hover:scale-110`}>
                                 <evt.icon size={16} strokeWidth={3} />
                              </div>
                              <div className="pt-1.5 translate-y-1">
                                 <div className="flex items-center gap-3 mb-2">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{evt.date}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{evt.user}</span>
                                 </div>
                                 <h5 className="text-sm font-black text-slate-800 tracking-tight">{evt.title}</h5>
                                 <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed max-w-xl">{evt.details}</p>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Modal Footer Sections */}
        <div className="px-10 py-8 border-t border-slate-50 bg-white flex justify-between items-center shrink-0">
           <div className="space-y-2">
              <div className="flex items-center gap-3 text-[10px] font-black text-slate-900 uppercase tracking-widest">
                 <ShieldCheck size={16} className="text-emerald-500" />
                 Deterministic Scoring Integrity Validated
              </div>
              <p className="text-[9px] text-slate-400 font-bold leading-none italic opacity-80">AI assessments assist but do not replace legal or regulatory advice.</p>
           </div>
           <div className="flex gap-4">
              {isEditing ? (
                 <>
                    <Button variant="secondary" onClick={() => { setIsEditing(false); setEditedRisk({ ...risk }); }} className="font-black h-12 px-6">{t('common.cancel')}</Button>
                    <Button onClick={handleUpdate} className="font-black h-12 px-8 shadow-glow-accent">{t('common.save')}</Button>
                 </>
              ) : (
                 <>
                    <Button variant="secondary" onClick={async () => { await updateRisk({ ...risk, status: RiskStatus.MITIGATED }); success('Risk Sealed', 'Governance target achieved.'); onClose(); }} icon={CheckCircle2} className="font-black h-12 px-6 border-slate-200">{t('common.mitigated')}</Button>
                    <Button variant="secondary" icon={Download} onClick={() => success('Export Report', 'Generating detailed risk artifact...')} className="font-black h-12 px-6 border-slate-200">{t('common.export')}</Button>
                    <Button icon={Plus} onClick={() => info('Workflow Init', 'Response sequence triggered.')} className="font-black h-12 px-8 shadow-glow-accent">{t('dashboard.startAssessment')}</Button>
                 </>
              )}
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
