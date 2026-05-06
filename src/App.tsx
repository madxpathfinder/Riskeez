import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  ShieldAlert, 
  ShieldCheck, 
  Shield,
  FileText, 
  MessageSquareText, 
  Settings, 
  BarChart3,
  LogOut,
  User,
  Plus,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  Download,
  Send,
  MoreVertical,
  ChevronRight,
  CheckCircle2,
  FileDown,
  Activity,
  X,
  ArrowRight,
  ArrowLeft,
  Quote,
  Menu,
  Bell,
  HelpCircle,
  ChevronDown,
  Trash2,
  Info
} from 'lucide-react';
import { useRiskStore } from './data/riskStore';
import { AssessmentStatus, RiskLevel, RiskStatus, ControlStatus, ControlEffectiveness, RISK_CATEGORIES } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, AreaChart, Area
} from 'recharts';
import { format } from 'date-fns';
import { ASSESSMENT_QUESTIONS } from './data/questionnaire';

// Common Components
import { Badge, Button, Card, PageHeader, StatCard, EmptyState, ConfirmDialog } from './components/common';
import { ToastContainer } from './components/common/Toast';
import { GlobalSearch } from './components/common/GlobalSearch';

// Pages
import { Dashboard } from './components/dashboard/Dashboard';
import { AssessmentsPage } from './components/assessments/AssessmentsPage';
import { RiskRegisterPage } from './components/risks/RiskRegisterPage';
import { ControlsPage } from './components/controls/ControlsPage';
import { DocumentsPage } from './components/documents/DocumentsPage';
import { AIAssistantPage } from './components/ai/AIAssistantPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { AuditLogPage } from './components/audit/AuditLogPage';
import { LoginPage } from './components/auth/LoginPage';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { FirstTimeSetup } from './components/setup/FirstTimeSetup';

// Services
import { auditLogService as auditService } from './services/auditLogService';
import { aiService } from './services/aiService';
import { userService } from './services/userService';
import { authService } from './services/authService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';

import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { BreadcrumbProvider, useBreadcrumb } from './contexts/BreadcrumbContext';

export default function App() {
  return (
    <LanguageProvider>
      <BreadcrumbProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </BreadcrumbProvider>
    </LanguageProvider>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const store = useRiskStore();
  const { user, organization, isLoading, refreshState } = useAuth();
  const { success, error, toast } = useToast();
  const { clearSubLabel } = useBreadcrumb();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);

  // Clear sub-breadcrumb whenever top-level tab changes
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    clearSubLabel();
  }, [clearSubLabel]);

  useEffect(() => {
    // Migration & Cleanup Step
    const currentStorageUser = localStorage.getItem('riskeez_current_user');
    if (currentStorageUser) {
      try {
        const parsed = JSON.parse(currentStorageUser);
        // Comprehensive stale demo profile detection
        const isStale = parsed.id === 'user-1' || 
                        parsed.name === 'Elnur Bakhlul' || 
                        parsed.email === 'elnur@riskeez.app' ||
                        parsed.email === 'james@riskeez.app'; // Old hardcoded mock email

        if (isStale) {
          console.warn('Legacy demo profile detected. Purging session for enterprise environment synchronization.');
          localStorage.removeItem('riskeez_current_user');
          refreshState();
        }
      } catch (e) {
        localStorage.removeItem('riskeez_current_user');
      }
    }

    // Check if system administrator exists
    const checkSetup = async () => {
      const adminExists = await authService.checkAdminExists();
      if (!adminExists) {
        setIsSetupNeeded(true);
      }
    };
    checkSetup();
  }, [refreshState]);

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'assessments', label: t('nav.assessments'), icon: ClipboardCheck },
    { id: 'risks', label: t('nav.riskRegister'), icon: ShieldAlert },
    { id: 'controls', label: t('nav.controls'), icon: ShieldCheck },
    { id: 'documents', label: t('nav.documents'), icon: FileText },
    { id: 'assistant', label: t('nav.aiAssistant'), icon: MessageSquareText },
    { id: 'audit', label: t('nav.auditLog'), icon: Clock },
    { id: 'reports', label: t('nav.reports'), icon: BarChart3 },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard store={store} setActiveTab={handleTabChange} onNavigate={handleTabChange} />;
      case 'assessments': return <AssessmentsPage store={store} onNavigate={handleTabChange} />;
      case 'risks': return <RiskRegisterPage store={store} onNavigate={handleTabChange} />;
      case 'controls': return <ControlsPage store={store} onNavigate={handleTabChange} />;
      case 'documents': return <DocumentsPage store={store} onNavigate={handleTabChange} />;
      case 'assistant': return <AIAssistantPage store={store} onNavigate={handleTabChange} />;
      case 'audit': return <AuditLogPage onNavigate={handleTabChange} />;
      case 'reports': return <ReportsPage store={store} onNavigate={handleTabChange} />;
      case 'settings': return <SettingsPage store={store} onNavigate={handleTabChange} />;
      default: return <Dashboard store={store} setActiveTab={handleTabChange} onNavigate={handleTabChange} />;
    }
  };

  if (isSetupNeeded) {
    return (
      <FirstTimeSetup onComplete={() => setIsSetupNeeded(false)} />
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#FBF9FF]">
         <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center text-accent animate-pulse mb-4">
            <Shield size={32} />
         </div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Core...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex h-screen bg-[#FBF9FF] font-sans text-slate-900 overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      
      <main className="flex-grow flex flex-col min-w-0 relative h-screen">
        <Header 
          activeTab={activeTab} 
          onNavigate={setActiveTab} 
          setIsSidebarOpen={setIsSidebarOpen} 
          isSidebarOpen={isSidebarOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          store={store}
        />

        <div className="flex-grow overflow-y-auto p-8 relative no-scrollbar">
           <AnimatePresence mode="wait">
             <motion.div
               key={activeTab}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.2 }}
               className="max-w-[1400px] mx-auto"
             >
                {renderContent()}
             </motion.div>
           </AnimatePresence>
        </div>

      </main>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
         {isMobileMenuOpen && (
           <>
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden"
               onClick={() => setIsMobileMenuOpen(false)}
             />
             <motion.div 
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                className="fixed top-0 bottom-0 left-0 w-80 bg-white z-[101] lg:hidden flex flex-col"
             >
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white shadow-saas">
                         <Shield size={24} />
                      </div>
                      <h1 className="text-xl font-black text-slate-900 tracking-tight">Riskeez</h1>
                   </div>
                   <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={24} /></button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-2">
                   {navItems.map((item) => (
                     <button
                       key={item.id}
                       onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                       className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-bold transition-all ${
                         activeTab === item.id ? 'bg-accent text-white' : 'text-slate-500 hover:bg-slate-50'
                       }`}
                     >
                       <item.icon size={20} />
                       {item.label}
                     </button>
                   ))}
                </div>
             </motion.div>
           </>
         )}
      </AnimatePresence>
    </div>
  );
}
