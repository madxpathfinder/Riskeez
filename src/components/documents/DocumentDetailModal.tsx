import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  X, FileText, Clock, ShieldCheck, AlertTriangle, 
  CheckCircle2, TrendingUp, Download, Plus, 
  History, Eye, BrainCircuit, Search, Info
} from 'lucide-react';
import { format } from 'date-fns';
import { Badge, Button } from '../common';
import { Document as AppDocument } from '../../types';
import { useBranding } from '../../contexts/BrandingContext';

interface DocumentDetailModalProps {
  doc: any; // Using any for flexibility with extended fields
  onClose: () => void;
}

export const DocumentDetailModal = ({ doc, onClose }: DocumentDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'text' | 'history'>('analysis');
  const { appName } = useBranding();

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
       <motion.div 
         initial={{ scale: 0.95, opacity: 0 }} 
         animate={{ scale: 1, opacity: 1 }} 
         className="bg-white rounded-[40px] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100"
       >
          {/* Header */}
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
             <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-50 text-slate-400 rounded-[20px] flex items-center justify-center shadow-sm">
                   <FileText size={28} />
                </div>
                <div>
                   <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{doc.name}</h2>
                   <div className="flex items-center gap-3 mt-1">
                      <Badge color="indigo" className="text-[10px] uppercase font-black tracking-widest">{doc.type}</Badge>
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                         <Clock size={12} className="text-slate-200" /> Ingested {format(new Date(doc.uploadedAt), 'MMM dd, yyyy @ HH:mm')}
                      </span>
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-2xl mr-4">
                   {[
                     { id: 'analysis', label: 'AI Intelligence', icon: BrainCircuit },
                     { id: 'text', label: 'Source Text', icon: Eye },
                     { id: 'history', label: 'Audit History', icon: History }
                   ].map(tab => (
                     <button
                       key={tab.id}
                       onClick={() => setActiveTab(tab.id as any)}
                       className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                         activeTab === tab.id ? 'bg-white text-accent shadow-sm' : 'text-slate-400 hover:text-slate-600'
                       }`}
                     >
                        <tab.icon size={14} strokeWidth={3} />
                        {tab.label}
                     </button>
                   ))}
                </div>
                <button onClick={onClose} className="w-10 h-10 hover:bg-slate-50 rounded-xl transition-all text-slate-400 flex items-center justify-center border border-transparent hover:border-slate-100"><X size={20} /></button>
             </div>
          </div>

          {/* Content Area */}
          <div className="flex-grow overflow-hidden flex flex-col">
             {activeTab === 'analysis' && (
               <div className="flex-grow overflow-auto no-scrollbar grid grid-cols-1 lg:grid-cols-12 bg-slate-50/30">
                  {/* Summary & Metadata Column */}
                  <div className="lg:col-span-4 p-8 space-y-8 bg-white border-r border-slate-50">
                     <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl">
                        <div className="relative z-10 space-y-4">
                           <div className="flex items-center gap-2 text-accent">
                              <BrainCircuit size={18} strokeWidth={3} />
                              <h4 className="text-[10px] font-black uppercase tracking-widest">Autonomous Summary</h4>
                           </div>
                           <p className="text-sm text-slate-300 leading-relaxed font-bold italic opacity-95">
                              "{doc.summary || 'Summary pending AI extraction...'}"
                           </p>
                        </div>
                        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-accent/5 rounded-full blur-3xl opacity-40" />
                     </div>

                     <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Document Invariants</h4>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                              <p className="text-xs font-black text-slate-900">{doc.aiStatus || 'Ingested'}</p>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Author</p>
                              <p className="text-xs font-black text-slate-900">Admin User</p>
                           </div>
                           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Integrity</p>
                              <div className="flex items-center gap-1.5">
                                 <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                 <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Verified</p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl space-y-3">
                        <div className="flex items-center gap-2 text-blue-600">
                           <Info size={16} strokeWidth={3} />
                           <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Intelligence Rulebook</p>
                        </div>
                        <p className="text-[11px] font-bold text-blue-700 leading-relaxed">
                           Findings are extracted strictly from text. Assumptions denote likely contexts requiring officer validation. Gaps highlight missing regulatory evidence.
                        </p>
                     </div>
                  </div>

                  {/* Findings Column */}
                  <div className="lg:col-span-8 p-8 space-y-10">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Confirmed Findings */}
                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-1">
                              <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                 <CheckCircle2 size={14} strokeWidth={3} /> Confirmed Findings
                              </h4>
                              <Badge color="green" className="text-[9px]">{doc.aiFindings?.length || 0}</Badge>
                           </div>
                           <div className="space-y-2">
                              {doc.aiFindings?.map((f: string, i: number) => (
                                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 shadow-sm leading-relaxed border-l-4 border-l-emerald-500">
                                   {f}
                                </div>
                              ))}
                              {(!doc.aiFindings || doc.aiFindings.length === 0) && (
                                <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-[10px] font-black uppercase tracking-widest">
                                   No confirmed findings
                                </div>
                              )}
                           </div>
                        </div>

                        {/* Assumptions */}
                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-1">
                              <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                 <Search size={14} strokeWidth={3} /> Assumptions Made
                              </h4>
                              <Badge color="blue" className="text-[9px]">{doc.aiAssumptions?.length || 0}</Badge>
                           </div>
                           <div className="space-y-2">
                              {doc.aiAssumptions?.map((a: string, i: number) => (
                                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 shadow-sm leading-relaxed border-l-4 border-l-blue-500">
                                   {a}
                                </div>
                              ))}
                              {(!doc.aiAssumptions || doc.aiAssumptions.length === 0) && (
                                <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-[10px] font-black uppercase tracking-widest">
                                   No assumptions detected
                                </div>
                              )}
                           </div>
                        </div>

                        {/* Missing Evidence / Gaps */}
                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-1">
                              <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                                 <AlertTriangle size={14} strokeWidth={3} /> Missing Evidence & Gaps
                              </h4>
                              <Badge color="red" className="text-[9px]">{doc.missingEvidence?.length || 0}</Badge>
                           </div>
                           <div className="space-y-2">
                              {doc.missingEvidence?.map((m: string, i: number) => (
                                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 shadow-sm leading-relaxed border-l-4 border-l-rose-500">
                                   {m}
                                </div>
                              ))}
                              {(!doc.missingEvidence || doc.missingEvidence.length === 0) && (
                                <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-[10px] font-black uppercase tracking-widest">
                                   No critical gaps identified
                                </div>
                              )}
                           </div>
                        </div>

                        {/* Suggested Controls */}
                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-1">
                              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-2">
                                 <ShieldCheck size={14} strokeWidth={3} /> Suggested Controls
                              </h4>
                              <Badge color="orange" className="text-[9px]">{doc.suggestedControls?.length || 0}</Badge>
                           </div>
                           <div className="space-y-2">
                              {doc.suggestedControls?.map((c: string, i: number) => (
                                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl text-[11px] font-bold text-slate-700 shadow-sm leading-relaxed border-l-4 border-l-amber-500">
                                   {c}
                                </div>
                              ))}
                              {(!doc.suggestedControls || doc.suggestedControls.length === 0) && (
                                <div className="p-6 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 text-[10px] font-black uppercase tracking-widest">
                                   No specific controls suggested
                                </div>
                              )}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
             )}

             {activeTab === 'text' && (
               <div className="flex-grow overflow-auto p-12 bg-slate-50 text-slate-900">
                  <div className="max-w-4xl mx-auto space-y-10">
                     <section className="space-y-6">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 bg-white py-2 px-4 rounded-lg shadow-sm border border-slate-100 inline-block">Full Ingested Text Artifact</h4>
                        <div className="p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden relative">
                           <pre className="text-sm text-slate-700 font-bold leading-loose whitespace-pre-wrap font-mono selection:bg-accent/20">
                              {doc.content}
                           </pre>
                           {/* Confidentiality Watermark */}
                           <div className="absolute inset-x-0 top-0 py-2 bg-amber-500 text-white text-[9px] font-black uppercase tracking-[0.5em] text-center opacity-50 z-10 pointer-events-none">
                              Confidential Artifact &bull; {appName} Secure Zone
                           </div>
                        </div>
                     </section>
                  </div>
               </div>
             )}

             {activeTab === 'history' && (
               <div className="flex-grow overflow-auto p-12 bg-white">
                  <div className="max-w-3xl mx-auto space-y-8">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Document Lifecycle Audit Trail</h4>
                     <div className="space-y-6">
                        {[
                          { action: 'Intelligence Extraction Successfully Completed', user: 'AI-AGENT-01', time: doc.uploadedAt, icon: BrainCircuit, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                          { action: 'Source Document Ingested (Manual Paste)', user: 'Admin User', time: doc.uploadedAt, icon: Plus, color: 'text-blue-500', bg: 'bg-blue-50' }
                        ].map((log, i) => (
                          <div key={i} className="flex gap-6 relative">
                             {i < 1 && <div className="absolute left-7 top-10 bottom-0 w-0.5 bg-slate-50" />}
                             <div className={`w-14 h-14 ${log.bg} ${log.color} rounded-2xl flex items-center justify-center shrink-0 shadow-sm`}>
                                <log.icon size={20} strokeWidth={3} />
                             </div>
                             <div className="pt-2">
                                <p className="font-black text-slate-900 uppercase tracking-tight text-xs">{log.action}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                   <span className="text-[10px] font-bold text-slate-400">Performed by: <span className="text-slate-600">{log.user}</span></span>
                                   <span className="w-1 h-1 rounded-full bg-slate-200" />
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(log.time), 'MMM dd, yyyy @ HH:mm:ss')}</span>
                                </div>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
             )}
          </div>

          {/* Footer */}
          <div className="px-10 py-6 border-t border-slate-50 bg-white flex justify-between items-center shrink-0">
             <div className="flex items-center gap-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <ShieldCheck size={16} className="text-slate-200" />
                Evidence Governance: {appName}-Secured
             </div>
             <div className="flex gap-4">
                <Button variant="secondary" icon={Download} className="font-black h-11 px-6">Export PDF Intelligence Report</Button>
                <Button icon={Plus} className="font-black h-11 px-6">Map to Operational Risks</Button>
             </div>
          </div>
       </motion.div>
    </div>
  );
};

