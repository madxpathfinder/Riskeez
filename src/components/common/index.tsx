import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Search, Plus, Filter, Download, MoreVertical, Trash2 } from 'lucide-react';
import { RiskLevel, RiskStatus, ControlStatus } from '../../types';

// Reusable Badge component
export const Badge = ({ children, color = 'blue', className = '' }: any) => {
  const colors: any = {
    blue: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    yellow: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-rose-50 text-rose-600 border-rose-100',
    gray: 'bg-slate-100 text-slate-500 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-violet-50 text-violet-600 border-violet-100'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[color] || colors.blue} ${className}`}>
      {children}
    </span>
  );
};

// Reusable Button component
export const Button = ({ children, variant = 'primary', size = 'md', icon: Icon, onClick, className = '', disabled, type = 'button' }: any) => {
  const variants: any = {
    primary: 'bg-accent text-white hover:bg-accent-hover shadow-saas',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
    danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-saas'
  };

  const sizes: any = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button 
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />}
      {children}
    </button>
  );
};

// StatCard component
export const StatCard = ({ label, value, icon: Icon, color = 'blue', trend }: any) => {
  const colors: any = {
    blue: 'bg-violet-50 text-violet-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    accent: 'bg-violet-50 text-violet-600',
    red: 'bg-rose-50 text-rose-600',
    slate: 'bg-slate-50 text-slate-600'
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-saas flex items-center gap-5 transition-all hover:shadow-saas-lg">
      {Icon && (
        <div className={`w-12 h-12 rounded-2xl ${colors[color]} flex items-center justify-center`}>
          <Icon size={24} />
        </div>
      )}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xl font-bold text-slate-900">{value}</p>
          {trend && (
             <span className={`text-[10px] font-bold ${trend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend > 0 ? '+' : ''}{trend}%
             </span>
          )}
        </div>
      </div>
    </div>
  );
};

// EmptyState component
export const EmptyState = ({ title, description, icon: Icon, actionLabel, onAction }: any) => (
  <div className="py-20 text-center flex flex-col items-center">
    {Icon ? (
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 border border-slate-100 mb-6">
        <Icon size={40} />
      </div>
    ) : (
      <Search size={48} className="text-slate-100 mb-6" />
    )}
    <h4 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h4>
    <p className="text-sm text-slate-500 mt-2 max-w-sm font-medium leading-relaxed">{description}</p>
    {actionLabel && onAction && (
      <Button variant="secondary" className="mt-8" icon={Plus} onClick={onAction}>{actionLabel}</Button>
    )}
  </div>
);

// PageHeader component
export const PageHeader = ({ title, description, actions }: any) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {description && <p className="text-sm text-slate-500 font-medium mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

// Card component
export const Card = ({ title, subtitle, children, className = '', noPadding = false, headerActions }: any) => (
  <div className={`bg-white rounded-[32px] border border-slate-100 shadow-saas overflow-hidden ${className}`}>
    {(title || subtitle) && (
      <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
        <div>
          {title && <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-400 font-medium mt-1">{subtitle}</p>}
        </div>
        {headerActions && <div>{headerActions}</div>}
      </div>
    )}
    <div className={noPadding ? '' : 'p-8'}>
      {children}
    </div>
  </div>
);

// ConfirmDialog component
export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', variant = 'danger' }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[32px] w-full max-w-md shadow-2xl p-8 text-center">
        <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-6 ${variant === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-blue-50 text-blue-500'}`}>
          {variant === 'danger' ? <Trash2 size={32} /> : <Info size={32} />}
        </div>
        <h3 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h3>
        <p className="text-sm text-slate-500 mt-2 font-medium leading-relaxed">{message}</p>
        <div className="grid grid-cols-2 gap-4 mt-8">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </motion.div>
    </div>
  );
};

export * from './RiskBadge';
export * from './StatCard';
export * from './PageHeader';
export * from './GlobalSearch';
export * from './Toast';
export * from './DataTable';
export * from './PermissionGate';
export * from './Breadcrumbs';
export * from './Skeleton';
export * from './Modal';
