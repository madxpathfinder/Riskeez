import React, { useEffect, useState } from 'react';
import { Menu, ChevronRight, Bell, HelpCircle, User, Settings as SettingsIcon, LogOut, Check, Trash2, Info, AlertTriangle, ShieldCheck, X, Languages } from 'lucide-react';
import { GlobalSearch } from '../common/GlobalSearch';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useBreadcrumb } from '../../contexts/BreadcrumbContext';
import { motion, AnimatePresence } from 'motion/react';
import { notificationService } from '../../services/notificationService';
import { Notification, NotificationType } from '../../types/notification';
import { formatDistanceToNow } from 'date-fns';

interface HeaderProps {
  activeTab: string;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  store: any;
  onNavigate: (tab: string) => void;
}

export const Header = ({ 
  activeTab, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  setIsMobileMenuOpen, 
  store,
  onNavigate 
}: HeaderProps) => {
  const { user, organization, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { subLabel } = useBreadcrumb();
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = React.useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const initials = user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const fetchNotifications = async () => {
    const list = await notificationService.getNotifications();
    setNotifications(list);
    const count = await notificationService.getUnreadCount();
    setUnreadCount(count);
  };

  useEffect(() => {
    fetchNotifications();
    window.addEventListener('riskeez_notifications_updated', fetchNotifications);
    return () => window.removeEventListener('riskeez_notifications_updated', fetchNotifications);
  }, []);

  const handleMarkAllRead = async () => {
    await notificationService.markAllNotificationsRead();
  };

  const handleClearAll = async () => {
    if (confirm(t('common.confirmClearNotifications') || 'Permanently clear all notification logs?')) {
      await notificationService.clearNotifications();
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.read) {
      await notificationService.markNotificationRead(notif.id);
    }
    if (notif.actionPath) {
      onNavigate(notif.actionPath);
      setIsNotificationsOpen(false);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS: return <ShieldCheck className="text-emerald-500" size={16} />;
      case NotificationType.WARNING: return <AlertTriangle className="text-amber-500" size={16} />;
      case NotificationType.ERROR: return <X className="text-rose-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  const getActiveTabLabel = () => {
    switch (activeTab) {
      case 'dashboard': return t('nav.dashboard');
      case 'risks': return t('nav.riskRegister');
      case 'assessments': return t('nav.assessments');
      case 'controls': return t('nav.controls');
      case 'documents': return t('nav.documents');
      case 'assistant': return t('nav.aiAssistant');
      case 'audit': return t('nav.auditLog');
      case 'reports': return t('nav.reports');
      case 'settings': return t('nav.settings');
      default: return activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ');
    }
  };

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-30">
       <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hidden lg:block"
          >
            <Menu size={20} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-400 lg:hidden"
          >
            <Menu size={20} strokeWidth={2.5} />
          </button>
          
          <div className="h-6 w-px bg-slate-100 mx-2 hidden lg:block" />
          
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hidden md:flex items-center gap-3">
             <span className="opacity-80 text-slate-900">{organization?.name || organization?.appName || t('app.loginTitle')}</span>
             <ChevronRight size={12} className="text-slate-300" strokeWidth={3} />
             <span className={`font-bold transition-colors ${subLabel ? 'text-slate-400' : 'text-slate-600'}`}>
               {getActiveTabLabel()}
             </span>
             {subLabel && (
               <>
                 <ChevronRight size={12} className="text-slate-300" strokeWidth={3} />
                 <span className="text-accent font-black">{subLabel}</span>
               </>
             )}
          </div>
       </div>

       <div className="flex items-center gap-4">
          <GlobalSearch store={store} onNavigate={onNavigate} />
          
          <div className="flex items-center gap-1.5">
             {/* Language Selector */}
             <div className="relative">
                <button 
                  onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                  className={`p-2.5 rounded-xl transition-all flex items-center gap-2 ${isLanguageOpen ? 'bg-accent/10 text-accent' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                   <Languages size={20} strokeWidth={2.2} />
                   <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{language}</span>
                </button>

                <AnimatePresence>
                  {isLanguageOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsLanguageOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-40 bg-white rounded-2xl border border-slate-100 shadow-2xl z-50 overflow-hidden"
                      >
                         <div className="p-2">
                            <button 
                              onClick={() => { setLanguage('en'); setIsLanguageOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all ${language === 'en' ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                               {t('settings.english')}
                            </button>
                            <button 
                              onClick={() => { setLanguage('az'); setIsLanguageOpen(false); }}
                              className={`w-full text-left px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all ${language === 'az' ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                               {t('settings.azerbaijani')}
                            </button>
                         </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
             </div>

             <div className="relative">
                <button 
                  onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  className={`p-2.5 rounded-xl transition-all relative group ${isNotificationsOpen ? 'bg-accent/10 text-accent' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                   <Bell size={20} strokeWidth={2.2} className="group-hover:text-accent transition-colors" />
                   {unreadCount > 0 && (
                     <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white shrink-0">
                        {unreadCount}
                     </span>
                   )}
                </button>

                <AnimatePresence>
                  {isNotificationsOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-[2rem] border border-slate-100 shadow-2xl z-50 overflow-hidden"
                      >
                        <div className="p-6 bg-slate-50/50 border-b border-slate-50 flex items-center justify-between">
                           <div>
                              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Intelligence Feed</h3>
                              <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{unreadCount} Pending Alerts</p>
                           </div>
                           <div className="flex gap-2">
                              {notifications.length > 0 && (
                                <>
                                  <button onClick={handleMarkAllRead} className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-accent transition-all" title="Mark all read">
                                     <Check size={14} strokeWidth={3} />
                                  </button>
                                  <button onClick={handleClearAll} className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-500 transition-all" title="Clear all">
                                     <Trash2 size={14} strokeWidth={3} />
                                  </button>
                                </>
                              )}
                           </div>
                        </div>

                        <div className="max-h-[400px] overflow-auto divide-y divide-slate-50">
                           {notifications.length > 0 ? (
                             notifications.map((n) => (
                               <button 
                                 key={n.id} 
                                 onClick={() => handleNotificationClick(n)}
                                 className={`w-full text-left p-5 hover:bg-slate-50 transition-all flex gap-4 ${!n.read ? 'bg-accent/[0.02]' : ''}`}
                               >
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                    n.type === NotificationType.SUCCESS ? 'bg-emerald-50 text-emerald-500' :
                                    n.type === NotificationType.WARNING ? 'bg-amber-50 text-amber-500' :
                                    n.type === NotificationType.ERROR ? 'bg-rose-50 text-rose-500' :
                                    'bg-blue-50 text-blue-500'
                                  }`}>
                                     {getIcon(n.type)}
                                  </div>
                                  <div className="flex-grow min-w-0">
                                     <div className="flex justify-between items-start gap-2">
                                        <p className={`text-[11px] leading-tight mb-1 truncate ${!n.read ? 'font-black text-slate-900' : 'font-bold text-slate-600'}`}>{n.title}</p>
                                        <p className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{formatDistanceToNow(new Date(n.timestamp), { addSuffix: true }).replace('about ', '')}</p>
                                     </div>
                                     <p className="text-[10px] font-medium text-slate-400 leading-relaxed line-clamp-2">{n.message}</p>
                                  </div>
                                  {!n.read && (
                                    <div className="w-1.5 h-1.5 bg-accent rounded-full mt-2 shrink-0" />
                                  )}
                               </button>
                             ))
                           ) : (
                             <div className="p-12 text-center">
                                <Bell size={32} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No active alerts</p>
                             </div>
                           )}
                        </div>
                        
                        {notifications.length > 0 && (
                          <div className="p-4 bg-slate-50/30 text-center">
                             <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">View Intelligence Archive</button>
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
             </div>
             
             <button className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all group">
                <HelpCircle size={20} strokeWidth={2.2} className="group-hover:text-accent transition-colors" />
             </button>
          </div>
          
          <div className="h-8 w-px bg-slate-100 mx-2 hidden sm:block" />
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-[1.25rem] hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group"
            >
               <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-black text-slate-900 group-hover:text-accent transition-colors leading-none">{user?.name || 'Loading...'}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 opacity-60">{user?.role || 'Guest'}</p>
               </div>
               <div className="w-10 h-10 rounded-[1rem] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-500 font-black shadow-inner">
                  {initials}
               </div>
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-64 bg-white rounded-[2rem] border border-slate-100 shadow-2xl z-50 overflow-hidden"
                  >
                    <div className="p-6 bg-slate-50/50 border-b border-slate-50">
                      <p className="text-xs font-black text-slate-900">{user?.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{user?.email}</p>
                      <div className="mt-3 inline-flex px-2 py-1 bg-accent/10 rounded-lg text-[9px] font-black text-accent uppercase tracking-widest border border-accent/10">
                        {user?.role}
                      </div>
                    </div>
                    <div className="p-2">
                       <button 
                        onClick={() => { onNavigate('settings'); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                       >
                          <SettingsIcon size={16} className="text-slate-400" />
                          {t('nav.settings')}
                       </button>
                       <button 
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-all"
                       >
                          <LogOut size={16} />
                          {t('common.logout')}
                       </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
       </div>
    </header>
  );
};

