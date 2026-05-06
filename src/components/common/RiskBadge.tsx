import React from 'react';
import { RiskLevel } from '../../types/risk';

interface RiskBadgeProps {
  level: RiskLevel | string;
}

export const RiskBadge = ({ level }: RiskBadgeProps) => {
  const styles = {
    [RiskLevel.CRITICAL]: 'bg-rose-500/10 text-rose-500 border-rose-100',
    [RiskLevel.HIGH]: 'bg-amber-500/10 text-amber-600 border-amber-100',
    [RiskLevel.MEDIUM]: 'bg-blue-500/10 text-blue-600 border-blue-100',
    [RiskLevel.LOW]: 'bg-emerald-500/10 text-emerald-600 border-emerald-100',
  };

  const normalizedLevel = level as RiskLevel;

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${styles[normalizedLevel] || 'bg-slate-100 text-slate-500'}`}>
      {level}
    </span>
  );
};
