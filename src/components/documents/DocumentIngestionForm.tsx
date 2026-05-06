import React, { useState } from 'react';
import { FileUp, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, Button } from '../common';
import { AIFrontService } from '../../services/aiFrontService';
import { auditLogService } from '../../services/auditLogService';

interface DocumentIngestionFormProps {
  onClose: () => void;
  onAddDocument: (doc: any) => Promise<any>;
}

export const DocumentIngestionForm = ({ onClose, onAddDocument }: DocumentIngestionFormProps) => {
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('Policy');
  const [docContent, setDocContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateDocument = async () => {
    if (!docName) {
      setError('Document name is required');
      return;
    }
    if (!docContent || docContent.length < 20) {
      setError('Document content is too short for meaningful analysis (minimum 20 characters)');
      return;
    }
    
    setError(null);
    setIsAnalyzing(true);
    try {
      const isAz = /[\u0600-\u06FF\u0400-\u04FF]/.test(docContent);
      const language = isAz ? "Azerbaijani" : "English";
      
      // Using document_analysis task which follows professional rules
      const analysis = await AIFrontService.generate('document_analysis', { 
        text: docContent,
        metadata: { title: docName, type: docType },
        language
      });
      
      await onAddDocument({
        organizationId: 'org-1',
        name: docName,
        type: docType,
        content: docContent,
        summary: analysis.summary,
        detectedRisks: analysis.relevantRiskAreas,
        missingEvidence: analysis.missingEvidence,
        suggestedControls: analysis.suggestedControls,
        relatedRisks: analysis.relatedRisks,
        aiFindings: analysis.confirmedFindings,
        aiAssumptions: analysis.assumptions,
        aiStatus: 'Analyzed'
      });

      await auditLogService.log('document_pasted', 'Document', `Ingested and analyzed artifact: ${docName}`);
      onClose();
    } catch (err: any) {
      console.error("AI Analysis Error:", err);
      setError('Analysis failed. The artifact was saved but intelligence extraction remains pending.');
      
      // Still save if content exists but analysis fails
      await onAddDocument({
        organizationId: 'org-1',
        name: docName,
        type: docType,
        content: docContent,
        aiStatus: 'Failed'
      });
      onClose();
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card 
      title="Professional Artifact Ingestion" 
      subtitle="Upload or paste evidence for hyper-secure AI intelligence extraction" 
      className="shadow-2xl border-slate-100 bg-white"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
         <div className="space-y-8">
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">Document Identity</label>
                  <input 
                    type="text" 
                    className={`w-full bg-slate-50 border ${error === 'Document name is required' ? 'border-red-300' : 'border-transparent'} rounded-xl px-5 py-4 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-slate-300`}
                    placeholder="e.g. Employee Cyber Awareness Policy v2.0"
                    value={docName}
                    onChange={e => setDocName(e.target.value)}
                  />
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">Evidence Category</label>
                  <select 
                    className="w-full bg-slate-50 border border-transparent rounded-xl px-5 py-4 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                  >
                     {[
                       'Policy', 'Procedure', 'Audit Report', 'Vendor Contract', 
                       'Incident Report', 'Business Continuity Plan', 'Compliance Evidence', 'Other'
                     ].map(t => (
                       <option key={t} value={t}>{t}</option>
                     ))}
                  </select>
               </div>
               <div className="group cursor-pointer">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">File Source</label>
                  <div className="p-10 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300 group-hover:border-accent group-hover:text-accent group-hover:bg-accent/[0.02] transition-all relative overflow-hidden">
                     <FileUp size={32} className="mb-3 transition-transform group-hover:-translate-y-1" />
                     <span className="text-[10px] font-black uppercase tracking-widest">Mock Local Upload</span>
                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" disabled />
                  </div>
               </div>
            </div>
         </div>

         <div className="space-y-8">
            <div>
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block px-1">Source Content Analysis (AI Extraction Ready)</label>
               <textarea 
                 rows={12}
                 className={`w-full bg-slate-50 border ${error && error.includes('content') ? 'border-red-300' : 'border-transparent'} rounded-xl px-5 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none resize-none font-mono text-[11px] transition-all placeholder:text-slate-300`}
                 placeholder="Paste full document content here. AI will extract risks, controls, and findings..."
                 value={docContent}
                 onChange={e => setDocContent(e.target.value)}
               />
               {error && (
                 <div className="mt-3 flex items-center gap-2 text-red-500 font-black text-[10px] uppercase tracking-wider px-1">
                    <AlertTriangle size={14} />
                    {error}
                 </div>
               )}
            </div>
            <div className="flex gap-4">
               <Button variant="secondary" className="flex-grow h-12 font-black" onClick={onClose}>Discard</Button>
               <Button 
                className="flex-grow h-12 font-black px-10" 
                onClick={handleCreateDocument} 
                disabled={isAnalyzing} 
                loading={isAnalyzing}
               >
                  {isAnalyzing ? 'Extracting Intelligence...' : 'Ingest and Analyze'}
               </Button>
            </div>
         </div>
      </div>

      <div className="mt-10 p-5 bg-amber-50/50 border border-amber-100/50 rounded-2xl flex items-start gap-4">
         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
            <Info size={20} strokeWidth={3} />
         </div>
         <div className="space-y-1">
            <p className="text-[11px] text-amber-800 font-black leading-relaxed uppercase tracking-wider">
               Strict Confidentiality Notice
            </p>
            <p className="text-[11px] text-amber-700 font-bold leading-relaxed">
               All uploaded or pasted documents are treated as highly confidential business information. Intelligence extracted by the Agentic AI remains within your organizational context.
            </p>
         </div>
      </div>
    </Card>
  );
};

