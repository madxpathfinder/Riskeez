import React, { useState, useRef } from 'react';
import { X, Upload, FileUp, FileDown, Link2 } from 'lucide-react';
import { Button } from '../common';

// ── Constants ────────────────────────────────────────────────────────────────
export const DOCUMENT_TYPES = [
  'Policy', 'Procedure', 'Audit Report', 'Vendor Contract',
  'Incident Report', 'Business Continuity Plan', 'Compliance Evidence',
  'Risk Assessment', 'Control Framework', 'SLA', 'Training Material', 'Other'
] as const;

const STATUSES        = ['Draft', 'Under Review', 'Approved', 'Superseded', 'Archived'];
const CONFIDENTIALITY = ['Public', 'Internal', 'Confidential', 'Restricted', 'Top Secret'];

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const formatBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

// ── Props ────────────────────────────────────────────────────────────────────
interface DocumentUploadModalProps {
  initial?: any;
  risks?: any[];
  controls?: any[];
  assessments?: any[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

const EMPTY: any = {
  name: '', type: 'Policy', description: '', author: '', version: '1.0',
  status: 'Draft', confidentiality: 'Internal', tags: '',
  reviewDate: '', expiryDate: '',
  linkedRiskIds: [], linkedControlIds: [], linkedAssessmentIds: [],
  content: '', summary: ''
};

export const DocumentUploadModal = ({
  initial, risks = [], controls = [], assessments = [], onClose, onSave
}: DocumentUploadModalProps) => {
  const [form, setForm]     = useState<any>(initial ? {
    ...EMPTY, ...initial,
    tags: (initial.tags || []).join(', ')
  } : EMPTY);
  const [file, setFile]     = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const fileRef             = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const toggleLink = (field: 'linkedRiskIds' | 'linkedControlIds' | 'linkedAssessmentIds', id: string) => {
    const current: string[] = form[field] || [];
    set(field, current.includes(id) ? current.filter((x: string) => x !== id) : [...current, id]);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    // Extract text content for .txt files
    if (f.type === 'text/plain' || f.name.endsWith('.txt')) {
      const text = await f.text();
      set('content', text.slice(0, 50000));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Document name is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
      };
      if (file) {
        payload.fileBase64 = await fileToBase64(file);
        payload.fileName   = file.name;
        payload.fileMime   = file.type || 'application/octet-stream';
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
            <h2 className="text-xl font-black text-slate-900">{initial ? 'Edit Document' : 'Upload Document'}</h2>
            <p className="text-sm text-slate-400 font-bold mt-0.5">Complete all required document properties</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 hover:bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 transition-all"><X size={18} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-grow overflow-auto p-8 space-y-5">
          {error && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm font-bold text-rose-600">{error}</div>}

          {/* Row 1: Name + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Document Name *</label>
              <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Information Security Policy v2.1" />
            </div>
            <div>
              <label className={labelCls}>Document Type</label>
              <select className={inputCls} value={form.type} onChange={e => set('type', e.target.value)}>
                {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Author + Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Author / Owner</label>
              <input className={inputCls} value={form.author} onChange={e => set('author', e.target.value)} placeholder="e.g. CISO Office" />
            </div>
            <div>
              <label className={labelCls}>Version</label>
              <input className={inputCls} value={form.version} onChange={e => set('version', e.target.value)} placeholder="e.g. 2.1" />
            </div>
          </div>

          {/* Row 3: Status + Confidentiality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Confidentiality Level</label>
              <select className={inputCls} value={form.confidentiality} onChange={e => set('confidentiality', e.target.value)}>
                {CONFIDENTIALITY.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Row 4: Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Review Date</label>
              <input type="date" className={inputCls} value={form.reviewDate} onChange={e => set('reviewDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Expiry Date</label>
              <input type="date" className={inputCls} value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags (comma-separated)</label>
            <input className={inputCls} value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="e.g. ISO27001, access-control, HR" />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description</label>
            <textarea rows={2} className={`${inputCls} resize-none`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Briefly describe the purpose of this document..." />
          </div>

          {/* Summary */}
          <div>
            <label className={labelCls}>Executive Summary</label>
            <textarea rows={2} className={`${inputCls} resize-none`} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="Key findings or summary..." />
          </div>

          {/* Link to risks */}
          {risks.length > 0 && (
            <div>
              <label className={`${labelCls} flex items-center gap-1.5`}><Link2 size={11} /> Link to Risks</label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-32 overflow-y-auto">
                {risks.map((r: any) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleLink('linkedRiskIds', r.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${(form.linkedRiskIds || []).includes(r.id) ? 'bg-accent text-white border-accent' : 'bg-white text-slate-500 border-slate-200 hover:border-accent/30'}`}
                  >
                    {r.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Link to controls */}
          {controls.length > 0 && (
            <div>
              <label className={`${labelCls} flex items-center gap-1.5`}><Link2 size={11} /> Link to Controls</label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-32 overflow-y-auto">
                {controls.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleLink('linkedControlIds', c.id)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all ${(form.linkedControlIds || []).includes(c.id) ? 'bg-accent text-white border-accent' : 'bg-white text-slate-500 border-slate-200 hover:border-accent/30'}`}
                  >
                    {c.title}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* File upload */}
          <div>
            <label className={labelCls}>Attach File</label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/[0.02] transition-all group"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.txt,.xlsx,.csv"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileUp size={18} className="text-accent" />
                  <div className="text-left">
                    <p className="text-sm font-black text-slate-900">{file.name}</p>
                    <p className="text-[10px] font-bold text-slate-400">{formatBytes(file.size)} · {file.type || 'Unknown'}</p>
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
                  <p className="text-[10px] font-bold text-slate-300">.pdf · .docx · .txt · .xlsx · .csv — max 10 MB</p>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-8 border-t border-slate-50 flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit as any} loading={saving}>
            {initial ? 'Save Changes' : 'Upload Document'}
          </Button>
        </div>
      </div>
    </div>
  );
};
