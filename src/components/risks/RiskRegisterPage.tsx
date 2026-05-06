import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Search, Download, ShieldAlert, AlertTriangle, MoreVertical,
  ShieldCheck, FilterX, Trash2, FileDown, FileUp, PlusCircle, Brain,
  Users, Briefcase, BookOpen, GitMerge, Scale, AlertOctagon,
  Zap, FlaskConical, PackageCheck, TrendingDown, Activity
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Badge, Button, Card, PageHeader, EmptyState, ConfirmDialog, TableSkeleton, Breadcrumbs } from '../common';
import { RiskLevel, RiskStatus, RISK_CATEGORIES } from '../../types';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';
import { RiskDetailModal } from './RiskDetailModal';
import { AddRiskModal } from './AddRiskModal';
import { useToast } from '../../contexts/ToastContext';
import { auditLogService } from '../../services/auditLogService';
import { aiService } from '../../services/aiService';
import { riskService } from '../../services/riskService';
import { notificationService } from '../../services/notificationService';
import { NotificationType } from '../../types/notification';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';

// ── Storage helpers ─────────────────────────────────────────────────────────
const load = <T,>(key: string): T[] => {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
};
const save = (key: string, data: unknown[]) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// ── Sheet definitions ────────────────────────────────────────────────────────
const SHEETS = [
  { id: 'risks',          label: 'Risk Reyestri',            key: 'riskeez_risks',           icon: ShieldAlert,     sheetName: 'Risk Reyestri' },
  { id: 'assets',         label: 'Aktiv Uçotu',              key: 'riskeez_assets',           icon: Briefcase,       sheetName: 'Aktiv_uçotu' },
  { id: 'roles',          label: 'Rollar',                   key: 'riskeez_roles',            icon: Users,           sheetName: 'Rollar_siyahısı' },
  { id: 'employees',      label: 'İşçilər',                  key: 'riskeez_employees',        icon: Users,           sheetName: 'İşçi_siyahısı' },
  { id: 'raci',           label: 'RACI Matrisi',             key: 'riskeez_raci',             icon: GitMerge,        sheetName: 'RACI_matrisi' },
  { id: 'requirements',   label: 'Tələblər',                 key: 'riskeez_requirements',     icon: BookOpen,        sheetName: 'Tələblər_kataloqu' },
  { id: 'thresholds',     label: 'Məqbul Hədlər',            key: 'riskeez_thresholds',       icon: Scale,           sheetName: 'Məqbul_hədlər_uçotu' },
  { id: 'nonconformities',label: 'Uyğunsuzluqlar',           key: 'riskeez_nonconformities',  icon: AlertOctagon,    sheetName: 'Uyğunsuzluqlar_uçotu' },
  { id: 'threats',        label: 'Təhdidlər',                key: 'riskeez_threats',          icon: Zap,             sheetName: 'Təhdid_təsnifatı' },
  { id: 'scenarios',      label: 'Ssenarilar',               key: 'riskeez_scenarios',        icon: FlaskConical,    sheetName: 'Təhdidlərin qiymətləndirilməsi' },
  { id: 'solutions',      label: 'Həllər',                   key: 'riskeez_solutions',        icon: PackageCheck,    sheetName: 'Həllər_kataloqu' },
  { id: 'consequences',   label: 'Fəsadlar',                 key: 'riskeez_consequences',     icon: TrendingDown,    sheetName: 'Fəsadların_qeydiyyatı' },
  { id: 'incidents',      label: 'İnsidentlər',              key: 'riskeez_incidents',        icon: Activity,        sheetName: 'İnsidentlərin_qeydiyyatı' },
] as const;

// ── Column definitions per sheet ─────────────────────────────────────────────
const COLUMNS: Record<string, string[]> = {
  assets:          ['Aktiv_ID','Aktivin_kateqoriyası','Aktivin_adı','Aktivin_sahibi_İşçi_ID','Məsul_şəxslər_İşçi_ID','Aktivin_keyfiyyət_dəyəri','Aktivin_kəmiyyət_dəyəri','Valyuta_növü','Status','Qeyd'],
  roles:           ['Rol_ID','Rol_kateqoriyası','Rol_adı','Mahiyyəti','Status'],
  employees:       ['İşçi_ID','Ad_Soyad','Struktur_bölmə','Vəzifə','Telefon','Email','Əlaqəli_Rol_ID','Birbaşa_rəhbər_İşçi_ID','Status'],
  raci:            ['RACI_ID','Fəaliyyət sahəsi','Fəaliyyət_mərhələsi','Fəaliyyət_kodu','Fəaliyyətin_adı','R_İcraçı_rol_ID_lər','A_Yekun_cavabdeh_rol_ID','C_Konsultasiya olunan_rol_ID_lər','I_Məlumatlandırılan_rol_ID_lər','Status'],
  requirements:    ['Tələb_ID','Tələbin kateqoriyası','Tələbin adı','Tələbin_mahiyyəti','Təhlükəsizlik_prinsip(lər)i','Tələbin_qoyulduğu_fəaliyyət_sahəsi','Mənbə_növü','Mənbə_sənədinin_rekvizitləri','Maddə/Bənd','Status'],
  thresholds:      ['Hədd_ID','kateqoriyası','adı','mahiyyəti','Fəaliyyət_sahəsi','Aid_olduğu_aktiv_ID','Metric_kodu','Operator','Hədd_dəyəri_1','Hədd_dəyəri_2','Ölçü_vahidi','Mənbə_sənəd_növü','Mənbə_sənəd_rekvizitləri','Başlanğıc_tarix','Bitmə_tarixi','Status'],
  nonconformities: ['Uyğunsuzluq_ID','Uyğunsuzluğun_kateqoriyası','Uyğunsuzluğun_adı','Uyğunsuzluğun_mahiyyəti','Pozduğu_tələb_ID','Aktiv_ID','Ünvan_obyekti','Uyğunsuzluğun_ciddilik_dərəcəsi'],
  threats:         ['Təhdid_ID','Təhdidin_kateqoriyası','Təhdid_adı','Təhdidin_mahiyyəti','Təhdidin_mənbəyi','Təhdidin_məqsədi','Məqsədyönlülük_xarakteri','Təhdidin_yönəldiyi_sahə','Status'],
  scenarios:       ['Ssenari_ID','Təhdid_ID','Aktiv_ID','Uyğunsuzluq_ID','Təhdiddən_yarana_bilən_hadisə','Reallaşma_texnologiyası','Baş vermə tezliyi','Təhdidin ehtimal dərəcəsi','Qiymətləndirmə_tarixi','Status'],
  solutions:       ['Həll_ID','Həllin_nəzarət_tipi','Həll_adı','Həllin_mahiyyəti','Tətbiq_sahəsi','Həll_texnologiyası','Tətbiq_üsulu'],
  consequences:    ['Fəsad_ID','Fəsad_kateqoriyası','Fəsadın_növü','Fəsad_adı','Fəsadın_mahiyyəti','Yönələn_Təhdid_sssenari_ID','Əlaqəli_Aktiv_ID','Fəsadın_ciddilik_dərəcəsi','Status'],
  incidents:       ['İnsident_ID','Əlaqəli_risk_ID','İnsident_kateqoriyası','İnsidentin_adı','İnsidentin_mahiyyəti','Başvermə_tarixi_saatı','Aşkarlanma_tarixi','İnsident_statusu','İnsidentə_cavab_variantı','İnsidentə_cavab_üsulu','İnsidentə_cavab_həlli','Kök_səbəb','Nəticə','Bağlanma_tarixi_saatı'],
};

interface RiskRegisterPageProps {
  store: any;
  onNavigate: (tab: string) => void;
}

// ── Level / severity badge helper ────────────────────────────────────────────
const severityColor = (val: string): string => {
  const v = val.toLowerCase();
  if (v.includes('kritik') || v.includes('critical')) return 'bg-rose-50 text-rose-600 border-rose-100';
  if (v.includes('yüksək') || v.includes('high'))      return 'bg-orange-50 text-orange-600 border-orange-100';
  if (v.includes('orta') || v.includes('medium'))      return 'bg-amber-50 text-amber-600 border-amber-100';
  if (v.includes('aşağı') || v.includes('low'))        return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (v.includes('aktiv') || v.includes('active'))     return 'bg-emerald-50 text-emerald-600 border-emerald-100';
  if (v.includes('bağlandı') || v.includes('closed'))  return 'bg-slate-50 text-slate-500 border-slate-100';
  return '';
};

const BADGE_COLS = new Set(['Status','Aktivin_keyfiyyət_dəyəri','Uyğunsuzluğun_ciddilik_dərəcəsi','Fəsadın_ciddilik_dərəcəsi','Riskin_keyfiyyət_əsaslı_dərəcəsi','Təhdidin ehtimal dərəcəsi','İnsident_statusu']);

// ── Editable generic table ────────────────────────────────────────────────────
interface EditableTableProps {
  columns: string[];
  data: any[];
  onSave: (rows: any[]) => void;
}

const EditableTable = ({ columns, data, onSave }: EditableTableProps) => {
  const [rows, setRows]           = useState<any[]>(data);
  const [search, setSearch]       = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editBuf, setEditBuf]     = useState<Record<string, string>>({});
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [dirty, setDirty]         = useState(false);

  // Sync if parent data changes (e.g. after import)
  useEffect(() => {
    setRows(data);
    setDirty(false);
  }, [data]);

  const filtered = rows
    .map((r, i) => ({ ...r, __idx: i }))
    .filter(row => columns.some(col => String(row[col] ?? '').toLowerCase().includes(search.toLowerCase())));

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    const buf: Record<string, string> = {};
    columns.forEach(c => { buf[c] = String(rows[idx][c] ?? ''); });
    setEditBuf(buf);
  };

  const saveEdit = () => {
    if (editingIdx === null) return;
    const updated = [...rows];
    updated[editingIdx] = { ...updated[editingIdx], ...editBuf };
    setRows(updated);
    setEditingIdx(null);
    setEditBuf({});
    setDirty(true);
  };

  const cancelEdit = () => { setEditingIdx(null); setEditBuf({}); };

  const addRow = () => {
    const blank: Record<string, string> = {};
    columns.forEach(c => { blank[c] = ''; });
    const next = [...rows, blank];
    setRows(next);
    setEditingIdx(next.length - 1);
    setEditBuf(blank);
    setDirty(true);
  };

  const confirmDelete = () => {
    if (deleteIdx === null) return;
    const updated = rows.filter((_, i) => i !== deleteIdx);
    setRows(updated);
    setDeleteIdx(null);
    setDirty(true);
  };

  const commitSave = () => {
    onSave(rows);
    setDirty(false);
  };

  if (rows.length === 0 && !dirty) {
    return (
      <div className="py-20 flex flex-col items-center gap-4 text-slate-400">
        <ShieldAlert size={32} className="opacity-30" />
        <p className="text-sm font-black uppercase tracking-widest mb-4">Məlumat yoxdur — Excel faylını import edin</p>
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all"
        >
          <PlusCircle size={14} /> Sətir Əlavə Et
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Axtarış..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-11 pr-4 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent/90 transition-all"
          >
            <PlusCircle size={13} /> Sətir Əlavə Et
          </button>
          {dirty && (
            <button
              onClick={commitSave}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all animate-in fade-in"
            >
              <FileDown size={13} /> Yadda Saxla
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteIdx !== null && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between">
          <span className="text-sm font-black text-rose-700">Bu sətiri silmək istədiyinizə əminsiniz?</span>
          <div className="flex gap-2">
            <button onClick={() => setDeleteIdx(null)} className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black">Ləğv</button>
            <button onClick={confirmDelete} className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-[10px] font-black">Sil</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100">
        <table className="min-w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-4 py-4 font-black text-slate-300 uppercase tracking-widest text-center w-10">#</th>
              {columns.map(col => (
                <th key={col} className="px-5 py-4 font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
              <th className="px-4 py-4 font-black text-slate-300 uppercase tracking-widest text-center w-24">Əməliyyat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 bg-white">
            {filtered.map((row, fi) => {
              const realIdx = row.__idx;
              const isEditing = editingIdx === realIdx;
              return (
                <tr key={realIdx} className={`transition-colors ${isEditing ? 'bg-accent/5' : 'hover:bg-slate-50/60'}`}>
                  <td className="px-4 py-3.5 text-slate-300 font-black text-center tabular-nums">{fi + 1}</td>
                  {columns.map(col => {
                    const val = isEditing ? editBuf[col] : String(row[col] ?? '');
                    const badge = severityColor(val);
                    return (
                      <td key={col} className="px-5 py-3 text-slate-700 font-bold whitespace-nowrap max-w-[200px]">
                        {isEditing ? (
                          <input
                            value={editBuf[col] ?? ''}
                            onChange={e => setEditBuf(prev => ({ ...prev, [col]: e.target.value }))}
                            className="w-full min-w-[100px] bg-white border border-accent/30 rounded-lg px-2 py-1 text-xs font-black outline-none focus:ring-2 focus:ring-accent/20"
                          />
                        ) : BADGE_COLS.has(col) && badge ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badge}`}>{val}</span>
                        ) : (
                          <span className="block truncate" title={val}>{val}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex gap-1 justify-center">
                        <button onClick={saveEdit} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black">✓</button>
                        <button onClick={cancelEdit} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black">✕</button>
                      </div>
                    ) : (
                      <div className="flex gap-1 justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => startEdit(realIdx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-accent/10 hover:text-accent transition-all text-slate-400"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          onClick={() => setDeleteIdx(realIdx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-500 transition-all text-slate-400"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3,6 5,6 21,6"/><path d="M19,6 L18.1,20a2,2 0 0,1-2,1.9H7.9a2,2 0 0,1-2-1.9L5,6"/><path d="M10,11 L10,17"/><path d="M14,11 L14,17"/><path d="M9,6 L9,4a1,1 0 0,1 1-1h4a1,1 0 0,1 1,1v2"/></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest text-right">
        {filtered.length} / {rows.length} sətir · {columns.length} sütun
        {dirty && <span className="ml-3 text-amber-500">● Yadda saxlanmamış dəyişikliklər var</span>}
      </p>
    </div>
  );
};

// ── Main component ───────────────────────────────────────────────────────────
export const RiskRegisterPage = ({ store, onNavigate }: RiskRegisterPageProps) => {
  const { t } = useLanguage();
  const { setSubLabel } = useBreadcrumb();
  const { risks, updateRisk, addRisk, deleteRisk, controls, isLoading: loading } = store;
  const { success, error, info } = useToast();

  const [activeSheet, setActiveSheet] = useState<string>('risks');

  // Sync active sheet → header breadcrumb
  useEffect(() => {
    const sheet = SHEETS.find(s => s.id === activeSheet);
    setSubLabel(sheet?.label || '');
  }, [activeSheet, setSubLabel]);
  const [sheetData, setSheetData] = useState<Record<string, any[]>>(() => {
    const d: Record<string, any[]> = {};
    SHEETS.forEach(s => { if (s.id !== 'risks') d[s.id] = load(s.key); });
    return d;
  });

  // Risk-specific state
  const [search, setSearch] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<any>(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterLevel, setFilterLevel] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterOwner, setFilterOwner] = useState('All');
  const [filterControls, setFilterControls] = useState('All');
  const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, any[]>>({});
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [riskToDelete, setRiskToDelete] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveSheet = (id: string, data: any[]) => {
    const sheet = SHEETS.find(s => s.id === id);
    if (sheet) save(sheet.key, data);
    setSheetData(prev => ({ ...prev, [id]: data }));
  };

  // ── Filtered risks ─────────────────────────────────────────────────────────
  const filteredRisks = risks.filter((r: any) => {
    const ms = r.title.toLowerCase().includes(search.toLowerCase()) ||
               r.owner.toLowerCase().includes(search.toLowerCase()) ||
               r.description.toLowerCase().includes(search.toLowerCase());
    const mc = filterCategory === 'All' || r.category === filterCategory;
    const ml = filterLevel === 'All' || r.level === filterLevel;
    const mst = filterStatus === 'All' || r.status === filterStatus;
    const mo = filterOwner === 'All' || r.owner === filterOwner;
    const rc = controls.filter((c: any) => c.riskId === r.id);
    const mct = filterControls === 'All' ||
      (filterControls === 'Has Controls' ? rc.length > 0 : rc.length === 0);
    return ms && mc && ml && mst && mo && mct;
  });
  const owners = Array.from(new Set(risks.map((r: any) => r.owner))) as string[];
  const totals = {
    total: risks.length,
    critical: risks.filter((r: any) => r.level === RiskLevel.CRITICAL).length,
    high: risks.filter((r: any) => r.level === RiskLevel.HIGH).length,
    open: risks.filter((r: any) => r.status === RiskStatus.OPEN).length,
    overdue: risks.filter((r: any) => new Date(r.dueDate) < new Date() && r.status !== RiskStatus.MITIGATED).length,
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!riskToDelete) return;
    const risk = risks.find((r: any) => r.id === riskToDelete);
    await deleteRisk(riskToDelete);
    success('Risk silindi', `"${risk?.title}" reyestrdən silindi.`);
    setRiskToDelete(null);
  };

  const handleMitigate = async (risk: any) => {
    await updateRisk({ ...risk, status: RiskStatus.MITIGATED });
    success('Risk azaldıldı', 'Status "Azaldılmış" olaraq yeniləndi.');
  };

  const toggleSelectAll = (e: any) => {
    setSelectedRisks(e.target.checked ? filteredRisks.map((r: any) => r.id) : []);
  };
  const toggleSelectRisk = (id: string) =>
    setSelectedRisks(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

  const resetFileInput = () => { if (fileInputRef.current) fileInputRef.current.value = ''; };

  // ── EXPORT — full multi-sheet workbook ─────────────────────────────────────
  const handleExport = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Riskeez';
      workbook.created = new Date();

      const addSheet = (name: string, columns: string[], rows: any[]) => {
        const ws = workbook.addWorksheet(name);
        ws.columns = columns.map(c => ({ header: c, key: c, width: Math.max(c.length + 4, 18) }));
        // Style header row
        ws.getRow(1).eachCell(cell => {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FF334155' } },
            right: { style: 'thin', color: { argb: 'FF334155' } }
          };
        });
        ws.getRow(1).height = 36;
        rows.forEach(row => {
          const vals: any = {};
          columns.forEach(c => { vals[c] = row[c] ?? ''; });
          ws.addRow(vals);
        });
      };

      // Sheet 1: Aktiv_uçotu
      addSheet('Aktiv_uçotu', COLUMNS.assets, sheetData.assets || []);

      // Sheet 2: Rollar_siyahısı
      addSheet('Rollar_siyahısı', COLUMNS.roles, sheetData.roles || []);

      // Sheet 3: İşçi_siyahısı
      addSheet('İşçi_siyahısı', COLUMNS.employees, sheetData.employees || []);

      // Sheet 4: RACI_matrisi
      addSheet('RACI_matrisi', COLUMNS.raci, sheetData.raci || []);

      // Sheet 5: Tələblər_kataloqu
      addSheet('Tələblər_kataloqu', COLUMNS.requirements, sheetData.requirements || []);

      // Sheet 6: Məqbul_hədlər_uçotu
      addSheet('Məqbul_hədlər_uçotu', COLUMNS.thresholds, sheetData.thresholds || []);

      // Sheet 7: Uyğunsuzluqlar_uçotu
      addSheet('Uyğunsuzluqlar_uçotu', COLUMNS.nonconformities, sheetData.nonconformities || []);

      // Sheet 8: Təhdid_təsnifatı
      addSheet('Təhdid_təsnifatı', COLUMNS.threats, sheetData.threats || []);

      // Sheet 9: Təhdidlərin qiymətləndirilməsi
      addSheet('Təhdidlərin qiymətləndirilməsi', COLUMNS.scenarios, sheetData.scenarios || []);

      // Sheet 10: Həllər_kataloqu
      addSheet('Həllər_kataloqu', COLUMNS.solutions, sheetData.solutions || []);

      // Sheet 11: Fəsadların_qeydiyyatı
      addSheet('Fəsadların_qeydiyyatı', COLUMNS.consequences, sheetData.consequences || []);

      // Sheet 12: Risk Reyestri (main)
      const riskCols = ['Risk_ID','Riskin_kateqoriyası','Riskin_adı','Riskin_mahiyyəti','Təhdid_sssenari_ID','Uyğunsuzluq_ID','Fəsad_ID','Riskin_keyfiyyət_əsaslı_dərəcəsi','Riskin_kəmiyyət_əsaslı_dəyəri','Riskin_emal_variantı','Həll_ID','Riskin reallaşma faktı(İnsident)','Status','Riskin_sahibi_İşçi_ID'];
      const riskRows = (selectedRisks.length > 0 ? risks.filter((r: any) => selectedRisks.includes(r.id)) : risks).map((r: any) => ({
        'Risk_ID': r.id,
        'Riskin_kateqoriyası': r.category,
        'Riskin_adı': r.title,
        'Riskin_mahiyyəti': r.description,
        'Təhdid_sssenari_ID': '',
        'Uyğunsuzluq_ID': '',
        'Fəsad_ID': '',
        'Riskin_keyfiyyət_əsaslı_dərəcəsi': r.level,
        'Riskin_kəmiyyət_əsaslı_dəyəri': r.score,
        'Riskin_emal_variantı': r.recommendation || '',
        'Həll_ID': r.existingControls || '',
        'Riskin reallaşma faktı(İnsident)': 'Yox',
        'Status': r.status,
        'Riskin_sahibi_İşçi_ID': r.owner,
      }));
      addSheet('Risk Reyestri', riskCols, riskRows);

      // Sheet 13: İnsidentlərin_qeydiyyatı
      addSheet('İnsidentlərin_qeydiyyatı', COLUMNS.incidents, sheetData.incidents || []);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Risk_Reyestri_Export.xlsx'; a.click();
      URL.revokeObjectURL(url);

      success('Export Uğurlu', 'Bütün cədvəllər Excel faylına export edildi.');
      auditLogService.log('risk_export', 'Risk', `Risk reyestri export edildi — ${risks.length} risk`);
    } catch (err) {
      console.error(err);
      error('Export Xətası', 'Excel faylı yaradıla bilmədi.');
    }
  };

  // ── IMPORT — reads all sheets ──────────────────────────────────────────────
  const extractRows = (ws: ExcelJS.Worksheet): any[] => {
    if (!ws || ws.rowCount < 2) return [];
    const headerRow = ws.getRow(1);
    const headers: Record<number, string> = {};
    headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
      const v = cell.value;
      let s = '';
      if (v && typeof v === 'object' && 'richText' in (v as any)) {
        s = (v as any).richText.map((r: any) => r.text).join('');
      } else if (v !== null && v !== undefined) {
        s = String(v);
      }
      if (s.trim()) headers[col] = s.trim();
    });

    const rows: any[] = [];
    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const obj: any = {};
      let hasValue = false;
      Object.entries(headers).forEach(([colStr, headerName]) => {
        const cell = row.getCell(Number(colStr));
        let val = cell.value;
        if (val && typeof val === 'object' && 'richText' in (val as any)) {
          val = (val as any).richText.map((r: any) => r.text).join('');
        } else if (val && typeof val === 'object' && 'result' in (val as any)) {
          val = String((val as any).result ?? '');
        } else if (val instanceof Date) {
          val = val.toISOString().split('T')[0];
        }
        const str = val !== null && val !== undefined ? String(val) : '';
        obj[headerName] = str;
        if (str.trim()) hasValue = true;
      });
      if (hasValue) rows.push(obj);
    });
    return rows;
  };

  const normalizeRiskRow = (row: any) => {
    const getStr = (...keys: string[]) => {
      for (const k of keys) {
        const v = row[k];
        if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
      }
      return '';
    };

    const title = getStr('Riskin_adı', 'Riskin adı', 'Risk Title', 'Title', 'Aktivin_adı');
    const description = getStr('Riskin_mahiyyəti', 'Risk Description', 'Description', 'Qeyd');
    const category = getStr('Riskin_kateqoriyası', 'Category', 'Aktivin_kateqoriyası');
    const owner = getStr('Riskin_sahibi_İşçi_ID', 'Owner', 'Aktivin_sahibi_İşçi_ID');
    const qualLevel = getStr('Riskin_keyfiyyət_əsaslı_dərəcəsi', 'Aktivin_keyfiyyət_dəyəri', 'Severity');
    const statusRaw = getStr('Status');
    const existingControls = getStr('Həll_ID', 'Existing Controls');
    const recommendation = getStr('Riskin_emal_variantı', 'Recommended Controls');
    const quantVal = getStr('Riskin_kəmiyyət_əsaslı_dəyəri');
    const notes = [
      getStr('Qeyd'),
      getStr('Riskin reallaşma faktı(İnsident)') ? `İnsident: ${getStr('Riskin reallaşma faktı(İnsident)')}` : '',
      getStr('Təhdid_sssenari_ID') ? `Ssenari: ${getStr('Təhdid_sssenari_ID')}` : '',
      quantVal ? `Kəmiyyət dəyəri: ${quantVal} AZN` : '',
    ].filter(Boolean).join(' | ');

    const errors: string[] = [];
    if (!title) errors.push('Riskin adı tələb olunur');
    if (!category) errors.push('Kateqoriya tələb olunur');
    if (!owner) errors.push('Sahibi tələb olunur');

    let likelihood = parseFloat(getStr('Likelihood', 'likelihood')) || 0;
    let impact = parseFloat(getStr('Impact', 'impact')) || 0;
    if (qualLevel && (!likelihood || !impact)) {
      const l = qualLevel.toLowerCase();
      if (l.includes('kritik') || l.includes('critical')) { likelihood = 5; impact = 5; }
      else if (l.includes('yüksək') || l.includes('high')) { likelihood = 3; impact = 5; }
      else if (l.includes('orta') || l.includes('medium')) { likelihood = 3; impact = 3; }
      else { likelihood = 2; impact = 2; }
    }
    if (!likelihood) likelihood = 3;
    if (!impact) impact = 3;

    const norm = (s: string) => s.toLowerCase().replace(/[ıüöəğşç]/g, c =>
      ({'ı':'i','ü':'u','ö':'o','ə':'e','ğ':'g','ş':'s','ç':'c'}[c] || c));
    let status = RiskStatus.OPEN;
    const sn = norm(statusRaw);
    if (['aktiv','aciq','open'].some(v => sn.includes(v))) status = RiskStatus.OPEN;
    else if (['icradadir','davam','progress'].some(v => sn.includes(v))) status = RiskStatus.IN_PROGRESS;
    else if (['azaldil','mitigat','hell'].some(v => sn.includes(v))) status = RiskStatus.MITIGATED;
    else if (['qebul','accept'].some(v => sn.includes(v))) status = RiskStatus.ACCEPTED;
    else if (['texire','defer'].some(v => sn.includes(v))) status = RiskStatus.DEFERRED;
    else if (['bagla','clos'].some(v => sn.includes(v))) status = RiskStatus.CLOSED;

    const score = Math.round(likelihood) * Math.round(impact);
    return {
      isValid: errors.length === 0,
      errors,
      data: { title, description, category, owner, status, likelihood: Math.round(likelihood), impact: Math.round(impact), score, level: riskService.getLevel(score), dueDate: getStr('Due Date', 'Hədəf_tarix') || new Date().toISOString().split('T')[0], existingControls, recommendation, notes },
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: 'greedy',
        complete: (r: any) => {
          const normalized = r.data.map((row: any) => normalizeRiskRow(row));
          setImportPreview({ risks: normalized });
          setImportErrors(normalized.flatMap((n: any, i: number) => n.errors.map((e: string) => `Sətir ${i + 2}: ${e}`)));
          setShowImportDialog(true);
          resetFileInput();
        },
        error: (err: any) => { error('CSV Xətası', err.message); resetFileInput(); }
      });
      return;
    }

    if (ext !== 'xlsx' && ext !== 'xls') {
      error('Yanlış Fayl Növü', '.xlsx, .xls və ya .csv yükləyin.');
      resetFileInput();
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheetMap: Record<string, string[]> = {
        'Aktiv_uçotu': 'assets', 'Aktiv_ucotu': 'assets',
        'Rollar_siyahısı': 'roles', 'Rollar_siyahisi': 'roles',
        'İşçi_siyahısı': 'employees', 'Isci_siyahisi': 'employees',
        'RACI_matrisi': 'raci',
        'Tələblər_kataloqu': 'requirements', 'Teleblar_kataloqu': 'requirements',
        'Məqbul_hədlər_uçotu': 'thresholds', 'Meqbul_hedler': 'thresholds',
        'Uyğunsuzluqlar_uçotu': 'nonconformities', 'Uygunsuzluqlar': 'nonconformities',
        'Təhdid_təsnifatı': 'threats', 'Tehdid_tesnifati': 'threats',
        'Təhdidlərin qiymətləndirilməsi': 'scenarios', 'Tehdidin qiymetlendirilmesi': 'scenarios',
        'Həllər_kataloqu': 'solutions', 'Heller_kataloqu': 'solutions',
        'Fəsadların_qeydiyyatı': 'consequences', 'Fesadlarin_qeydiyyati': 'consequences',
        'Risk Reyestri': 'risks', 'Risk_Reyestri': 'risks',
        'İnsidentlərin_qeydiyyatı': 'incidents', 'Insidentlerin_qeydiyyati': 'incidents',
      };

      const preview: Record<string, any[]> = {};
      const allErrors: string[] = [];

      workbook.eachSheet(ws => {
        const sheetId = sheetMap[ws.name];
        if (!sheetId) return;
        const rows = extractRows(ws);
        if (sheetId === 'risks') {
          const normalized = rows.map(r => normalizeRiskRow(r));
          preview.risks = normalized;
          normalized.forEach((n, i) => {
            if (!n.isValid) allErrors.push(...n.errors.map(e => `[Risk Reyestri] Sətir ${i + 2}: ${e}`));
          });
        } else {
          preview[sheetId] = rows;
        }
      });

      if (Object.keys(preview).length === 0) {
        error('Import Xətası', 'Tanınan sheet tapılmadı.');
        resetFileInput();
        return;
      }

      setImportPreview(preview);
      setImportErrors(allErrors);
      setShowImportDialog(true);
      resetFileInput();
    } catch (err) {
      console.error(err);
      error('Excel Xətası', 'Fayl oxuna bilmədi.');
      resetFileInput();
    }
  };

  const confirmImport = async () => {
    let riskCount = 0;
    const summaryParts: string[] = [];

    // Save non-risk sheets
    Object.entries(importPreview).forEach(([sheetId, rows]) => {
      if (sheetId === 'risks') return;
      saveSheet(sheetId, rows);
      summaryParts.push(`${SHEETS.find(s => s.id === sheetId)?.label}: ${rows.length}`);
    });

    // Save risks
    if (importPreview.risks) {
      const validRisks = importPreview.risks.filter((r: any) => r.isValid ?? r._isValid ?? true);
      for (const row of validRisks) {
        const d = row.data ?? row;
        if (!d.title) continue;
        try {
          await addRisk({ title: d.title, description: d.description, category: d.category, owner: d.owner, status: d.status, likelihood: d.likelihood, impact: d.impact, dueDate: d.dueDate, recommendation: d.recommendation, existingControls: d.existingControls, notes: d.notes });
          riskCount++;
        } catch {}
      }
      if (riskCount > 0) summaryParts.unshift(`Risk Reyestri: ${riskCount}`);
    }

    setSearch(''); setFilterCategory('All'); setFilterLevel('All'); setFilterStatus('All'); setFilterOwner('All');
    setShowImportDialog(false);
    setImportPreview({});
    setImportErrors([]);

    success('Import Uğurlu', summaryParts.join(' · '));
    if (riskCount > 0) await store.refresh();
  };

  const handleManualSave = async (data: any) => {
    await addRisk(data);
    success('Risk Qeydiyyata Alındı', `"${data.title}" reyestrə əlavə edildi.`);
  };

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const resp = await aiService.generateRemediationPlan(risks[0] || {} as any);
      info('AI Strategiya', `${resp.summary.substring(0, 60)}...`);
    } catch {
      error(t('riskRegister.analysisFailed'), t('riskRegister.analysisFailedDesc'));
    } finally { setIsAnalyzing(false); }
  };

  const handleDownloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Riskeez';

      const addSampleSheet = (name: string, columns: string[], sampleRow: Record<string, string>) => {
        const ws = workbook.addWorksheet(name);
        ws.columns = columns.map(c => ({ header: c, key: c, width: Math.max(c.length + 4, 20) }));
        ws.getRow(1).font = { bold: true };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws.addRow(sampleRow);
      };

      addSampleSheet('Aktiv_uçotu', COLUMNS.assets, { 'Aktiv_ID': 'AKT-001', 'Aktivin_kateqoriyası': 'İnformasiya', 'Aktivin_adı': 'Müştəri Bazası', 'Aktivin_sahibi_İşçi_ID': 'İŞÇİ-001', 'Məsul_şəxslər_İşçi_ID': 'İŞÇİ-002', 'Aktivin_keyfiyyət_dəyəri': 'Yüksək', 'Aktivin_kəmiyyət_dəyəri': '500000', 'Valyuta_növü': 'AZN', 'Status': 'Aktiv', 'Qeyd': '' });
      addSampleSheet('Rollar_siyahısı', COLUMNS.roles, { 'Rol_ID': 'ROL-001', 'Rol_kateqoriyası': 'Texniki', 'Rol_adı': 'İT Mütəxəssis', 'Mahiyyəti': 'İT risklərinin idarəsi', 'Status': 'Aktiv' });
      addSampleSheet('İşçi_siyahısı', COLUMNS.employees, { 'İşçi_ID': 'İŞÇİ-001', 'Ad_Soyad': 'Anar Həsənov', 'Struktur_bölmə': 'İT', 'Vəzifə': 'Direktor', 'Telefon': '+994501234567', 'Email': 'a.hasan@firma.az', 'Əlaqəli_Rol_ID': 'ROL-001', 'Birbaşa_rəhbər_İşçi_ID': '', 'Status': 'Aktiv' });
      addSampleSheet('RACI_matrisi', COLUMNS.raci, { 'RACI_ID': 'RACI-001', 'Fəaliyyət sahəsi': 'Risk İdarəetməsi', 'Fəaliyyət_mərhələsi': 'Müəyyənləşdirmə', 'Fəaliyyət_kodu': 'FA-001', 'Fəaliyyətin_adı': 'Risklərin qeydiyyatı', 'R_İcraçı_rol_ID_lər': 'ROL-002', 'A_Yekun_cavabdeh_rol_ID': 'ROL-001', 'C_Konsultasiya olunan_rol_ID_lər': 'ROL-003', 'I_Məlumatlandırılan_rol_ID_lər': 'ROL-004', 'Status': 'Aktiv' });
      addSampleSheet('Tələblər_kataloqu', COLUMNS.requirements, { 'Tələb_ID': 'TLB-001', 'Tələbin kateqoriyası': 'Standart', 'Tələbin adı': 'ISO 27001', 'Tələbin_mahiyyəti': 'İnformasiya təhlükəsizliyi', 'Təhlükəsizlik_prinsip(lər)i': 'Məxfilik', 'Tələbin_qoyulduğu_fəaliyyət_sahəsi': 'İT', 'Mənbə_növü': 'Standart', 'Mənbə_sənədinin_rekvizitləri': 'ISO/IEC 27001:2022', 'Maddə/Bənd': 'Bölmə 6.1', 'Status': 'Aktiv' });
      addSampleSheet('Məqbul_hədlər_uçotu', COLUMNS.thresholds, { 'Hədd_ID': 'HDD-001', 'kateqoriyası': 'Performans', 'adı': 'Sistem Əlçatanlığı', 'mahiyyəti': 'Uptime faizi', 'Fəaliyyət_sahəsi': 'İT', 'Aid_olduğu_aktiv_ID': 'AKT-001', 'Metric_kodu': 'UPTIME', 'Operator': '>=', 'Hədd_dəyəri_1': '99.5', 'Hədd_dəyəri_2': '', 'Ölçü_vahidi': '%', 'Mənbə_sənəd_növü': 'SLA', 'Mənbə_sənəd_rekvizitləri': 'SLA-2024', 'Başlanğıc_tarix': '2024-01-01', 'Bitmə_tarixi': '2024-12-31', 'Status': 'Aktiv' });
      addSampleSheet('Uyğunsuzluqlar_uçotu', COLUMNS.nonconformities, { 'Uyğunsuzluq_ID': 'UYG-001', 'Uyğunsuzluğun_kateqoriyası': 'Texniki', 'Uyğunsuzluğun_adı': 'Köhnə Proqram', 'Uyğunsuzluğun_mahiyyəti': 'Yamaqlar tətbiq edilməyib', 'Pozduğu_tələb_ID': 'TLB-001', 'Aktiv_ID': 'AKT-001', 'Ünvan_obyekti': 'ERP Sistemi', 'Uyğunsuzluğun_ciddilik_dərəcəsi': 'Yüksək' });
      addSampleSheet('Təhdid_təsnifatı', COLUMNS.threats, { 'Təhdid_ID': 'THD-001', 'Təhdidin_kateqoriyası': 'Kiber', 'Təhdid_adı': 'Fişinq', 'Təhdidin_mahiyyəti': 'E-poçt ilə şifrə oğurluğu', 'Təhdidin_mənbəyi': 'Xarici', 'Təhdidin_məqsədi': 'Məlumat', 'Məqsədyönlülük_xarakteri': 'Qəsdli', 'Təhdidin_yönəldiyi_sahə': 'İT', 'Status': 'Aktiv' });
      addSampleSheet('Təhdidlərin qiymətləndirilməsi', COLUMNS.scenarios, { 'Ssenari_ID': 'SSN-001', 'Təhdid_ID': 'THD-001', 'Aktiv_ID': 'AKT-001', 'Uyğunsuzluq_ID': 'UYG-001', 'Təhdiddən_yarana_bilən_hadisə': 'Şifrə oğurluğu', 'Reallaşma_texnologiyası': 'Sosial Mühəndislik', 'Baş vermə tezliyi': 'Aylıq', 'Təhdidin ehtimal dərəcəsi': 'Yüksək', 'Qiymətləndirmə_tarixi': '2024-01-01', 'Status': 'Aktiv' });
      addSampleSheet('Həllər_kataloqu', COLUMNS.solutions, { 'Həll_ID': 'HLL-001', 'Həllin_nəzarət_tipi': 'Profilaktik', 'Həll_adı': 'MFA', 'Həllin_mahiyyəti': 'Çox faktorlu doğrulama', 'Tətbiq_sahəsi': 'İT Sistemləri', 'Həll_texnologiyası': 'MFA Proqramı', 'Tətbiq_üsulu': 'Texniki' });
      addSampleSheet('Fəsadların_qeydiyyatı', COLUMNS.consequences, { 'Fəsad_ID': 'FST-001', 'Fəsad_kateqoriyası': 'Maliyyə', 'Fəsadın_növü': 'Birbaşa', 'Fəsad_adı': 'Maliyyə İtkisi', 'Fəsadın_mahiyyəti': 'Kiberhücumdan itki', 'Yönələn_Təhdid_sssenari_ID': 'SSN-001', 'Əlaqəli_Aktiv_ID': 'AKT-001', 'Fəsadın_ciddilik_dərəcəsi': 'Kritik', 'Status': 'Aktiv' });

      const riskWs = workbook.addWorksheet('Risk Reyestri');
      const riskCols = ['Risk_ID','Riskin_kateqoriyası','Riskin_adı','Riskin_mahiyyəti','Təhdid_sssenari_ID','Uyğunsuzluq_ID','Fəsad_ID','Riskin_keyfiyyət_əsaslı_dərəcəsi','Riskin_kəmiyyət_əsaslı_dəyəri','Riskin_emal_variantı','Həll_ID','Riskin reallaşma faktı(İnsident)','Status','Riskin_sahibi_İşçi_ID'];
      riskWs.columns = riskCols.map(c => ({ header: c, key: c, width: Math.max(c.length + 4, 20) }));
      riskWs.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      riskWs.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      riskWs.addRow({ 'Risk_ID': 'RSK-001', 'Riskin_kateqoriyası': 'Kibertəhlükəsizlik', 'Riskin_adı': 'Fişinq ilə Məlumat İtkisi', 'Riskin_mahiyyəti': 'Fişinq nəticəsində məlumat oğurluğu', 'Təhdid_sssenari_ID': 'SSN-001', 'Uyğunsuzluq_ID': 'UYG-001', 'Fəsad_ID': 'FST-001', 'Riskin_keyfiyyət_əsaslı_dərəcəsi': 'Yüksək', 'Riskin_kəmiyyət_əsaslı_dəyəri': '250000', 'Riskin_emal_variantı': 'Azalt', 'Həll_ID': 'HLL-001', 'Riskin reallaşma faktı(İnsident)': 'Yox', 'Status': 'Aktiv', 'Riskin_sahibi_İşçi_ID': 'İŞÇİ-002' });

      addSampleSheet('İnsidentlərin_qeydiyyatı', COLUMNS.incidents, { 'İnsident_ID': 'INS-001', 'Əlaqəli_risk_ID': 'RSK-001', 'İnsident_kateqoriyası': 'Kiber', 'İnsidentin_adı': 'Fişinq Aşkarlandı', 'İnsidentin_mahiyyəti': 'İstifadəçi linki açıb', 'Başvermə_tarixi_saatı': '2024-10-03 09:15', 'Aşkarlanma_tarixi': '2024-10-03 10:30', 'İnsident_statusu': 'Bağlandı', 'İnsidentə_cavab_variantı': 'Nəzarət Altına Al', 'İnsidentə_cavab_üsulu': 'Hesabı Blokla', 'İnsidentə_cavab_həlli': 'HLL-001', 'Kök_səbəb': 'İstifadəçi xəbərdarlığa məhəl qoymadı', 'Nəticə': 'Zərər yoxdur', 'Bağlanma_tarixi_saatı': '2024-10-03 14:00' });

      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'Risk_Reyestri_Sablon.xlsx'; a.click();
      URL.revokeObjectURL(url);
      success('Şablon Yükləndi', '13 sheet-li Excel şablonu hazırlandı.');
    } catch (err) {
      error('Xəta', 'Şablon yaradıla bilmədi.');
    }
  };

  // ── Import summary counts ──────────────────────────────────────────────────
  const importCounts = Object.entries(importPreview).map(([id, rows]) => {
    const sheet = SHEETS.find(s => s.id === id);
    const count = id === 'risks' ? (rows as any[]).filter((r: any) => r.isValid !== false).length : rows.length;
    return { label: sheet?.label || id, count };
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-20">
      <Breadcrumbs
        onHomeClick={() => onNavigate('dashboard')}
        items={[
          { label: t('riskRegister.registry') },
          ...(activeSheet !== 'risks'
            ? [{ label: SHEETS.find(s => s.id === activeSheet)?.label || '', onClick: undefined }]
            : [])
        ]}
      />

      <AnimatePresence>
        {selectedRisk && <RiskDetailModal risk={selectedRisk} onClose={() => setSelectedRisk(null)} store={store} />}
        {showAddModal && <AddRiskModal onClose={() => setShowAddModal(false)} onSave={handleManualSave} />}

        {/* Import Preview Dialog */}
        {showImportDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Import Nəzərdən Keçirilməsi</h2>
                  <p className="text-sm text-slate-400 font-bold mt-1">Tapılan məlumatlar aşağıda göstərilir</p>
                </div>
                <button onClick={() => setShowImportDialog(false)} className="w-10 h-10 hover:bg-slate-50 rounded-xl flex items-center justify-center">
                  <MoreVertical size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="flex-grow overflow-auto p-8 space-y-6">
                {importErrors.length > 0 && (
                  <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2 flex items-center gap-2">
                      <AlertTriangle size={12} /> {importErrors.length} xəta aşkarlandı
                    </p>
                    <ul className="text-xs text-rose-500 space-y-1 list-disc pl-4">
                      {importErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                      {importErrors.length > 5 && <li>...{importErrors.length - 5} əlavə xəta</li>}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {importCounts.map(({ label, count }) => (
                    <div key={label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                      <p className="text-2xl font-black text-slate-900 mt-1">{count}</p>
                      <p className="text-[9px] text-slate-300 font-bold">sətir tapıldı</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-8 border-t border-slate-50 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Ümumi: {importCounts.reduce((a, c) => a + c.count, 0)} sətir
                </p>
                <div className="flex gap-4">
                  <Button variant="secondary" onClick={() => setShowImportDialog(false)}>Ləğv et</Button>
                  <Button onClick={confirmImport} disabled={importCounts.reduce((a, c) => a + c.count, 0) === 0}>
                    {importCounts.reduce((a, c) => a + c.count, 0)} Sətri İmport Et
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!riskToDelete}
        title="Riski Sil"
        message="Bu əməliyyat geri alına bilməz."
        confirmLabel="Sil"
        onConfirm={handleDelete}
        onCancel={() => setRiskToDelete(null)}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <PageHeader title="Risk Reyestri" subtitle="Risk idarəetmə sistemi — bütün cədvəllər" />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={handleAIAnalysis} disabled={isAnalyzing} icon={Brain} className="h-11 border-accent/20 text-accent">
            {isAnalyzing ? 'Analiz...' : t('ai.analyze')}
          </Button>
          <Button variant="secondary" onClick={handleDownloadTemplate} icon={FileDown} className="h-11">Şablon</Button>
          <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
          <Button variant="secondary" icon={FileUp} className="h-11" onClick={() => fileInputRef.current?.click()}>Import</Button>
          <Button variant="secondary" onClick={handleExport} icon={Download} className="h-11">Export Excel</Button>
          <Button icon={PlusCircle} onClick={() => setShowAddModal(true)} className="h-11 px-6 bg-accent border-none text-white font-black shadow-glow-accent">Risk Əlavə Et</Button>
        </div>
      </div>

      {/* Stats (risk tab only) */}
      {activeSheet === 'risks' && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { l: 'Ümumi', v: totals.total }, { l: 'Kritik', v: totals.critical },
            { l: 'Yüksək', v: totals.high }, { l: 'Açıq', v: totals.open },
            { l: 'Gecikmiş', v: totals.overdue }
          ].map(s => (
            <div key={s.l} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-saas transition-all group">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-accent transition-colors">{s.l}</p>
              <p className="text-2xl font-black mt-3 text-slate-900">{s.v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sheet count badges */}
      {activeSheet !== 'risks' && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {SHEETS.filter(s => s.id !== 'risks').map(s => {
            const count = s.id === 'risks' ? risks.length : (sheetData[s.id]?.length ?? 0);
            return (
              <div key={s.id} className={`p-4 rounded-2xl border cursor-pointer transition-all ${activeSheet === s.id ? 'bg-accent text-white border-accent' : 'bg-white border-slate-100 hover:border-accent/30'}`} onClick={() => setActiveSheet(s.id)}>
                <p className={`text-[9px] font-black uppercase tracking-widest truncate ${activeSheet === s.id ? 'text-white/70' : 'text-slate-400'}`}>{s.label}</p>
                <p className={`text-xl font-black mt-1 ${activeSheet === s.id ? 'text-white' : 'text-slate-900'}`}>{count}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Navigation — "risks" sheet is the default main view, not a tab */}
      <div className="flex gap-1 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setActiveSheet('risks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${
            activeSheet === 'risks'
              ? 'bg-accent text-white shadow-glow-accent'
              : 'bg-white text-slate-400 border border-slate-100 hover:border-accent/30 hover:text-accent'
          }`}
        >
          <ShieldAlert size={13} />
          Risk Reyestri
          <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${activeSheet === 'risks' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{risks.length}</span>
        </button>
        {SHEETS.filter(s => s.id !== 'risks').map(s => {
          const Icon = s.icon;
          const count = sheetData[s.id]?.length ?? 0;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSheet(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${
                activeSheet === s.id
                  ? 'bg-accent text-white shadow-glow-accent'
                  : 'bg-white text-slate-400 border border-slate-100 hover:border-accent/30 hover:text-accent'
              }`}
            >
              <Icon size={13} />
              {s.label}
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[8px] font-black ${activeSheet === s.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* RISK REYESTRI TABLE */}
      {activeSheet === 'risks' && (
        <Card noPadding className="overflow-hidden shadow-saas border-slate-100 rounded-[2rem]">
          <div className="p-6 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} strokeWidth={3} />
                <input type="text" placeholder="Axtarış..." className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-12 pr-4 py-3 text-sm font-black focus:bg-white focus:ring-4 focus:ring-accent/10 outline-none" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-3">
                <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="All">Bütün Kateqoriyalar</option>
                  {RISK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                  <option value="All">Bütün Səviyyələr</option>
                  {Object.values(RiskLevel).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="All">Bütün Statuslar</option>
                  {Object.values(RiskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none" value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
                  <option value="All">Bütün Sahiblər</option>
                  {owners.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            {selectedRisks.length > 0 && (
              <div className="p-4 bg-accent/5 border border-accent/10 rounded-2xl flex items-center justify-between">
                <span className="text-[10px] font-black text-accent uppercase tracking-widest">{selectedRisks.length} risk seçildi</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedRisks([])} className="text-slate-400 h-8 px-3 text-[10px]">Ləğv</Button>
              </div>
            )}
          </div>
          {loading ? (
            <TableSkeleton rows={8} />
          ) : filteredRisks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="pl-8 pr-2 py-5 w-10">
                      <input type="checkbox" onChange={toggleSelectAll} checked={selectedRisks.length === filteredRisks.length && filteredRisks.length > 0} className="w-5 h-5 rounded-lg accent-accent" />
                    </th>
                    {['Risk Adı / Kateqoriya','Sahibi','Bal','Səviyyə','Nəzarətlər','Status','Hədəf Tarix',''].map(h => (
                      <th key={h} className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 bg-white">
                  {filteredRisks.map((r: any) => {
                    const rc = controls.filter((c: any) => c.riskId === r.id);
                    return (
                      <tr key={r.id} className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${selectedRisks.includes(r.id) ? 'bg-accent/[0.03]' : ''}`}>
                        <td className="pl-8 pr-2 py-6">
                          <input type="checkbox" checked={selectedRisks.includes(r.id)} onChange={() => toggleSelectRisk(r.id)} className="w-5 h-5 rounded-lg accent-accent" />
                        </td>
                        <td className="px-4 py-6" onClick={() => setSelectedRisk(r)}>
                          <p className="font-black text-slate-900 text-sm group-hover:text-accent transition-colors">{r.title}</p>
                          <span className="text-[9px] font-black text-slate-400 bg-slate-100/50 px-2 py-0.5 rounded border border-slate-100 mt-1.5 inline-block">{r.category}</span>
                        </td>
                        <td className="px-4 py-6" onClick={() => setSelectedRisk(r)}>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">{r.owner.split(' ').map((n: string) => n[0]).join('').slice(0,2)}</div>
                            <span className="text-xs font-black text-slate-700">{r.owner}</span>
                          </div>
                        </td>
                        <td className="px-4 py-6 text-center" onClick={() => setSelectedRisk(r)}>
                          <span className="text-xs font-black text-slate-400 tabular-nums">{r.likelihood} × {r.impact}</span>
                        </td>
                        <td className="px-4 py-6 text-center" onClick={() => setSelectedRisk(r)}>
                          <Badge color={r.level === RiskLevel.CRITICAL || r.level === RiskLevel.HIGH ? 'red' : r.level === RiskLevel.MEDIUM ? 'yellow' : 'green'}>{r.level}</Badge>
                        </td>
                        <td className="px-4 py-6 text-center" onClick={() => setSelectedRisk(r)}>
                          <span className={`text-[10px] font-black ${rc.length > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{rc.length}</span>
                        </td>
                        <td className="px-4 py-6" onClick={() => setSelectedRisk(r)}>
                          <Badge color={r.status === RiskStatus.MITIGATED ? 'green' : r.status === RiskStatus.IN_PROGRESS ? 'blue' : 'red'}>{r.status}</Badge>
                        </td>
                        <td className="px-4 py-6 text-right font-black text-[11px] text-slate-400 tabular-nums" onClick={() => setSelectedRisk(r)}>{r.dueDate}</td>
                        <td className="pl-4 pr-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <Button variant="ghost" size="sm" icon={ShieldCheck} className="w-9 h-9 p-0 rounded-xl text-emerald-600 hover:bg-emerald-50" onClick={e => { e.stopPropagation(); handleMitigate(r); }} />
                            <Button variant="ghost" size="sm" icon={Trash2} className="w-9 h-9 p-0 rounded-xl text-rose-500 hover:bg-rose-50" onClick={e => { e.stopPropagation(); setRiskToDelete(r.id); }} />
                            <Button variant="ghost" size="sm" icon={MoreVertical} className="w-9 h-9 p-0 rounded-xl text-slate-400 hover:bg-slate-50" onClick={e => { e.stopPropagation(); setSelectedRisk(r); }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={FilterX} title="Risk tapılmadı" description="Filtrləri dəyişin və ya yeni risk əlavə edin." actionLabel="Risk Əlavə Et" onAction={() => setShowAddModal(true)} />
          )}
        </Card>
      )}

      {/* GENERIC TABLES for other sheets */}
      {activeSheet !== 'risks' && (() => {
        const sheet = SHEETS.find(s => s.id === activeSheet);
        if (!sheet) return null;
        const cols = COLUMNS[activeSheet] || [];
        const data = sheetData[activeSheet] || [];
        const Icon = sheet.icon;

        const exportSheet = async () => {
          const wb = new ExcelJS.Workbook();
          wb.creator = 'Riskeez';
          wb.created = new Date();
          const ws = wb.addWorksheet(sheet.sheetName);
          ws.columns = cols.map(c => ({ header: c, key: c, width: Math.max(c.length + 4, 20) }));
          ws.getRow(1).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = { bottom: { style: 'thin', color: { argb: 'FF334155' } }, right: { style: 'thin', color: { argb: 'FF334155' } } };
          });
          ws.getRow(1).height = 36;
          data.forEach((row, idx) => {
            const v: any = {};
            cols.forEach(c => { v[c] = row[c] ?? ''; });
            const r = ws.addRow(v);
            r.eachCell(cell => {
              cell.alignment = { vertical: 'middle', wrapText: false };
              if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
            });
          });
          const buf = await wb.xlsx.writeBuffer();
          const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `${sheet.sheetName}.xlsx`; a.click();
          URL.revokeObjectURL(url);
          success('Export edildi', `${sheet.label} — ${data.length} sətir Excel-ə ixrac edildi.`);
        };

        return (
          <Card noPadding className="shadow-saas border-slate-100 rounded-[2rem] overflow-hidden">
            {/* Sheet header bar */}
            <div className="flex items-center justify-between px-7 py-5 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">{sheet.label}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{data.length} sətir</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{cols.length} sütun</span>
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={FileDown}
                className="h-9 px-5 text-[10px] font-black"
                onClick={exportSheet}
                disabled={data.length === 0}
              >
                Excel Export
              </Button>
            </div>
            {/* Column chips */}
            <div className="px-7 py-3 bg-slate-50/50 border-b border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
              {cols.map(col => (
                <span key={col} className="shrink-0 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white border border-slate-100 px-2.5 py-1 rounded-full whitespace-nowrap">
                  {col.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            <div className="p-6 group">
              <EditableTable
                columns={cols}
                data={data}
                onSave={updatedRows => saveSheet(activeSheet, updatedRows)}
              />
            </div>
          </Card>
        );
      })()}

      {/* Footer */}
      <div className="flex items-center justify-center py-12 border-t border-slate-100">
        <div className="px-6 py-3 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-3 shadow-sm">
          <ShieldCheck size={18} className="text-emerald-500" strokeWidth={3} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('riskRegister.auditTrailActive')}</p>
        </div>
      </div>
    </div>
  );
};
