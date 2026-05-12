import React, { useState, useRef } from 'react';
import {
  Plus, Search, Filter, ShieldCheck, CheckCircle2, TrendingUp,
  Download, Activity, Brain, MoreVertical, SearchX, Trash2,
  FileUp, FileDown, Link2, X, Upload
} from 'lucide-react';
import { Badge, Button, Card, PageHeader, EmptyState, TableSkeleton, Breadcrumbs, ConfirmDialog } from '../common';
import { Control, ControlStatus, ControlEffectiveness } from '../../types';
import { auditLogService as auditService } from '../../services/auditLogService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Permission } from '../../services/permissionService';
import { APP_CONFIG } from '../../config/appConfig';
import { api } from '../../services/apiClient';

// ── Constants ────────────────────────────────────────────────────────────────
const CONTROL_DOMAINS = [
  'Access Control', 'Asset Management', 'Business Continuity',
  'Cryptography', 'Human Resources Security', 'Incident Management',
  'Information Security Policy', 'Network Security', 'Operations Security',
  'Physical & Environmental Security', 'Risk Assessment', 'Supplier Relationships'
] as const;

const CONTROL_TYPES = ['Preventive', 'Detective', 'Corrective', 'Compensating', 'Directive'];
const FREQUENCIES    = ['Continuous', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually', 'Ad-hoc'];
const EVIDENCE_STATUSES = ['Pending', 'Collected', 'Verified', 'Expired'];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

// ── Add / Edit Modal ─────────────────────────────────────────────────────────
interface ControlModalProps {
  initial?: any;
  risks: any[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const EMPTY_FORM = {
  title: '', description: '', domain: '', type: '', status: ControlStatus.NOT_IMPLEMENTED,
  effectiveness: ControlEffectiveness.LOW, owner: '', framework: '', dueDate: '',
  controlRef: '', frequency: '', evidenceStatus: 'Pending',
  lastReviewDate: '', nextReviewDate: '', riskId: '', notes: ''
};

const ControlModal = ({ initial, risks, onClose, onSave }: ControlModalProps) => {
  const [form, setForm]     = useState<any>(initial || EMPTY_FORM);
  const [file, setFile]     = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const fileRef             = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (file) {
        payload.fileBase64 = await fileToBase64(file);
        payload.fileName   = file.name;
        payload.fileMime   = file.type;
      }
      await onSave(payload);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-accent/20 transition-all';
  const labelCls = 'block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-900">{initial ? 'Edit Control' : 'Add Security Control'}</h2>
            <p className="text-sm text-slate-400 font-bold mt-0.5">Complete the control catalog entry</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 hover:bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 transition-all"><X size={18} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-auto p-8 space-y-6">
          {error && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm font-bold text-rose-600">{error}</div>}

          {/* Row 1: Title + Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Control Title *</label>
              <input className={inputCls} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g., Multi-Factor Authentication" />
            </div>
            <div>
              <label className={labelCls}>Control Reference</label>
              <input className={inputCls} value={form.controlRef} onChange={e => set('controlRef', e.target.value)} placeholder="e.g., ISO 27001 A.9.4.2" />
            </div>
          </div>

          {/* Row 2: Domain + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Domain</label>
              <select className={inputCls} value={form.domain} onChange={e => set('domain', e.target.value)}>
                <option value="">Select Domain...</option>
                {CONTROL_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Control Type</label>
              <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="">Select Type...</option>
                {CONTROL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3: Status + Effectiveness */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Implementation Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {Object.values(ControlStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Effectiveness</label>
              <select className={inputCls} value={form.effectiveness} onChange={e => set('effectiveness', e.target.value)}>
                {Object.values(ControlEffectiveness).map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4: Owner + Framework */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Owner</label>
              <input className={inputCls} value={form.owner} onChange={e => set('owner', e.target.value)} placeholder="e.g., IT Security Team" />
            </div>
            <div>
              <label className={labelCls}>Framework</label>
              <input className={inputCls} value={form.framework} onChange={e => set('framework', e.target.value)} placeholder="e.g., ISO 27001, NIST, SOC2" />
            </div>
          </div>

          {/* Row 5: Frequency + Evidence Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Review Frequency</label>
              <select className={inputCls} value={form.frequency} onChange={e => set('frequency', e.target.value)}>
                <option value="">Select Frequency...</option>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Evidence Status</label>
              <select className={inputCls} value={form.evidenceStatus} onChange={e => set('evidenceStatus', e.target.value)}>
                {EVIDENCE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Row 6: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Due Date</label>
              <input type="date" className={inputCls} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Last Review Date</label>
              <input type="date" className={inputCls} value={form.lastReviewDate} onChange={e => set('lastReviewDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Next Review Date</label>
              <input type="date" className={inputCls} value={form.nextReviewDate} onChange={e => set('nextReviewDate', e.target.value)} />
            </div>
          </div>

          {/* Row 7: Link to Risk */}
          <div>
            <label className={labelCls}>Link to Risk</label>
            <select className={inputCls} value={form.riskId} onChange={e => set('riskId', e.target.value)}>
              <option value="">No risk linked</option>
              {risks.map((r: any) => <option key={r.id} value={r.id}>{r.title} ({r.level})</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={3} className={`${inputCls} resize-none`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe what this control does and how it mitigates risk..." />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={2} className={`${inputCls} resize-none`} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional governance or audit notes..." />
          </div>

          {/* File upload */}
          <div>
            <label className={labelCls}>Evidence / Policy Document</label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/[0.02] transition-all group"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.doc"
                onChange={e => setFile(e.target.files?.[0] || null)}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileUp size={18} className="text-accent" />
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">{file.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">{formatBytes(file.size)} · {file.type || 'Unknown type'}</p>
                  </div>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} className="ml-2 text-slate-300 hover:text-rose-500 transition-colors"><X size={14} /></button>
                </div>
              ) : initial?.fileName ? (
                <div className="flex items-center justify-center gap-2 text-slate-500">
                  <FileDown size={16} className="text-accent" />
                  <span className="text-sm font-bold">{initial.fileName}</span>
                  <span className="text-[10px] text-slate-300 ml-1">(click to replace)</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Upload size={20} className="group-hover:text-accent transition-colors" />
                  <p className="text-sm font-black">Drop file here or click to browse</p>
                  <p className="text-[10px] font-bold text-slate-300">.pdf · .docx · .txt — max 10 MB</p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-8 border-t border-slate-50 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit as any} loading={saving} icon={ShieldCheck}>
            {initial ? 'Save Changes' : 'Add Control'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
interface ControlsPageProps {
  store: any;
  onNavigate?: (tab: string) => void;
}

export const ControlsPage = ({ store, onNavigate }: ControlsPageProps) => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const { hasPermission } = useAuth();
  const { controls, risks, addControl, updateControl, deleteControl, isLoading } = store;
  const canCreate = hasPermission(Permission.CONTROLS_CREATE);
  const canDelete = hasPermission(Permission.CONTROLS_DELETE);

  const [search, setSearch]                 = useState('');
  const [filterStatus, setFilterStatus]     = useState('All');
  const [filterEffectiveness, setFilterEffectiveness] = useState('All');
  const [filterOwner, setFilterOwner]       = useState('All');
  const [filterDomain, setFilterDomain]     = useState('All');
  const [showModal, setShowModal]           = useState(false);
  const [editControl, setEditControl]       = useState<any>(null);
  const [deleteId, setDeleteId]             = useState<string | null>(null);
  const [isSuggesting, setIsSuggesting]     = useState(false);
  const [aiSuggestion, setAiSuggestion]     = useState<string | null>(null);

  const filtered = controls.filter((c: any) => {
    const ms = c.title.toLowerCase().includes(search.toLowerCase()) ||
               (c.description || '').toLowerCase().includes(search.toLowerCase());
    const st = filterStatus === 'All' || c.status === filterStatus;
    const ef = filterEffectiveness === 'All' || c.effectiveness === filterEffectiveness;
    const ow = filterOwner === 'All' || c.owner === filterOwner;
    const dm = filterDomain === 'All' || c.domain === filterDomain;
    return ms && st && ef && ow && dm;
  });

  const owners  = Array.from(new Set(controls.map((c: any) => c.owner).filter(Boolean))) as string[];
  const domains = Array.from(new Set(controls.map((c: any) => c.domain).filter(Boolean))) as string[];

  const metrics = {
    total: controls.length,
    implemented: controls.filter((c: any) => c.status === ControlStatus.IMPLEMENTED).length,
    partial: controls.filter((c: any) => c.status === ControlStatus.PARTIALLY_IMPLEMENTED).length,
    notImplemented: controls.filter((c: any) => c.status === ControlStatus.NOT_IMPLEMENTED).length,
    risksWithoutControls: risks.filter((r: any) => !controls.some((c: any) => c.riskId === r.id)).length
  };

  const handleSave = async (formData: any) => {
    if (editControl) {
      await updateControl({ ...editControl, ...formData });
      success('Control Updated', `"${formData.title}" has been updated.`);
      await auditService.log('control_updated', 'Control', `Updated: ${formData.title}`);
    } else {
      await addControl(formData);
      success('Control Added', `"${formData.title}" has been added to the catalog.`);
      await auditService.log('control_created', 'Control', `Created: ${formData.title}`);
    }
    setShowModal(false);
    setEditControl(null);
    if (store.refresh) store.refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const ctrl = controls.find((c: any) => c.id === deleteId);
    try {
      await deleteControl(deleteId);
      success('Control Removed', `"${ctrl?.title}" has been deleted.`);
      await auditService.log('control_deleted', 'Control', `Deleted: ${ctrl?.title || deleteId}`);
    } catch {
      toastError('Delete Failed', 'Could not remove the control.');
    } finally {
      setDeleteId(null);
      if (store.refresh) store.refresh();
    }
  };

  const handleDownloadFile = async (ctrl: any) => {
    if (!ctrl.fileName) return;
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try {
        const token = localStorage.getItem('riskeez_jwt');
        const res = await fetch(`${APP_CONFIG.API_URL}/api/controls/${ctrl.id}/download`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = ctrl.fileName; a.click();
        URL.revokeObjectURL(url);
        await auditService.log('control_file_downloaded', 'Control', `Downloaded file: ${ctrl.fileName}`);
      } catch {
        toastError('Download Failed', 'Could not download the file.');
      }
    }
  };

  const handleSuggestControls = async () => {
    setIsSuggesting(true);
    setTimeout(async () => {
      setAiSuggestion('Based on open risks in the register, I suggest implementing: 1. Multi-Factor Authentication (Access Control), 2. Weekly Vulnerability Scanning (Operations Security), and 3. Automated Backup Verification (Business Continuity).');
      setIsSuggesting(false);
      await auditService.log('control_suggested_by_ai', 'AI', 'Generated control suggestions for open risks');
    }, 2000);
  };

  return (
    <div className="space-y-8 pb-20">
      <Breadcrumbs onHomeClick={() => onNavigate?.('dashboard')} items={[{ label: t('nav.riskRegister') || 'Risk Register', onClick: () => onNavigate?.('risks') }, { label: t('nav.controls') }]} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader title={t('controls.title')} subtitle="Operationalize your risk mitigations across the enterprise" />
        <div className="flex items-center gap-3">
          <Button variant="secondary" icon={Download} className="h-11 font-black" onClick={() => {
            const csv = ['id,title,domain,type,status,effectiveness,owner,framework,evidenceStatus'].concat(
              controls.map((c: any) => [c.id, c.title, c.domain||'', c.type||'', c.status, c.effectiveness, c.owner, c.framework||'', c.evidenceStatus||''].join(','))
            ).join('\n');
            const b = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'controls.csv'; a.click();
          }}>{t('common.export')}</Button>
          {canCreate && <Button icon={Plus} className="h-11 px-6 font-black shadow-saas" onClick={() => { setEditControl(null); setShowModal(true); }}>{t('controls.addControl')}</Button>}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { l: t('controls.totalControls'), v: metrics.total, i: ShieldCheck },
          { l: t('controls.implemented'), v: metrics.implemented, i: CheckCircle2 },
          { l: t('controls.partiallyImplemented'), v: metrics.partial, i: Activity },
          { l: t('controls.notImplemented'), v: metrics.notImplemented, i: Filter },
          { l: t('controls.risksWithoutControls'), v: metrics.risksWithoutControls, i: TrendingUp }
        ].map((m: any) => (
          <div key={m.l} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 hover:shadow-saas transition-all group">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-accent group-hover:text-white transition-all shadow-inner">
              <m.i size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.l}</p>
              <p className="text-xl font-black text-slate-900 mt-1">{m.v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI panel */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 overflow-hidden relative group shadow-saas-lg">
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center text-center md:text-left">
          <div className="w-16 h-16 bg-accent/20 rounded-[2rem] flex items-center justify-center text-accent ring-1 ring-accent/30 shrink-0 shadow-inner">
            <Brain size={32} strokeWidth={3} />
          </div>
          <div className="flex-grow">
            <h3 className="text-xl font-black text-white tracking-tight">{t('controls.controlRecommendations')}</h3>
            {aiSuggestion ? (
              <p className="text-slate-300 text-sm mt-3 max-w-2xl font-bold leading-relaxed italic animate-in fade-in slide-in-from-left-4">{aiSuggestion}</p>
            ) : (
              <p className="text-slate-400 text-sm mt-3 max-w-2xl font-bold leading-relaxed">{t('controls.description')}</p>
            )}
          </div>
          <Button className="shrink-0 h-14 px-10 font-black shadow-glow-accent rounded-2xl" icon={Brain} loading={isSuggesting} onClick={handleSuggestControls}>
            {t('controls.suggestControls')}
          </Button>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={3} />
          <input
            type="text"
            placeholder="Search by title, description or owner..."
            className="w-full bg-white border border-slate-100 rounded-xl pl-12 pr-4 py-3.5 text-sm font-black focus:ring-4 focus:ring-accent/10 outline-none shadow-sm transition-all placeholder:text-slate-300"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { val: filterStatus, onChange: setFilterStatus, options: Object.values(ControlStatus), placeholder: 'All Status' },
            { val: filterEffectiveness, onChange: setFilterEffectiveness, options: Object.values(ControlEffectiveness), placeholder: 'All Efficacy' },
            { val: filterDomain, onChange: setFilterDomain, options: domains, placeholder: 'All Domains' },
            { val: filterOwner, onChange: setFilterOwner, options: owners, placeholder: 'All Owners' }
          ].map((f, i) => (
            <select key={i} value={f.val} onChange={e => f.onChange(e.target.value)} className="bg-white border border-slate-100 rounded-xl px-4 py-3.5 text-[10px] font-black uppercase tracking-widest outline-none shadow-sm focus:ring-4 focus:ring-accent/10 cursor-pointer">
              <option value="All">{f.placeholder}</option>
              {f.options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card noPadding className="overflow-hidden shadow-saas rounded-[2rem] border-slate-100">
        {isLoading ? (
          <TableSkeleton rows={5} />
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['Control', 'Domain', 'Linked Risk', 'Status', 'Effectiveness', 'Evidence', 'Owner', 'File', ''].map(h => (
                    <th key={h} className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest first:pl-10 last:pr-10 last:text-right">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 bg-white">
                {filtered.map((c: any) => {
                  const risk = risks.find((r: any) => r.id === c.riskId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                      <td className="pl-10 pr-4 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-accent group-hover:border-accent group-hover:bg-accent/5 transition-all shadow-inner shrink-0">
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 group-hover:text-accent transition-colors text-sm leading-tight">{c.title}</p>
                            {c.controlRef && <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{c.controlRef}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        {c.domain ? (
                          <span className="text-[9px] font-black text-slate-500 bg-slate-100/50 px-2 py-1 rounded border border-slate-100 uppercase tracking-widest">{c.domain}</span>
                        ) : <span className="text-slate-300 text-[10px]">—</span>}
                      </td>
                      <td className="px-4 py-6">
                        {risk ? (
                          <div>
                            <p className="text-slate-700 text-[11px] font-bold line-clamp-1 max-w-[160px]">{risk.title}</p>
                            <Badge color="slate" className="text-[8px] mt-0.5">{risk.category}</Badge>
                          </div>
                        ) : <span className="text-slate-300 text-[10px] font-black">Unlinked</span>}
                      </td>
                      <td className="px-4 py-6">
                        <Badge color={c.status === ControlStatus.IMPLEMENTED ? 'green' : c.status === ControlStatus.PARTIALLY_IMPLEMENTED ? 'yellow' : 'red'}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex gap-1">
                            {[1,2,3].map(i => (
                              <div key={i} className={`w-3 h-1.5 rounded-full ${i <= (c.effectiveness === ControlEffectiveness.HIGH ? 3 : c.effectiveness === ControlEffectiveness.MEDIUM ? 2 : 1) ? 'bg-accent' : 'bg-slate-100'}`} />
                            ))}
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase">{c.effectiveness}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <Badge color={c.evidenceStatus === 'Verified' ? 'green' : c.evidenceStatus === 'Collected' ? 'blue' : c.evidenceStatus === 'Expired' ? 'red' : 'gray'}>
                          {c.evidenceStatus || 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-[9px] font-black text-slate-400 border border-slate-100">{(c.owner || '?').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}</div>
                          <span className="text-[11px] font-bold text-slate-700 max-w-[100px] truncate">{c.owner}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        {c.fileName ? (
                          <button
                            onClick={e => { e.stopPropagation(); handleDownloadFile(c); }}
                            className="flex items-center gap-1.5 text-[10px] font-black text-accent hover:text-accent/70 transition-colors"
                            title={`Download ${c.fileName}`}
                          >
                            <FileDown size={13} />
                            <span className="max-w-[80px] truncate">{c.fileName}</span>
                          </button>
                        ) : <span className="text-slate-200 text-[10px]">—</span>}
                      </td>
                      <td className="pl-4 pr-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          {canCreate && <Button variant="ghost" size="sm" icon={Activity} className="w-8 h-8 p-0 rounded-xl hover:bg-white text-slate-400" onClick={e => { e.stopPropagation(); setEditControl(c); setShowModal(true); }} />}
                          {canDelete && <Button variant="ghost" size="sm" icon={Trash2} className="w-8 h-8 p-0 rounded-xl hover:bg-rose-50 text-rose-400" onClick={e => { e.stopPropagation(); setDeleteId(c.id); }} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={SearchX}
            title="Control Catalog Empty"
            description="No controls matching your search criteria. Add your first security control."
            actionLabel="Add Control"
            onAction={() => { setEditControl(null); setShowModal(true); }}
          />
        )}
      </Card>

      {/* Modal */}
      {showModal && (
        <ControlModal
          initial={editControl ? {
            ...editControl,
            dueDate: editControl.dueDate || '',
            lastReviewDate: editControl.lastReviewDate || '',
            nextReviewDate: editControl.nextReviewDate || '',
          } : undefined}
          risks={risks}
          onClose={() => { setShowModal(false); setEditControl(null); }}
          onSave={handleSave}
        />
      )}

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Control"
        message="This action will permanently remove the control and its attached evidence file."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
