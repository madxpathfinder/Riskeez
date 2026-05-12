import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Search, Filter, Download,
  ExternalLink, User, Clock, Shield,
  AlertTriangle, CheckCircle, Info, X,
  ChevronRight, Calendar, Bot, ShieldCheck, Globe, Activity
} from 'lucide-react';
import { format, isAfter, isBefore, parseISO, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button, Badge, PageHeader, Breadcrumbs, TableSkeleton } from '../common';
import { auditLogService } from '../../services/auditLogService';
import { AuditLog, AuditSeverity } from '../../types/audit';
import { useToast } from '../../contexts/ToastContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { APP_CONFIG } from '../../config/appConfig';

const MODULES = ['Risk', 'Assessment', 'Control', 'Document', 'Report', 'Setting', 'Settings', 'User', 'System', 'Intelligence', 'AI', 'Reporting', 'Organization'];

export const AuditLogPage = ({ onNavigate }: { onNavigate?: (tab: string) => void }) => {
  const { t } = useLanguage();
  const { success, error: toastError } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<AuditSeverity | 'All'>('All');
  const [filterModule, setFilterModule] = useState<string>('All');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterUser, setFilterUser] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditLogService.getLogs();
      setLogs(data);
    } catch (err: any) {
      toastError('Sync Error', err?.message || 'Unable to retrieve audit logs.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const ts = log.timestamp ? new Date(log.timestamp) : null;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match = (log.action || '').toLowerCase().includes(q)
        || (log.userName || '').toLowerCase().includes(q)
        || (log.details || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (filterSeverity !== 'All' && log.severity !== filterSeverity) return false;
    if (filterModule !== 'All' && log.module !== filterModule) return false;
    if (filterAction && !(log.action || '').toLowerCase().includes(filterAction.toLowerCase())) return false;
    if (filterUser && !(log.userName || '').toLowerCase().includes(filterUser.toLowerCase())) return false;
    if (startDate && ts && isBefore(ts, startOfDay(parseISO(startDate)))) return false;
    if (endDate && ts && isAfter(ts, endOfDay(parseISO(endDate)))) return false;
    return true;
  });

  const uniqueActions = (Array.from(new Set(logs.map(l => l.action).filter(Boolean))) as string[]).sort();

  const handleExport = async () => {
    try {
      if (APP_CONFIG.DATA_PROVIDER === 'api') {
        const token = localStorage.getItem('riskeez_jwt');
        const params = new URLSearchParams();
        if (filterModule !== 'All') params.set('module', filterModule);
        if (filterSeverity !== 'All') params.set('severity', filterSeverity);
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        const res = await fetch(`${APP_CONFIG.API_URL}/api/audit-logs/export.csv?${params}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Export failed');
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `riskeez_audit_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
        link.click();
        success(t('audit.exportSeeded'), t('audit.exportSeededDesc'));
        await auditLogService.log('audit_log_exported', 'System', `Exported ${filteredLogs.length} audit records`, 'Medium', 'UI');
        return;
      }
      // localStorage fallback
      const headers = [
        t('audit.csvHeaders.timestamp'), t('audit.csvHeaders.actor'),
        t('audit.csvHeaders.action'), t('audit.csvHeaders.module'),
        t('audit.csvHeaders.severity'), t('audit.csvHeaders.source'), t('audit.csvHeaders.details')
      ];
      const data = filteredLogs.map(l => [
        l.timestamp, l.userName, l.action, l.module, l.severity, l.source, l.details
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
      const csv = [headers.join(','), ...data].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `riskeez_audit_export_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      link.click();
      success(t('audit.exportSeeded'), t('audit.exportSeededDesc'));
    } catch (e: any) {
      toastError(t('audit.exportFailed'), e?.message || t('audit.exportFailedDesc'));
    }
  };

  const clearFilters = () => {
    setSearchTerm(''); setFilterSeverity('All'); setFilterModule('All');
    setFilterAction(''); setFilterUser(''); setStartDate(''); setEndDate('');
  };

  const getSeverityColor = (sev: AuditSeverity): any => {
    if (sev === 'Critical') return 'red';
    if (sev === 'High') return 'orange';
    if (sev === 'Medium') return 'yellow';
    return 'green';
  };

  const hasFilters = searchTerm || filterSeverity !== 'All' || filterModule !== 'All' || filterAction || filterUser || startDate || endDate;

  return (
    <div className="space-y-6 pb-20">
      <Breadcrumbs
        onHomeClick={onNavigate ? () => onNavigate('dashboard') : undefined}
        items={[{ label: t('nav.settings') || 'Settings', onClick: onNavigate ? () => onNavigate('settings') : undefined }, { label: t('nav.auditLog') }]}
      />

      <PageHeader
        title={t('audit.title')}
        subtitle={t('audit.subtitle')}
        actions={
          <div className="flex gap-3">
            <Button variant="secondary" icon={Clock} onClick={fetchLogs} className="h-11">{t('audit.refresh')}</Button>
            <Button icon={Download} onClick={handleExport} className="h-11 shadow-saas font-black">{t('audit.exportAuditLog')}</Button>
          </div>
        }
      />

      {/* Filter bar */}
      <div className="p-5 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder={t('audit.searchPlaceholder')}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-accent/5"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* User filter */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder={t('audit.filterByUser')}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-accent/5"
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            />
          </div>

          {/* Severity */}
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-accent/5 appearance-none"
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value as any)}
            >
              <option value="All">{t('audit.allSeverities')}</option>
              <option value="Low">{t('common.low')}</option>
              <option value="Medium">{t('common.medium')}</option>
              <option value="High">{t('common.high')}</option>
              <option value="Critical">{t('common.critical')}</option>
            </select>
          </div>

          {/* Module */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-accent/5 appearance-none"
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
            >
              <option value="All">{t('audit.allModules')}</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center bg-slate-900 rounded-xl text-white px-4 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-2" />
            <span className="text-[9px] font-black uppercase tracking-widest">{t('audit.eventsCount', { count: filteredLogs.length })}</span>
          </div>
        </div>

        {/* Date range row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="date"
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-accent/5"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="date"
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-accent/5"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="relative">
            <Activity className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <select
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black outline-none focus:ring-4 focus:ring-accent/5 appearance-none"
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
            >
              <option value="">{t('audit.allActions')}</option>
              {uniqueActions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-500 hover:text-rose-500 hover:border-rose-200 transition-all"
            >
              <X size={12} /> {t('audit.clearFilters')}
            </button>
          )}
        </div>
      </div>

      <Card noPadding className="overflow-hidden shadow-saas rounded-[2.5rem] border-slate-100 bg-white">
        {loading ? (
          <div className="p-10"><TableSkeleton rows={8} /></div>
        ) : filteredLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="pl-10 pr-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">{t('audit.dateTime')}</th>
                  <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('audit.actor')}</th>
                  <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('audit.actionModule')}</th>
                  <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('audit.severity')}</th>
                  <th className="px-4 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">{t('audit.source')}</th>
                  <th className="pl-4 pr-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{t('audit.details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="pl-10 pr-4 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-900 tracking-tight">
                          {log.timestamp ? format(new Date(log.timestamp), 'MMM dd, yyyy') : '—'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums uppercase">
                          {log.timestamp ? format(new Date(log.timestamp), 'HH:mm:ss') : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 text-[10px] font-black">
                          {(log.userName || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800">{log.userName || 'System'}</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{log.userRole || 'system'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 tracking-tight">{t('audit.actions.' + log.action) || (log.action || '').replace(/_/g, ' ').toUpperCase()}</span>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge color="slate" className="text-[8px] py-0 px-1.5">{log.module}</Badge>
                          {log.entityId && <span className="text-[9px] text-slate-400 font-bold">#{(log.entityId || '').slice(-6)}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <Badge color={getSeverityColor(log.severity)} className="h-6 w-20 flex items-center justify-center">{log.severity}</Badge>
                    </td>
                    <td className="px-4 py-6 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-100">
                        {log.source === 'AI' ? <Bot size={12} className="text-accent" /> : <Shield size={12} className="text-slate-400" />}
                        <span className="text-[9px] font-black text-slate-500">{log.source}</span>
                      </div>
                    </td>
                    <td className="pl-4 pr-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <p className="text-[10px] font-bold text-slate-500 line-clamp-1 max-w-[200px]">{log.details}</p>
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-accent transition-colors" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-24 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100">
              <Search size={32} />
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">{t('audit.noEvents')}</h3>
            <p className="text-sm font-bold text-slate-400 mt-1 max-w-xs mx-auto">{t('audit.noEventsDesc')}</p>
            <Button variant="ghost" onClick={clearFilters} className="mt-6 font-black uppercase text-[10px] tracking-widest">{t('audit.clearAllFilters')}</Button>
          </div>
        )}
      </Card>

      <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shadow-saas">
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-14 h-14 bg-accent/20 text-accent rounded-2xl flex items-center justify-center shrink-0 border border-accent/20">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h4 className="text-lg font-black tracking-tight mb-1">{t('audit.integrityDisclaimer')}</h4>
            <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-xl">{t('audit.integrityText')}</p>
          </div>
        </div>
        <div className="relative z-10 text-right shrink-0">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Platform Protocol</p>
          <Badge color="blue" className="h-7 px-4">SOC2 Journal Valid</Badge>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
      </div>

      <AnimatePresence>
        {selectedLog && <AuditLogDetail log={selectedLog} onClose={() => setSelectedLog(null)} />}
      </AnimatePresence>
    </div>
  );
};

const AuditLogDetail = ({ log, onClose }: { log: AuditLog; onClose: () => void }) => {
  const { t } = useLanguage();
  return (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl shadow-accent/5"
    >
      <div className="px-10 py-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-accent">
            <Activity size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{t('audit.eventProfile')}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ID: {log.id}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl transition-all text-slate-400">
          <X size={20} />
        </button>
      </div>

      <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] no-scrollbar">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('audit.actor')}</p>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[10px] font-black text-slate-400 shadow-sm">
                {(log.userName || 'S').charAt(0)}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">{log.userName}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase">{log.userRole || '—'}</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('audit.dateTime')}</p>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm"><Clock size={14} /></div>
              <p className="text-xs font-black text-slate-900">
                {log.timestamp ? format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss') : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-xl font-black tracking-tight text-accent">{(log.action || '').replace(/_/g, ' ').toUpperCase()}</h4>
            <Badge color={log.severity === 'Critical' ? 'red' : log.severity === 'High' ? 'orange' : 'green'} className="py-1 px-3">
              {log.severity} SEVERITY
            </Badge>
          </div>
          <p className="text-sm font-medium text-slate-300 leading-relaxed">{log.details || 'No details.'}</p>
          {log.module && (
            <div className="mt-4 flex items-center gap-2">
              <Badge color="slate" className="bg-white/10 text-slate-300 border-white/10">Module: {log.module}</Badge>
              {log.source && <Badge color="slate" className="bg-white/10 text-slate-300 border-white/10">Source: {log.source}</Badge>}
            </div>
          )}
        </div>

        {log.metadata && (
          <div className="space-y-4">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('audit.metadata')}</p>
            {log.metadata.before && log.metadata.after && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1 pl-2">{t('audit.before')}</p>
                  <pre className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-[9px] font-mono whitespace-pre-wrap overflow-x-auto text-slate-500">
                    {JSON.stringify(log.metadata.before, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-[8px] font-black text-accent uppercase mb-1 pl-2">{t('audit.after')}</p>
                  <pre className="p-4 bg-accent/5 border border-accent/10 rounded-2xl text-[9px] font-mono whitespace-pre-wrap overflow-x-auto text-accent">
                    {JSON.stringify(log.metadata.after, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            {log.metadata.isAiGenerated && (
              <div className="flex items-center gap-4 p-5 bg-accent/5 border border-accent/10 rounded-2xl">
                <Bot size={20} className="text-accent" />
                <div>
                  <p className="text-xs font-black text-slate-900">{t('audit.aiAction')}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                    {log.metadata.aiProvider} • {log.metadata.aiModel}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} className="font-black text-[10px] tracking-widest uppercase">{t('audit.dismiss')}</Button>
      </div>
    </motion.div>
  </div>
  );
};
