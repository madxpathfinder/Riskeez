import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isUp: boolean;
  };
  color?: 'blue' | 'purple' | 'amber' | 'rose' | 'emerald';
}

export const StatCard = ({ title, value, icon: Icon, trend, color = 'blue' }: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600',
    purple: 'bg-purple-500/10 text-purple-600',
    amber: 'bg-amber-500/10 text-amber-600',
    rose: 'bg-rose-500/10 text-rose-600',
    emerald: 'bg-emerald-500/10 text-emerald-600'
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 opacity-[0.03] transition-transform group-hover:scale-110`}>
        <Icon size={96} />
      </div>

      <div className="flex items-start justify-between relative z-10">
        <div className={`p-3 rounded-2xl ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${trend.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend.isUp ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
            {trend.value}
          </div>
        )}
      </div>

      <div className="mt-4 relative z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
};
