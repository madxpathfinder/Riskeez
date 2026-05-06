import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  homeLabel?: string;
  onHomeClick?: () => void;
}

export const Breadcrumbs = ({ items, homeLabel = 'Dashboard', onHomeClick }: BreadcrumbsProps) => {
  return (
    <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">
      <button 
        onClick={onHomeClick}
        className="flex items-center gap-1.5 hover:text-accent transition-colors"
      >
        <Home size={12} />
        {homeLabel}
      </button>
      
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={10} className="text-slate-300" />
          <button 
            onClick={item.onClick}
            disabled={!item.onClick}
            className={`transition-colors ${item.onClick ? 'hover:text-accent' : 'cursor-default'}`}
          >
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};
