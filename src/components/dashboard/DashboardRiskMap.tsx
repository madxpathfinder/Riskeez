import React from 'react';
import { Card } from '../common';

export interface RiskMapCell {
  likelihood: number;
  impact: number;
  score: number;
  severity: string;
  count: number;
}

interface Props {
  riskMap: RiskMapCell[];
  navigateToRisks: (filter: Record<string, string>) => void;
}

const getSeverity = (score: number): string => {
  if (score >= 16) return 'critical';
  if (score >= 10) return 'high';
  if (score >= 5)  return 'medium';
  return 'low';
};

const FILLED: Record<string, string> = {
  critical: 'bg-brand border-brand text-white shadow-lg',
  high:     'bg-orange-500 border-orange-400 text-white shadow-md',
  medium:   'bg-amber-400 border-amber-300 text-white shadow-sm',
  low:      'bg-emerald-500 border-emerald-400 text-white',
};

const EMPTY: Record<string, string> = {
  critical: 'bg-rose-50 border-rose-100 text-rose-200',
  high:     'bg-orange-50 border-orange-100 text-orange-200',
  medium:   'bg-amber-50 border-amber-100 text-amber-200',
  low:      'bg-emerald-50 border-emerald-100 text-emerald-200',
};

const LEGEND = [
  { key: 'critical', label: 'Kritik (16–25)',  bg: 'bg-brand' },
  { key: 'high',     label: 'Yüksək (10–15)',  bg: 'bg-orange-500' },
  { key: 'medium',   label: 'Orta (5–9)',      bg: 'bg-amber-400' },
  { key: 'low',      label: 'Aşağı (1–4)',     bg: 'bg-emerald-500' },
];

export const DashboardRiskMap: React.FC<Props> = ({ riskMap, navigateToRisks }) => {
  const getCell = (l: number, i: number): RiskMapCell => {
    const score = l * i;
    const found = riskMap.find((c) => c.likelihood === l && c.impact === i);
    return { likelihood: l, impact: i, score, severity: getSeverity(score), count: found?.count ?? 0 };
  };

  const cellBase =
    'flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all duration-200 border font-black text-center h-12 w-full hover:opacity-90 hover:scale-105 select-none';

  return (
    <Card
      title="Risk xəritəsi"
      subtitle="Ehtimal × Təsir matrisi — klik etmək üçün hücreye basın"
      noPadding={false}
    >
      <div className="flex gap-3 mt-2">
        {/* Y-axis label */}
        <div className="flex items-center justify-center w-5">
          <span
            className="text-[9px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Ehtimal
          </span>
        </div>

        {/* Matrix + x-axis */}
        <div className="flex-grow min-w-0">
          {/* Y labels + rows */}
          {[5, 4, 3, 2, 1].map((likelihood) => (
            <div key={likelihood} className="flex items-center gap-1 mb-1">
              <span className="w-5 text-[10px] font-black text-slate-400 text-right shrink-0 tabular-nums">
                {likelihood}
              </span>
              {[1, 2, 3, 4, 5].map((impact) => {
                const cell = getCell(likelihood, impact);
                const cls = cell.count > 0 ? FILLED[cell.severity] : EMPTY[cell.severity];
                return (
                  <button
                    key={impact}
                    className={`${cellBase} ${cls} flex-1`}
                    onClick={() =>
                      navigateToRisks({
                        likelihood: String(likelihood),
                        impact: String(impact),
                      })
                    }
                    title={`${cell.severity.charAt(0).toUpperCase() + cell.severity.slice(1)}: Ehtimal=${likelihood} × Təsir=${impact} = Bal ${cell.score}${cell.count > 0 ? ` · ${cell.count} risk` : ''}`}
                  >
                    {cell.count > 0 ? (
                      <span className="text-sm font-black tabular-nums leading-none">{cell.count}</span>
                    ) : (
                      <span className="text-[10px] opacity-30 tabular-nums">{cell.score}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* X-axis numbers */}
          <div className="flex items-center gap-1 mt-1">
            <span className="w-5 shrink-0" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 text-center text-[10px] font-black text-slate-400 tabular-nums">
                {i}
              </div>
            ))}
          </div>
          {/* X-axis title */}
          <div className="text-center text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">
            Təsir
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-5 pt-4 border-t border-slate-50">
        {LEGEND.map(({ key, label, bg }) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3.5 h-3.5 rounded-md ${bg} shrink-0`} />
            <span className="text-[10px] font-bold text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};
