import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, Plus, Search, Download, FileDown,
  MoreVertical, Trash2, Link2, BrainCircuit, AlertCircle, Info, SearchX, ShieldCheck,
  Filter, Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { Document as AppDocument } from '../../types';
import { Card, Button, Badge, EmptyState, PageHeader, Breadcrumbs, TableSkeleton, ConfirmDialog } from '../common';
import { DocumentDetailModal } from './DocumentDetailModal';
import { DocumentUploadModal, DOCUMENT_TYPES } from './DocumentUploadModal';
import { AIFrontService } from '../../services/aiFrontService';
import { useToast } from '../../contexts/ToastContext';
import { auditLogService } from '../../services/auditLogService';
import { useLanguage } from '../../contexts/LanguageContext';
import { APP_CONFIG } from '../../config/appConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useBranding } from '../../contexts/BrandingContext';
import { Permission } from '../../services/permissionService';

interface DocumentsPageProps {
  store: any;
  onNavigate?: (tab: string) => void;
}

export const DocumentsPage = ({ store, onNavigate }: DocumentsPageProps) => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const { appName } = useBranding();
  const { documents, addDocument, updateDocument, deleteDocument, isLoading, risks = [], controls = [], assessments = [] } = store;
  const { success, error: toastError } = useToast();
  const canCreate = hasPermission(Permission.DOCUMENTS_CREATE);
  const canUpdate = hasPermission(Permission.DOCUMENTS_UPDATE);
  const canDelete = hasPermission(Permission.DOCUMENTS_DELETE);
  const [search, setSearch]               = useState('');
  const [filterType, setFilterType]       = useState('All');
  const [filterStatus, setFilterStatus]   = useState('All');
  const [filterConf, setFilterConf]       = useState('All');
  const [selectedDoc, setSelectedDoc]     = useState<AppDocument | null>(null);
  const [isUploadOpen, setIsUploadOpen]   = useState(false);
  const [editDoc, setEditDoc]             = useState<any>(null);
  const [isAnalyzingId, setIsAnalyzingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredDocs = documents.filter((d: any) => {
    const ms  = d.name.toLowerCase().includes(search.toLowerCase()) || (d.type || '').toLowerCase().includes(search.toLowerCase()) || (d.author || '').toLowerCase().includes(search.toLowerCase());
    const mt  = filterType === 'All' || d.type === filterType;
    const mst = filterStatus === 'All' || d.status === filterStatus;
    const mc  = filterConf === 'All' || d.confidentiality === filterConf;
    return ms && mt && mst && mc;
  });

  const handleUploadSave = async (formData: any) => {
    if (editDoc) {
      await updateDocument({ ...editDoc, ...formData });
      success('Document Updated', `"${formData.name}" has been updated.`);
      await auditLogService.log('document_updated', 'Document', `Updated: ${formData.name}`);
    } else {
      await addDocument(formData);
      success('Document Uploaded', `"${formData.name}" has been added to the vault.`);
      await auditLogService.log('document_uploaded', 'Document', `Uploaded: ${formData.name}`);
    }
    setIsUploadOpen(false);
    setEditDoc(null);
    if (store.refresh) store.refresh();
  };

  const handleDownloadFile = async (doc: any) => {
    if (!doc.fileName) { toastError('No File', 'This document has no attached file.'); return; }
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try {
        const token = localStorage.getItem('riskeez_jwt');
        const res = await fetch(`${APP_CONFIG.API_URL}/api/documents/${doc.id}/download`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = doc.fileName; a.click();
        URL.revokeObjectURL(url);
        await auditLogService.log('document_downloaded', 'Document', `Downloaded: ${doc.name}`);
      } catch {
        toastError('Download Failed', 'Could not download the file.');
      }
    }
  };

  const handleAnalyze = async (doc: AppDocument) => {
    setIsAnalyzingId(doc.id);
    try {
      const isAz = /[\u0600-\u06FF\u0400-\u04FF]/.test(doc.content);
      const language = isAz ? "Azerbaijani" : "English";
      
      const analysis = await AIFrontService.generate('document_analysis', { 
        text: doc.content,
        metadata: { title: doc.name, type: doc.type },
        language
      });
      
      await updateDocument({
        ...doc,
        summary: analysis.summary,
        detectedRisks: analysis.relevantRiskAreas,
        missingEvidence: analysis.missingEvidence,
        suggestedControls: analysis.suggestedControls,
        relatedRisks: analysis.relatedRisks,
        aiFindings: analysis.confirmedFindings,
        aiAssumptions: analysis.assumptions,
        aiStatus: 'Analyzed'
      });
      success('Analysis Context Updated', `Intelligence extraction complete for ${doc.name}.`);
      await auditLogService.log('document_analyzed', 'Document', `AI analysis complete for: ${doc.name}`);
    } catch (err) {
      console.error("Analysis failed:", err);
      toastError('Analysis Cluster Failure', 'Failed to synchronize intelligence extraction.');
    } finally {
      setIsAnalyzingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const doc = documents.find((d: any) => d.id === deleteConfirmId);
      await deleteDocument(deleteConfirmId);
      success('Artifact Purged', 'Document has been permanently removed from the secure vault.');
      await auditLogService.log('document_deleted', 'Document', `Deleted artifact: ${doc?.name || deleteConfirmId}`);
    } catch (err) {
      toastError('Deletion Inhibited', 'The system was unable to purge the requested artifact.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleExportVault = async () => {
    // Show confirmation before exporting sensitive data
    if (!confirm('You are about to export all artifacts from the secure vault. This may contain highly confidential information. Proceed?')) return;
    
    // In production, this would generate a signed download link or ZIP
    const headers = ['ID', 'Name', 'Type', 'Uploaded At', 'AI Status'];
    const data = documents.map((d: any) => [d.id, d.name, d.type, d.uploadedAt, d.aiStatus]);
    const csvContent = [headers, ...data].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `riskeez_vault_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
    
    success('Vault Exported', 'A manifest of all recorded artifacts has been generated.');
    await auditLogService.log('vault_exported', 'Document', `Exported ${documents.length} artifact records`, 'High', 'UI');
  };

  return (
    <div className="space-y-8 pb-20">
      <Breadcrumbs onHomeClick={() => onNavigate('dashboard')} items={[{ label: t('nav.riskRegister') || 'Intelligence Vault', onClick: () => onNavigate('risks') }, { label: t('nav.documents') }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader 
          title={t('documents.title')} 
          subtitle="Encryption-backed storage with AI-driven discovery and validation"
        />
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={Download} onClick={handleExportVault} className="h-11 font-black">{t('common.export')}</Button>
          {canCreate && <Button onClick={() => { setEditDoc(null); setIsUploadOpen(true); }} icon={Plus} className="h-11 px-6 font-black shadow-saas">{t('documents.addDocument')}</Button>}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={3} />
          <input
            type="text"
            placeholder="Search documents by name, type, author..."
            className="w-full bg-white border border-slate-100 rounded-2xl pl-14 pr-5 py-3.5 text-sm font-black focus:ring-4 focus:ring-accent/10 outline-none shadow-sm transition-all placeholder:text-slate-300"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-4 focus:ring-accent/10 cursor-pointer">
            <option value="All">All Types</option>
            {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-4 focus:ring-accent/10 cursor-pointer">
            <option value="All">All Status</option>
            {['Draft', 'Under Review', 'Approved', 'Superseded', 'Archived'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterConf} onChange={e => setFilterConf(e.target.value)} className="bg-white border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-4 focus:ring-accent/10 cursor-pointer">
            <option value="All">All Levels</option>
            {['Public', 'Internal', 'Confidential', 'Restricted', 'Top Secret'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] mb-4 shadow-saas relative overflow-hidden">
          <div className="shrink-0 w-12 h-12 bg-accent/20 rounded-2xl flex items-center justify-center text-accent shadow-sm border border-accent/20 z-10">
             <ShieldCheck size={24} strokeWidth={3} />
          </div>
          <div className="z-10">
             <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1.5 flex items-center gap-2">
                Confidentiality Protocol Active
                <Badge color="blue" className="bg-blue-500/20 text-blue-400 border-blue-500/20 py-0">AES-256</Badge>
             </p>
             <p className="text-[10px] font-bold text-slate-400 leading-relaxed max-w-3xl">
                All artifacts are cryptographically isolated per organization. AI-driven analysis is executed in secure memory buffers. {appName} enforces a Zero-Trust architecture where document content is never exposed to model training sets.
             </p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl" />
      </div>

      <Card noPadding className="overflow-hidden shadow-saas rounded-[2.5rem] border-slate-100 bg-white">
         {isLoading ? (
           <TableSkeleton rows={5} />
         ) : filteredDocs.length > 0 ? (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="pl-10 pr-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[300px]">Document Name</th>
                        <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Confidentiality</th>
                        <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Author</th>
                        <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Uploaded</th>
                        <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">AI</th>
                        <th className="pl-4 pr-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {filteredDocs.map((doc: any) => (
                       <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                          <td className="pl-10 pr-4 py-7" onClick={() => setSelectedDoc(doc)}>
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-50 text-slate-400 group-hover:bg-accent/10 group-hover:text-accent rounded-xl flex items-center justify-center transition-all shadow-inner shrink-0">
                                   <FileText size={18} />
                                </div>
                                <div className="max-w-[240px]">
                                   <p className="font-black text-slate-900 group-hover:text-accent transition-colors text-sm truncate">{doc.name}</p>
                                   {doc.fileName && (
                                     <p className="text-[9px] text-slate-400 font-bold mt-0.5 truncate flex items-center gap-1">
                                       <FileDown size={9} />{doc.fileName}
                                     </p>
                                   )}
                                   {(doc.tags || []).length > 0 && (
                                     <div className="flex gap-1 mt-1 flex-wrap">
                                       {(doc.tags || []).slice(0, 3).map((tag: string) => (
                                         <span key={tag} className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{tag}</span>
                                       ))}
                                     </div>
                                   )}
                                </div>
                             </div>
                          </td>
                          <td className="px-4 py-7" onClick={() => setSelectedDoc(doc)}>
                             <Badge color="indigo" className="text-[9px] uppercase tracking-widest font-black">{doc.type}</Badge>
                          </td>
                          <td className="px-4 py-7" onClick={() => setSelectedDoc(doc)}>
                             <Badge color={doc.status === 'Approved' ? 'green' : doc.status === 'Archived' ? 'gray' : doc.status === 'Under Review' ? 'yellow' : 'blue'}>
                               {doc.status || 'Draft'}
                             </Badge>
                          </td>
                          <td className="px-4 py-7" onClick={() => setSelectedDoc(doc)}>
                             <Badge color={doc.confidentiality === 'Restricted' || doc.confidentiality === 'Top Secret' ? 'red' : doc.confidentiality === 'Confidential' ? 'yellow' : 'gray'}>
                               {doc.confidentiality || 'Internal'}
                             </Badge>
                          </td>
                          <td className="px-4 py-7" onClick={() => setSelectedDoc(doc)}>
                             <span className="text-[11px] font-bold text-slate-600">{doc.author || '—'}</span>
                          </td>
                          <td className="px-4 py-7" onClick={() => setSelectedDoc(doc)}>
                             <p className="text-[10px] font-black text-slate-500 tabular-nums">{format(new Date(doc.uploadedAt), 'MMM dd, yyyy')}</p>
                             {doc.version && <p className="text-[9px] text-slate-300 font-bold">v{doc.version}</p>}
                          </td>
                          <td className="px-4 py-7 text-center" onClick={() => setSelectedDoc(doc)}>
                             {doc.aiStatus === 'Analyzed' ? (
                               <div className="w-7 h-7 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center shadow-inner mx-auto" title="AI Extraction Complete"><BrainCircuit size={14} /></div>
                             ) : doc.aiStatus === 'Failed' ? (
                               <div className="w-7 h-7 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center shadow-inner mx-auto" title="Failed"><AlertCircle size={14} /></div>
                             ) : (
                               <div className="w-7 h-7 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center shadow-inner mx-auto"><div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse" /></div>
                             )}
                          </td>
                          <td className="pl-4 pr-10 py-7 text-right">
                             <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                {doc.fileName && (
                                  <Button variant="ghost" size="sm" icon={FileDown} className="w-8 h-8 p-0 rounded-xl bg-white border border-slate-100 text-accent hover:bg-accent/10" onClick={e => { e.stopPropagation(); handleDownloadFile(doc); }} title="Download File" />
                                )}
                                <Button variant="ghost" size="sm" icon={BrainCircuit} className="w-8 h-8 p-0 rounded-xl bg-white border border-slate-100 text-accent hover:bg-accent hover:text-white" onClick={e => { e.stopPropagation(); handleAnalyze(doc); }} loading={isAnalyzingId === doc.id} title="AI Extraction" />
                                {canUpdate && <Button variant="ghost" size="sm" icon={MoreVertical} className="w-8 h-8 p-0 rounded-xl bg-white border border-slate-100 text-slate-400" onClick={e => { e.stopPropagation(); setEditDoc(doc); setIsUploadOpen(true); }} title="Edit" />}
                                {canDelete && <Button variant="ghost" size="sm" icon={Trash2} className="w-8 h-8 p-0 rounded-xl bg-white border border-slate-100 text-rose-400 hover:bg-rose-50" onClick={e => { e.stopPropagation(); setDeleteConfirmId(doc.id); }} title="Delete" />}
                             </div>
                          </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         ) : (
            <EmptyState 
              title="Intelligence Vault Empty" 
              description="No policies, procedures, or vendor artifacts matching your search parameters were found."
              icon={SearchX}
              actionLabel="Ingest First Artifact"
              onAction={() => setIsInputOpen(true)}
            />
         )}
      </Card>

      <AnimatePresence>
        {selectedDoc && (
          <DocumentDetailModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        )}
      </AnimatePresence>

      {isUploadOpen && (
        <DocumentUploadModal
          initial={editDoc}
          risks={risks}
          controls={controls}
          assessments={assessments}
          onClose={() => { setIsUploadOpen(false); setEditDoc(null); }}
          onSave={handleUploadSave}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Purge Artifact Permanent"
        description="This action will permanently invalidate and remove the artifact from the secure intelligence vault. This action CANNOT be reversed."
        confirmLabel="Permanent Purge"
        variant="danger"
      />
    </div>
  );
};
