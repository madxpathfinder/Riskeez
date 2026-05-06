import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  ShieldAlert, 
  ShieldCheck, 
  FileText, 
  MessageSquareText, 
  BarChart3, 
  Settings, 
  ClipboardList,
  LogOut, 
  User 
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Button } from '../common';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export const Sidebar = ({ activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen }: SidebarProps) => {
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'assessments', label: t('nav.assessments'), icon: ClipboardCheck },
    { id: 'risks', label: t('nav.riskRegister'), icon: ShieldAlert },
    { id: 'controls', label: t('nav.controls'), icon: ShieldCheck },
    { id: 'documents', label: t('nav.documents'), icon: FileText },
    { id: 'assistant', label: t('nav.aiAssistant'), icon: MessageSquareText },
    { id: 'audit', label: t('nav.auditLog'), icon: ClipboardList },
    { id: 'reports', label: t('nav.reports'), icon: BarChart3 },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <aside className={`bg-brand text-white border-r border-brand-light transition-all duration-300 hidden lg:flex flex-col z-30 ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-saas shrink-0">
           <ShieldCheck size={24} />
        </div>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-xl font-black tracking-tight text-white">Riskeez</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Enterprise Risk Intelligence</p>
          </motion.div>
        )}
      </div>

      <nav className="flex-grow px-4 mt-4 space-y-1.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all group relative ${
              activeTab === item.id 
                ? 'bg-accent text-white shadow-saas-lg' 
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon size={20} className={`${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-accent'} transition-colors`} />
            {isSidebarOpen && <span className="truncate">{item.label}</span>}
            {!isSidebarOpen && activeTab === item.id && (
              <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50">
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5">
         <div className={`
           relative group transition-all duration-300
           ${isSidebarOpen ? 'bg-slate-900/40 border border-white/10 rounded-[2rem] p-4 hover:bg-slate-900/60' : 'w-12 h-12 mx-auto flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 cursor-pointer'}
         `}>
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
