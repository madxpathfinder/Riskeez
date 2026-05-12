import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Shield, Users, Bot,
  Lock, Activity, Mail, Globe,
  Briefcase, Save, Languages, Key,
  ShieldCheck, AlertTriangle, ClipboardList,
  Database, Download, Upload, Trash2,
  Search, RefreshCw, Layers, FileText, ShieldAlert,
  Plus, Edit2, X, Check, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Badge, PermissionGate, Breadcrumbs, PageHeader } from '../common';
import { AIFrontService, AIStatus } from '../../services/aiFrontService';
import { useAuth } from '../../contexts/AuthContext';
import { Organization } from '../../types';
import { auditLogService } from '../../services/auditLogService';
import { format } from 'date-fns';
import { UserManagementTab } from './UserManagementTab';
import { authService } from '../../services/authService';
import { permissionService, Permission } from '../../services/permissionService';
import { Role } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';
import { APP_CONFIG } from '../../config/appConfig';
import { api } from '../../services/apiClient';
import { useBranding } from '../../contexts/BrandingContext';

// ─── types ───────────────────────────────────────────────────────────────────
interface RiskCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  isDefault?: boolean;
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const categoryApi = {
  list: async (): Promise<RiskCategory[]> => {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.get<{ categories: RiskCategory[] }>('/api/categories');
      return res.categories;
    }
    return [];
  },
  create: async (data: Partial<RiskCategory>): Promise<RiskCategory> => {
    const res = await api.post<{ category: RiskCategory }>('/api/categories', data);
    return res.category;
  },
  update: async (id: string, data: Partial<RiskCategory>): Promise<RiskCategory> => {
    const res = await api.put<{ category: RiskCategory }>(`/api/categories/${id}`, data);
    return res.category;
  },
  delete: async (id: string, force = false): Promise<{ usageCount: number }> => {
    const res = await api.delete<{ usageCount: number; error?: string }>(`/api/categories/${id}${force ? '?force=true' : ''}`);
    return res;
  },
  checkUsage: async (id: string): Promise<number> => {
    try {
      await api.delete<any>(`/api/categories/${id}`);
      return 0;
    } catch (e: any) {
      return e?.usageCount ?? 0;
    }
  }
};

// ─── main page ────────────────────────────────────────────────────────────────
export const SettingsPage = ({ store, onNavigate }: any) => {
  const { t } = useLanguage();
  const { setSubLabel } = useBreadcrumb();
  const [activeSection, setActiveSection] = useState('organization');
  const { user } = useAuth();
  const isAdmin = user?.role === Role.ADMIN;
  const { success, error: toastError } = useToast();

  const navItems = [
    { id: 'organization', label: t('settings.organizationProfile'), icon: Building2 },
    { id: 'scoring', label: t('settings.riskScoringSettings'), icon: Activity },
    { id: 'categories', label: t('settings.riskCategories'), icon: Shield },
    { id: 'users', label: t('nav.usersPermissions'), icon: Users },
    { id: 'intelligence', label: t('settings.aiSettings'), icon: Bot },
    { id: 'security', label: t('settings.securityPrivacy'), icon: Lock },
    { id: 'audit', label: t('nav.auditLog'), icon: ClipboardList },
    { id: 'data', label: t('common.export'), icon: Database }
  ];

  useEffect(() => {
    const item = navItems.find(n => n.id === activeSection);
    setSubLabel(item?.label || '');
  }, [activeSection]); // eslint-disable-line

  return (
    <div className="space-y-6 pb-20">
      <Breadcrumbs onHomeClick={() => onNavigate('dashboard')} items={[{ label: t('settings.title') }, { label: navItems.find(n => n.id === activeSection)?.label || t('settings.general') }]} />
      <PageHeader title={t('settings.title')} subtitle="Manage organization identity, risk scoring methodologies, and autonomous intelligence settings." />

      <div className="flex flex-col lg:flex-row gap-10">
        <div className="lg:w-72 space-y-2 shrink-0">
          {navItems.map((item) => (
            <PermissionGate key={item.id} permission={item.id === 'users' ? Permission.MANAGE_USERS : Permission.VIEW_DASHBOARD} fallback={null}>
              <button
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-tighter transition-all group ${
                  activeSection === item.id
                    ? 'bg-slate-900 text-white shadow-saas'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent hover:border-slate-100'
                }`}
              >
                <div className="flex items-center gap-4">
                  <item.icon size={20} className={activeSection === item.id ? 'text-accent' : 'text-slate-300 group-hover:text-slate-500'} />
                  {item.label}
                </div>
                {activeSection === item.id && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
              </button>
            </PermissionGate>
          ))}
        </div>

        <div className="flex-grow min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'organization' && <OrganizationSettings />}
              {activeSection === 'scoring' && <ScoringSettings />}
              {activeSection === 'categories' && <CategorySettings />}
              {activeSection === 'users' && <UserManagementTab />}
              {activeSection === 'intelligence' && <AISettings />}
              {activeSection === 'security' && <SecuritySettings />}
              {activeSection === 'audit' && <AuditLogSettings onNavigate={onNavigate} />}
              {activeSection === 'data' && <DataExchangeSettings store={store} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ─── organization settings ────────────────────────────────────────────────────
const OrganizationSettings = () => {
  const { t } = useLanguage();
  const { organization, updateOrganization } = useAuth();
  const { success, error: toastError } = useToast();
  const [formData, setFormData] = useState<Partial<Organization>>(organization || {});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (organization) setFormData(organization);
  }, [organization]);

  const set = (k: keyof Organization, v: any) => setFormData(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!organization) return;
    setIsSaving(true);
    try {
      await updateOrganization({ ...organization, ...formData });
      success(t('common.update'), 'Organization profile saved successfully.');
      await auditLogService.log('organization_updated', 'Settings', 'Updated organization identity profile');
    } catch {
      toastError('Save Failed', 'Could not save organization profile.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!organization) return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">{t('common.loading')}...</div>;

  return (
    <div className="space-y-6">
      <Card title={t('settings.organizationProfile')} subtitle="Fundamental identification data for reports and assessments">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('common.title')}</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all" value={formData.name || ''} onChange={e => set('name', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Industry Vertical</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all" value={formData.industry || ''} onChange={e => set('industry', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Jurisdiction / Country</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all" value={formData.country || ''} onChange={e => set('country', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('settings.contactEmail')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all" value={formData.email || ''} onChange={e => set('email', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('settings.website')}</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all" placeholder="https://example.com" value={formData.website || ''} onChange={e => set('website', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Employee Count</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all appearance-none" value={formData.size || ''} onChange={e => set('size', e.target.value)}>
                  <option value="1-10">1 - 10 Employees</option>
                  <option value="11-50">11 - 50 Employees</option>
                  <option value="51-250">51 - 250 Employees</option>
                  <option value="251-1000">251 - 1000 Employees</option>
                  <option value="1000+">1000+ Employees (Enterprise)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Region / Division</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all" value={formData.region || ''} onChange={e => set('region', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('settings.address')}</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all" value={formData.address || ''} onChange={e => set('address', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{t('settings.timezone')}</label>
              <div className="relative">
                <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all" placeholder="UTC, Asia/Baku..." value={formData.timezone || ''} onChange={e => set('timezone', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Departments (comma-separated)</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all" placeholder="IT, Finance, HR, Legal" value={formData.departments?.join(', ') || ''} onChange={e => set('departments', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 flex items-center justify-end">
          <Button icon={Save} onClick={handleSave} isLoading={isSaving} className="h-12 px-8 font-black shadow-glow-accent">
            {isSaving ? 'Synchronizing...' : 'Save Configuration'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ─── scoring settings ─────────────────────────────────────────────────────────
const ScoringSettings = () => (
  <Card title="Risk Calculation Matrix" subtitle="Standardized formula for determining probability and impact levels">
    <div className="space-y-8">
      <div className="p-6 bg-slate-900 rounded-3xl text-white">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="text-accent" size={20} />
          <h4 className="text-sm font-bold uppercase tracking-widest">Base Formula</h4>
        </div>
        <p className="text-2xl font-black tracking-tight">Likelihood (1-5) × Impact (1-5) = Risk Score (1-25)</p>
      </div>
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Severity Thresholds</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { range: '1 - 4', level: 'Low', dot: 'bg-emerald-500' },
            { range: '5 - 9', level: 'Medium', dot: 'bg-amber-500' },
            { range: '10 - 15', level: 'High', dot: 'bg-rose-500' },
            { range: '16 - 25', level: 'Critical', dot: 'bg-rose-500' }
          ].map((t) => (
            <div key={t.level} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between shadow-saas">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-8 rounded-full ${t.dot}`} />
                <span className="font-bold text-slate-800">{t.level}</span>
              </div>
              <span className="text-xs font-bold text-slate-400 tabular-nums">{t.range} Points</span>
            </div>
          ))}
        </div>
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
          <Lock size={16} className="text-blue-500" />
          <p className="text-xs text-blue-700 font-medium">Scoring thresholds are locked for this subscription tier.</p>
        </div>
      </div>
    </div>
  </Card>
);

// ─── category settings (full CRUD) ───────────────────────────────────────────
const PRESET_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

const CategorySettings = () => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const [categories, setCategories] = useState<RiskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RiskCategory | null>(null);
  const [deleteUsage, setDeleteUsage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryApi.list();
      setCategories(data);
    } catch { /* localStorage fallback: show nothing */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ name: '', description: '', color: '#6366f1' }); setEditingId(null); setShowForm(true); };
  const openEdit = (c: RiskCategory) => { setForm({ name: c.name, description: c.description || '', color: c.color }); setEditingId(c.id); setShowForm(true); };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        const updated = await categoryApi.update(editingId, form);
        setCategories(prev => prev.map(c => c.id === editingId ? updated : c));
        success(t('common.update'), `Category "${updated.name}" updated.`);
      } else {
        const created = await categoryApi.create(form);
        setCategories(prev => [...prev, created]);
        success(t('settings.addCategory'), `Category "${created.name}" added.`);
      }
      setShowForm(false);
    } catch (e: any) {
      toastError('Failed', e?.message || 'Could not save category.');
    } finally { setSaving(false); }
  };

  const handleDeleteClick = async (cat: RiskCategory) => {
    // Try delete — if 409 conflict (in-use), surface warning
    try {
      await categoryApi.delete(cat.id, false);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
      success(t('common.delete'), `Category "${cat.name}" deleted.`);
    } catch (e: any) {
      if (e?.status === 409 || e?.usageCount) {
        setDeleteUsage(e.usageCount ?? 0);
        setDeleteTarget(cat);
      } else {
        toastError('Delete Failed', e?.message || 'Could not delete category.');
      }
    }
  };

  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    try {
      await categoryApi.delete(deleteTarget.id, true);
      setCategories(prev => prev.filter(c => c.id !== deleteTarget.id));
      success(t('common.delete'), `Category "${deleteTarget.name}" force-deleted.`);
    } catch (e: any) {
      toastError('Delete Failed', e?.message || 'Could not delete.');
    } finally { setDeleteTarget(null); }
  };

  return (
    <Card title={t('settings.riskCategories')} subtitle="Classifications used for risk thematic grouping">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400">{categories.length} {t('settings.categoriesActive')}</p>
          <Button icon={Plus} onClick={openAdd} className="h-9 px-4 text-xs font-black">{t('settings.addCategory')}</Button>
        </div>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 overflow-hidden"
            >
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                {editingId ? t('settings.editCategory') : t('settings.addCategory')}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Name *</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-black outline-none focus:ring-4 focus:ring-accent/10"
                    placeholder="e.g., Cybersecurity"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Description</label>
                  <input
                    type="text"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:ring-4 focus:ring-accent/10"
                    placeholder="Optional description"
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Color</label>
                <div className="flex items-center gap-3 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(p => ({ ...p, color: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-slate-900 scale-125' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input type="color" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} className="w-8 h-8 rounded-full border border-slate-200 cursor-pointer" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} isLoading={saving} className="h-9 px-5 text-xs font-black" icon={Check}>{editingId ? t('common.update') : t('common.add')}</Button>
                <Button variant="ghost" onClick={() => setShowForm(false)} className="h-9 px-5 text-xs font-black" icon={X}>{t('common.cancel')}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Category Grid */}
        {loading ? (
          <div className="text-center py-10 text-slate-400 text-xs font-bold uppercase tracking-widest">{t('common.loading')}...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Tag size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-xs font-bold uppercase tracking-widest">{t('settings.noCategoriesYet')}</p>
            <p className="text-[10px] text-slate-300 mt-1">{t('settings.noCategoriesDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map(cat => (
              <div
                key={cat.id}
                className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight truncate">{cat.name}</p>
                    {cat.description && <p className="text-[9px] text-slate-400 truncate">{cat.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                  <button onClick={() => openEdit(cat)} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg text-slate-400 hover:text-accent transition-colors">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDeleteClick(cat)} className="w-7 h-7 flex items-center justify-center hover:bg-white rounded-lg text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Force-delete confirmation */}
        <AnimatePresence>
          {deleteTarget && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
            >
              <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 space-y-6 shadow-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">{t('settings.categoryInUse')}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      "{deleteTarget.name}" {t('settings.categoryInUseDesc', { count: deleteUsage })}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-600">{t('settings.categoryDeleteWarning')}</p>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setDeleteTarget(null)} className="flex-1 h-10 font-black text-xs">{t('common.cancel')}</Button>
                  <button onClick={handleForceDelete} className="flex-1 h-10 bg-rose-500 text-white rounded-xl text-xs font-black hover:bg-rose-600 transition-colors">
                    {t('settings.forceDelete')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

// ─── ai settings ──────────────────────────────────────────────────────────────
const AISettings = () => {
  const { t, language: currentLanguage, setLanguage } = useLanguage();
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState('Gemini');

  React.useEffect(() => {
    AIFrontService.getStatus()
      .then(setAiStatus)
      .catch(err => console.error('AI Status Error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card title={t('settings.aiSettings')} subtitle="Configuration for the enterprise-grade automated reasoning engine">
      <div className="space-y-8">
        <div className="p-6 bg-white border border-slate-200 rounded-[32px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
              aiStatus?.status === 'Connected' ? 'bg-emerald-50 text-emerald-600' :
              aiStatus?.status === 'Mock Mode' ? 'bg-indigo-50 text-indigo-600' :
              'bg-rose-50 text-rose-600'
            }`}>
              <Bot size={28} />
            </div>
            <div>
              <h5 className="text-base font-black text-slate-900">Intelligence Core Status</h5>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                  aiStatus?.status === 'Connected' ? 'bg-emerald-500' :
                  aiStatus?.status === 'Mock Mode' ? 'bg-indigo-500' :
                  'bg-rose-500'
                }`} />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {loading ? 'Checking...' : aiStatus?.status === 'Connected' ? 'Engine Connected' : aiStatus?.status === 'Mock Mode' ? 'Simulated Intelligence' : 'Engine Unavailable'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Active Model</p>
            <p className="text-sm font-black text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              {loading ? '---' : aiStatus?.modelName || 'Gemini 1.5 Pro'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{t('settings.language')}</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all appearance-none"
              value={currentLanguage}
              onChange={e => setLanguage(e.target.value as any)}
            >
              <option value="en">{t('settings.english')}</option>
              <option value="az">{t('settings.azerbaijani')}</option>
            </select>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Reasoning Provider</label>
            <select
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-black outline-none focus:bg-white focus:ring-4 focus:ring-accent/10 transition-all appearance-none"
              value={provider}
              onChange={e => setProvider(e.target.value)}
            >
              <option value="Gemini">Google Gemini (Production)</option>
              <option value="Mock">Mock Reasoning (Sandbox)</option>
            </select>
          </div>
        </div>

        <div className="p-6 bg-slate-900 rounded-[32px] text-white relative overflow-hidden">
          <div className="relative z-10">
            <h5 className="text-sm font-black uppercase tracking-widest text-accent mb-2">Automated Reasoning Policy</h5>
            <p className="text-xs text-slate-300 font-bold leading-relaxed italic">"{t('ai.disclaimer')}"</p>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        </div>
      </div>
    </Card>
  );
};

// ─── security settings ────────────────────────────────────────────────────────
const SecuritySettings = () => {
  const { appName } = useBranding();
  return (
  <Card title="Security & Data Protocol" subtitle="Enterprise-grade configuration for cryptographic isolation and institutional integrity">
    <div className="space-y-8">
      <div className="flex items-start gap-6 p-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] text-white shadow-glow-slate relative overflow-hidden">
        <div className="relative z-10 w-14 h-14 rounded-2xl bg-accent/20 text-accent flex items-center justify-center shrink-0 border border-accent/20">
          <ShieldCheck size={28} />
        </div>
        <div className="relative z-10">
          <h5 className="text-base font-black tracking-tight mb-2">Cryptographic Tenant Isolation</h5>
          <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-xl">
            Platform data is cryptographically segmented at the database layer. Production keys are managed via secure server-side environment variables.
          </p>
          <div className="flex gap-2 mt-5">
            <Badge color="blue" className="bg-blue-500/20 text-blue-400 border-blue-500/20">AES-256-GCM Active</Badge>
            <Badge color="emerald" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/20">SOC2 Type II Readiness</Badge>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16 blur-3xl" />
      </div>

      <div className="p-8 bg-amber-50 border border-amber-100/50 rounded-[2.5rem] relative overflow-hidden">
        <div className="relative z-10 flex gap-5">
          <div className="shrink-0 w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h5 className="text-sm font-black text-amber-900 uppercase tracking-tight mb-1">Institutional Disclaimer</h5>
            <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
              The {appName} Strategic AI Advisor provides advisory synthesized reasoning only. It does NOT replace legal, regulatory, audit, or professional risk advice.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-slate-100">
        <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-saas flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-md">
            <h6 className="text-base font-black text-slate-900 tracking-tight">Privileged Reset & Data Purge</h6>
            <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">
              Securely clear all organizational state and intelligence caches.
            </p>
          </div>
          <button
            onClick={() => { if (confirm('Wipe all platform data? This action requires administrative override.')) authService.resetMockSessionForDevelopmentOnly(); }}
            className="px-8 py-4 bg-white text-rose-600 border border-rose-100 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm"
          >
            Execute Emergency Data Purge
          </button>
        </div>
      </div>
    </div>
  </Card>
  );
};

// ─── audit log preview ────────────────────────────────────────────────────────
const AuditLogSettings = ({ onNavigate }: any) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditLogService.getLogs().then(data => { setLogs(data.slice(0, 10)); setLoading(false); });
  }, []);

  return (
    <Card title="Institutional Audit Discovery" subtitle="A preview of the immutable ledger documenting all system telemetry">
      <div className="space-y-8">
        <div className="overflow-x-auto border border-slate-50 rounded-[2rem] bg-slate-50/30">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="pl-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Actor</th>
                <th className="px-4 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                <th className="pr-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="p-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Syncing...</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-white transition-colors">
                  <td className="pl-10 py-6"><span className="text-[10px] font-black text-slate-400 tabular-nums">{format(new Date(log.timestamp), 'HH:mm:ss')}</span></td>
                  <td className="px-4 py-6 font-black text-slate-800 text-[11px]">{log.userName}</td>
                  <td className="px-4 py-6"><p className="text-[11px] font-black text-slate-600 line-clamp-1">{log.action}</p></td>
                  <td className="pr-10 py-6 text-right"><Badge color={log.severity === 'Critical' ? 'red' : 'slate'} className="text-[8px]">{log.severity || 'Low'}</Badge></td>
                </tr>
              ))}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={4} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No telemetry signals captured.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white flex items-center justify-between shadow-saas relative overflow-hidden">
          <div className="relative z-10">
            <h5 className="text-base font-black tracking-tight mb-2">View Full Audit Intelligence Trail</h5>
            <p className="text-xs text-slate-400 font-bold max-w-sm">Access the complete immutable history with advanced filtering and CSV extraction.</p>
          </div>
          <Button onClick={() => onNavigate('audit')} className="relative z-10 h-14 px-10 font-black shadow-glow-accent">Launch Audit Module</Button>
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        </div>
      </div>
    </Card>
  );
};

// ─── data export settings ─────────────────────────────────────────────────────
const DataExchangeSettings = ({ store }: any) => {
  const { t } = useLanguage();
  const { risks } = store;
  const { success, error: toastError } = useToast();

  const exportRisksCSV = async () => {
    try {
      if (APP_CONFIG.DATA_PROVIDER === 'api') {
        const token = localStorage.getItem('riskeez_token');
        const res = await fetch('/api/risks/export.csv', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `risk_register_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        success(t('settings.exportComplete'), 'Risk register exported successfully.');
        return;
      }
      // localStorage fallback
      const headers = ['ID', 'Title', 'Category', 'Level', 'Score', 'Status', 'Owner'];
      const rows = risks.map((r: any) => [r.id, r.title, r.category, r.level, r.score, r.status, r.owner]);
      const csv = [headers, ...rows].map(e => e.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `riskeez_register_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      success(t('settings.exportComplete'), 'Risk register exported.');
    } catch (e: any) {
      toastError('Export Failed', e?.message || 'Could not export risk register.');
    }
  };

  const exportAuditCSV = async () => {
    try {
      if (APP_CONFIG.DATA_PROVIDER === 'api') {
        const token = localStorage.getItem('riskeez_token');
        const res = await fetch('/api/audit-logs/export.csv', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `audit_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        success(t('settings.exportComplete'), 'Audit log exported successfully.');
        return;
      }
      toastError('Not Available', 'Audit log export requires API mode.');
    } catch (e: any) {
      toastError('Export Failed', e?.message || 'Could not export audit log.');
    }
  };

  return (
    <Card title="Data Registry & Portfolio Export" subtitle="Standardized ingestion and portability tools for the risk register">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-saas space-y-6">
          <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
            <Download size={24} />
          </div>
          <div>
            <h5 className="text-base font-black text-slate-900 tracking-tight">{t('settings.exportRiskRegister')}</h5>
            <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">Download a complete snapshot of your risk profile in CSV format.</p>
          </div>
          <div className="flex flex-col gap-3">
            <Button className="w-full h-12 font-black" icon={Download} onClick={exportRisksCSV}>{t('settings.exportRiskRegister')}</Button>
            <Button variant="secondary" className="w-full h-12 font-black" icon={RefreshCw} onClick={exportAuditCSV}>{t('audit.exportAuditLog')}</Button>
          </div>
        </div>

        <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-saas space-y-6">
          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
            <Upload size={24} />
          </div>
          <div>
            <h5 className="text-base font-black text-slate-900 tracking-tight">Import Configuration</h5>
            <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">
              Bulk upload risks and categories using our standardized template.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button variant="secondary" className="w-full h-12 font-black border-slate-100" icon={Upload} onClick={() => toastError('Not Available', 'Use Risk Register → Import Register for bulk imports.')}>Upload CSV File</Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
