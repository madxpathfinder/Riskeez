import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'assessment' | 'risk' | 'control' | 'user';
}

export const StatusBadge = ({ status, type }: StatusBadgeProps) => {
  const getStyle = () => {
    const s = status.toLowerCase();
    if (s.includes('active') || s.includes('compl') || s.includes('implement')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-100';
    if (s.includes('progress') || s.includes('draft') || s.includes('partial')) return 'bg-amber-500/10 text-amber-600 border-amber-100';
    if (s.includes('open') || s.includes('disab')) return 'bg-rose-500/10 text-rose-500 border-rose-100';
    return 'bg-slate-100 text-slate-500 border-slate-200';
  };

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStyle()}`}>
      {status}
    </span>
  );
};
