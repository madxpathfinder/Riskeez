import React, { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  breadcrumbs?: { label: string; active?: boolean }[];
}

export const PageHeader = ({ title, subtitle, actions, breadcrumbs }: PageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        {breadcrumbs && (
          <div className="flex items-center gap-2 mb-2">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${crumb.active ? 'text-slate-900' : 'text-slate-400'}`}>
                  {crumb.label}
                </span>
                {idx < breadcrumbs.length - 1 && <ChevronRight size={10} className="text-slate-300" />}
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 font-medium text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
};
