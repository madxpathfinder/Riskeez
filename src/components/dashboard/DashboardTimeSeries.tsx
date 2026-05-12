import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import {
  RefreshCw, Download, TrendingUp, BarChart2, Table2,
  ChevronDown, X, AlertCircle, Filter
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { dashboardService, TimeSeriesPoint, GroupByOption } from '../../services/dashboardService';
import { APP_CONFIG } from '../../config/appConfig';

// ── Colour palette ────────────────────────────────────────────────────────────
const SERIES_CFG = [
  { key: 'createdRisks',    labelKey: 'seriesCreated',    color: '#6366F1' },
  { key: 'resolvedRisks',   labelKey: 'seriesResolved',   color: '#10B981' },
  { key: 'unresolvedRisks', labelKey: 'seriesUnresolved', color: '#F59E0B' },
  { key: 'criticalRisks',   labelKey: 'seriesCritical',   color: '#DC2626' },
  { key: 'highRisks',       labelKey: 'seriesHigh',       color: '#EA580C' },
  { key: 'mediumRisks',     labelKey: 'seriesMedium',     color: '#D97706' },
  { key: 'lowRisks',        labelKey: 'seriesLow',        color: '#059669' },
  { key: 'overdueRisks',    labelKey: 'seriesOverdue',    color: '#8B5CF6' },
] as const;

type SeriesKey = typeof SERIES_CFG[number]['key'];

// Default visible series in chart
const DEFAULT_VISIBLE: Record<SeriesKey, boolean> = {
  createdRisks: true, resolvedRisks: true, unresolvedRisks: true,
  criticalRisks: false, highRisks: false, mediumRisks: false,
  lowRisks: false, overdueRisks: false,
};

// ── Date helpers ──────────────────────────────────────────────────────────────
const fmt = (d: Date) => d.toISOString().split('T')[0];
const today = () => fmt(new Date());
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };

function presetRange(p: string): { from: string; to: string; groupBy: GroupByOption } {
  const t = today();
  if (p === 'last7')    return { from: daysAgo(7),  to: t, groupBy: 'day' };
  if (p === 'last30')   return { from: daysAgo(30), to: t, groupBy: 'day' };
  if (p === 'last90')   return { from: daysAgo(90), to: t, groupBy: 'week' };
  if (p === 'thisMonth') {
    const n = new Date(); n.setDate(1);
    return { from: fmt(n), to: t, groupBy: 'day' };
  }
  if (p === 'thisYear') {
    const n = new Date(); n.setMonth(0, 1);
    return { from: fmt(n), to: t, groupBy: 'month' };
  }
  return { from: daysAgo(30), to: t, groupBy: 'month' };
}

// ── Change badge ──────────────────────────────────────────────────────────────
const ChangeBadge = ({ v }: { v: number | null }) => {
  if (v === null) return <span className="text-slate-300 text-[10px]">—</span>;
  const pos = v > 0;
  const zero = v === 0;
  return (
    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
      zero ? 'text-slate-400 border-slate-100 bg-slate-50'
           : pos ? 'text-rose-600 border-rose-100 bg-rose-50'
                 : 'text-emerald-600 border-emerald-100 bg-emerald-50'
    }`}>
      {pos ? '+' : ''}{v}%
    </span>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const ChartSkeleton = () => (
  <div className="animate-pulse space-y-3 p-6">
    <div className="h-4 w-1/3 bg-slate-100 rounded-lg" />
    <div className="h-[280px] w-full bg-slate-50 rounded-2xl" />
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
interface Props {
  setActiveTab: (tab: string) => void;
  departments?: string[];
  owners?: string[];
}

export const DashboardTimeSeries = ({ setActiveTab, departments = [], owners = [] }: Props) => {
  const { t } = useLanguage();
  const ts = (k: string) => (t as any)('timeSeries.' + k) as string;
  const rrNavigate = useNavigate();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [preset, setPreset]               = useState('last30');
  const [customFrom, setCustomFrom]       = useState('');
  const [customTo, setCustomTo]           = useState('');
  const [showCustom, setShowCustom]       = useState(false);
  const [groupBy, setGroupBy]             = useState<GroupByOption>('day');
  const [filterDept, setFilterDept]       = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterOwner, setFilterOwner]     = useState('');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [chartType, setChartType]         = useState<'line'|'bar'|'table'>('line');
  const [visible, setVisible]             = useState<Record<SeriesKey, boolean>>(DEFAULT_VISIBLE);
  const [series, setSeries]               = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  // ── Computed from/to ──────────────────────────────────────────────────────
  const getRange = useCallback(() => {
    if (preset === 'custom') {
      return { from: customFrom || daysAgo(30), to: customTo || today(), groupBy };
    }
    return presetRange(preset);
  }, [preset, customFrom, customTo, groupBy]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetch = useCallback(async () => {
    if (APP_CONFIG.DATA_PROVIDER !== 'api') return;
    const range = getRange();
    setLoading(true);
    setError('');
    try {
      const res = await dashboardService.getTimeSeries({
        from: range.from,
        to: range.to,
        groupBy: range.groupBy,
        department: filterDept || undefined,
        severity: filterSeverity || undefined,
        status: filterStatus || undefined,
        owner: filterOwner || undefined,
      });
      setSeries(res?.series ?? []);
    } catch {
      setError('API xətası');
    } finally {
      setLoading(false);
    }
  }, [getRange, filterDept, filterSeverity, filterStatus, filterOwner]);

  // Auto-sync groupBy when preset changes (except custom)
  useEffect(() => {
    if (preset !== 'custom') {
      const { groupBy: gb } = presetRange(preset);
      setGroupBy(gb);
    }
  }, [preset]);

  // Fetch on mount and when filters change
  useEffect(() => { fetch(); }, [fetch]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigate = (extra: Record<string, string> = {}) => {
    const range = getRange();
    const params = new URLSearchParams({ from: range.from, to: range.to, ...extra });
    rrNavigate(`/risks?${params.toString()}`);
  };

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCsv = () => {
    const cols = ['Period','Created','Resolved','Unresolved','Critical','High','Medium','Low','Overdue','Change%'];
    const rows = series.map(s => [
      s.label, s.createdRisks, s.resolvedRisks, s.unresolvedRisks,
      s.criticalRisks, s.highRisks, s.mediumRisks, s.lowRisks,
      s.overdueRisks, s.changePercent ?? ''
    ]);
    const totals = series.reduce((acc, s) => ({
      created: acc.created + s.createdRisks, resolved: acc.resolved + s.resolvedRisks,
      unresolved: acc.unresolved + s.unresolvedRisks, critical: acc.critical + s.criticalRisks,
      high: acc.high + s.highRisks, medium: acc.medium + s.mediumRisks,
      low: acc.low + s.lowRisks, overdue: acc.overdue + s.overdueRisks,
    }), { created:0, resolved:0, unresolved:0, critical:0, high:0, medium:0, low:0, overdue:0 });
    rows.push(['TOTAL', totals.created, totals.resolved, totals.unresolved, totals.critical, totals.high, totals.medium, totals.low, totals.overdue, '']);

    const csv = [cols, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-trend-${today()}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Toggle series visibility ──────────────────────────────────────────────
  const toggleSeries = (key: SeriesKey) =>
    setVisible(prev => ({ ...prev, [key]: !prev[key] }));

  const range = getRange();

  // ── Totals row ────────────────────────────────────────────────────────────
  const totals = series.reduce((acc, s) => ({
    created: acc.created + s.createdRisks, resolved: acc.resolved + s.resolvedRisks,
    unresolved: acc.unresolved + s.unresolvedRisks, critical: acc.critical + s.criticalRisks,
    high: acc.high + s.highRisks, medium: acc.medium + s.mediumRisks,
    low: acc.low + s.lowRisks, overdue: acc.overdue + s.overdueRisks,
  }), { created:0, resolved:0, unresolved:0, critical:0, high:0, medium:0, low:0, overdue:0 });

  // ── Recharts tooltip ──────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-4 text-xs space-y-1.5 min-w-[180px]">
        <p className="font-black text-slate-700 text-[11px] mb-2">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-slate-500 font-bold">{p.name}</span>
            </div>
            <span className="font-black text-slate-800 tabular-nums">{p.value}</span>
          </div>
        ))}
      </div>
    );
  };

  const visibleSeriesCfg = SERIES_CFG.filter(s => visible[s.key]);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-8 pt-8 pb-6 border-b border-slate-50">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">{ts('title')}</h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">{ts('subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Chart type toggle */}
            <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-1 gap-1">
              {([['line', TrendingUp], ['bar', BarChart2], ['table', Table2]] as const).map(([type, Icon]) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    chartType === type
                      ? 'bg-white shadow-sm text-accent border border-slate-100'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Icon size={13} />
                  {ts(type === 'line' ? 'lineChart' : type === 'bar' ? 'barChart' : 'tableView')}
                </button>
              ))}
            </div>
            <button
              onClick={exportCsv}
              disabled={series.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white hover:border-accent/30 hover:text-accent transition-all disabled:opacity-40"
            >
              <Download size={13} /> {ts('exportCsv')}
            </button>
            <button
              onClick={fetch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-white hover:border-accent/30 hover:text-accent transition-all disabled:opacity-40"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {ts('refresh')}
            </button>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="mt-5 flex flex-wrap gap-3 items-end">
          {/* Date preset */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ts('dateRange')}</label>
            <select
              value={preset}
              onChange={e => { setPreset(e.target.value); setShowCustom(e.target.value === 'custom'); }}
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20"
            >
              {(['last7','last30','last90','thisMonth','thisYear','custom'] as const).map(p => (
                <option key={p} value={p}>{ts(
                  p === 'last7' ? 'last7Days' : p === 'last30' ? 'last30Days' :
                  p === 'last90' ? 'last90Days' : p === 'thisMonth' ? 'thisMonth' :
                  p === 'thisYear' ? 'thisYear' : 'customRange'
                )}</option>
              ))}
            </select>
          </div>

          {/* Custom date inputs */}
          {showCustom && (
            <>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ts('from')}</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ts('to')}</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black outline-none focus:ring-2 focus:ring-accent/20" />
              </div>
            </>
          )}

          {/* Group by */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ts('groupBy')}</label>
            <select
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as GroupByOption)}
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20"
            >
              {(['day','week','month','quarter','year'] as const).map(g => (
                <option key={g} value={g}>{ts(
                  g === 'day' ? 'daily' : g === 'week' ? 'weekly' :
                  g === 'month' ? 'monthly' : g === 'quarter' ? 'quarterly' : 'yearly'
                )}</option>
              ))}
            </select>
          </div>

          {/* Department */}
          {departments.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ts('department')}</label>
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20">
                <option value="">{ts('allDepartments')}</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}

          {/* Severity */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ts('severity')}</label>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20">
              <option value="">{ts('allSeverities')}</option>
              {['critical','high','medium','low'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ts('status')}</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent/20">
              <option value="">{ts('allStatuses')}</option>
              <option value="open">Açıq</option>
              <option value="resolved">Həll olunan</option>
              <option value="unresolved">Həll olunmayan</option>
            </select>
          </div>

          {/* Owner free-text */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ts('owner')}</label>
            <input
              type="text"
              value={filterOwner}
              onChange={e => setFilterOwner(e.target.value)}
              placeholder={ts('ownerPlaceholder')}
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-[11px] font-black outline-none focus:ring-2 focus:ring-accent/20 w-36"
            />
          </div>

          {/* Clear filters */}
          {(filterDept || filterSeverity || filterStatus || filterOwner) && (
            <button
              onClick={() => { setFilterDept(''); setFilterSeverity(''); setFilterStatus(''); setFilterOwner(''); }}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-50 rounded-xl transition-all self-end"
            >
              <X size={12} /> {ts('clearFilters')}
            </button>
          )}
        </div>

        {/* ── Series toggles ── */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SERIES_CFG.map(s => (
            <button
              key={s.key}
              onClick={() => toggleSeries(s.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                visible[s.key]
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
              }`}
              style={visible[s.key] ? { backgroundColor: s.color } : {}}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: visible[s.key] ? 'white' : s.color }} />
              {ts(s.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chart area ── */}
      <div className="p-6">
        {loading && <ChartSkeleton />}

        {!loading && error && (
          <div className="flex items-center gap-3 p-5 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-sm font-bold">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {!loading && !error && series.length === 0 && (
          <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
            <Filter size={36} className="opacity-20" />
            <p className="text-sm font-black uppercase tracking-widest">{ts('noData')}</p>
          </div>
        )}

        {!loading && !error && series.length > 0 && (
          <>
            {/* Line chart */}
            {chartType === 'line' && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={series} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{value}</span>}
                    wrapperStyle={{ paddingTop: 12 }}
                  />
                  {SERIES_CFG.filter(s => visible[s.key]).map(s => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={ts(s.labelKey)}
                      stroke={s.color}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* Bar chart */}
            {chartType === 'bar' && (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={series} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barSize={series.length > 20 ? 6 : 14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} tickLine={false} axisLine={false} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{value}</span>}
                    wrapperStyle={{ paddingTop: 12 }}
                  />
                  {SERIES_CFG.filter(s => visible[s.key]).map(s => (
                    <Bar key={s.key} dataKey={s.key} name={ts(s.labelKey)} fill={s.color} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Table */}
            {chartType === 'table' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{ts('period')}</th>
                      {SERIES_CFG.map(s => (
                        <th key={s.key} className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">
                          <span className="flex items-center justify-end gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                            {ts(s.labelKey)}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">{ts('changePercent')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 bg-white">
                    {series.map((row, i) => (
                      <tr
                        key={row.period}
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                        onClick={() => navigate({ from: row.period, to: row.period })}
                        title={ts('clickToFilter')}
                      >
                        <td className="px-5 py-3.5 font-black text-slate-800 whitespace-nowrap group-hover:text-accent transition-colors">
                          {row.label}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className="font-black tabular-nums text-indigo-600 cursor-pointer hover:underline"
                            onClick={e => { e.stopPropagation(); navigate({ from: row.period, to: row.period }); }}
                          >{row.createdRisks}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-600">{row.resolvedRisks}</td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-amber-600">{row.unresolvedRisks}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`font-black tabular-nums cursor-pointer hover:underline ${row.criticalRisks > 0 ? 'text-rose-600' : 'text-slate-300'}`}
                            onClick={e => { e.stopPropagation(); navigate({ from: row.period, to: row.period, severity: 'Critical' }); }}
                          >{row.criticalRisks}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-orange-600">{row.highRisks}</td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-amber-500">{row.mediumRisks}</td>
                        <td className="px-4 py-3.5 text-right font-bold tabular-nums text-emerald-500">{row.lowRisks}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`font-black tabular-nums ${row.overdueRisks > 0 ? 'text-violet-600' : 'text-slate-300'}`}>{row.overdueRisks}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <ChangeBadge v={row.changePercent} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/80 border-t-2 border-slate-100">
                      <td className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-widest">{ts('totalRow')}</td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums text-indigo-600">{totals.created}</td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums text-emerald-600">{totals.resolved}</td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums text-amber-600">{totals.unresolved}</td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums text-rose-600">{totals.critical}</td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums text-orange-600">{totals.high}</td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums text-amber-500">{totals.medium}</td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums text-emerald-500">{totals.low}</td>
                      <td className="px-4 py-3.5 text-right font-black tabular-nums text-violet-600">{totals.overdue}</td>
                      <td className="px-4 py-3.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer hint ── */}
      {series.length > 0 && chartType !== 'table' && (
        <div className="px-8 pb-6 text-[10px] text-slate-300 font-bold uppercase tracking-widest">
          {ts('clickToFilter')}
        </div>
      )}
    </div>
  );
};
