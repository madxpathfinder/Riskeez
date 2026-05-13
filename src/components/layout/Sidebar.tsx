import React from 'react';
import {
  Monitor,
  ClipboardCheck,
  ShieldAlert,
  ShieldCheck,
  FileText,
  MessageSquareText,
  BarChart3,
  Settings,
  ClipboardList,
  BookOpen,
  LogOut,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Role } from '../../types/user';
import { useBranding } from '../../contexts/BrandingContext';
import { ShieldCheck as ShieldCheckIcon } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

const NAV_ITEMS = [
  { id: 'monitoring',       path: '/monitoring',       label: 'nav.monitoring',  icon: Monitor },
  { id: 'assessments',      path: '/assessments',      label: 'nav.assessments', icon: ClipboardCheck },
  { id: 'risks',            path: '/risks',            label: 'nav.riskRegister',icon: ShieldAlert },
  { id: 'controls',         path: '/controls',         label: 'nav.controls',    icon: ShieldCheck },
  { id: 'documents',        path: '/documents',        label: 'nav.documents',   icon: FileText },
  { id: 'assistant',        path: '/assistant',        label: 'nav.aiAssistant', icon: MessageSquareText },
  { id: 'audit',            path: '/audit-logs',       label: 'nav.auditLog',    icon: ClipboardList },
  { id: 'reports',          path: '/reports',          label: 'nav.reports',     icon: BarChart3 },
  { id: 'security-events',  path: '/security-events',  label: 'nav.securityEvents', icon: BookOpen },
  { id: 'settings',         path: '/settings',         label: 'nav.settings',    icon: Settings },
];

export const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) => {
  const { t } = useLanguage();
  const { user, logout, organization } = useAuth();
  const { appName } = useBranding();
  const displayName = organization?.appName || appName;
  const initials = user?.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const isViewer = user?.role === Role.VIEWER;

  const visibleItems = isViewer
    ? NAV_ITEMS.filter(item => item.id === 'monitoring')
    : NAV_ITEMS;

  return (
    <aside className={`bg-brand text-white border-r border-brand-light transition-all duration-300 hidden lg:flex flex-col z-30 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-saas shrink-0">
          <ShieldCheckIcon size={24} />
        </div>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-xl font-black tracking-tight text-white">{displayName}</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{t('app.tagline')}</p>
          </motion.div>
        )}
      </div>

      <nav className="flex-grow px-4 mt-4 space-y-1.5 overflow-y-auto no-scrollbar">
        {visibleItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.id === 'monitoring'}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group relative ${
                isActive
                  ? 'bg-accent text-white shadow-saas-lg'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-accent'} transition-colors`} />
                {isSidebarOpen && <span className="truncate">{t(item.label as any) || item.id}</span>}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    {t(item.label as any) || item.id}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className={`relative group transition-all duration-300 ${isSidebarOpen ? 'bg-slate-900/40 border border-white/10 rounded-[2rem] p-4 hover:bg-slate-900/60' : 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer'}`}>
          {isSidebarOpen ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-black/20 shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white truncate leading-none">{user?.name || 'Administrator'}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1.5 truncate">{user?.role || 'System Admin'}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full h-10 flex items-center justify-center gap-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all border border-white/5 hover:border-rose-500/20"
              >
                <LogOut size={14} strokeWidth={3} />
                {t('common.logout')}
              </button>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center text-white text-[10px] font-black shadow-lg shadow-black/20">
              {initials}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
