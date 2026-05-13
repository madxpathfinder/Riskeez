import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Shield, X } from 'lucide-react';
import { useRiskStore } from './data/riskStore';
import { Role } from './types/user';
import { motion, AnimatePresence } from 'motion/react';

// Pages
import { Dashboard } from './components/dashboard/Dashboard';
import { MonitoringPage } from './components/monitoring/MonitoringPage';
import { AssessmentsPage } from './components/assessments/AssessmentsPage';
import { RiskRegisterPage } from './components/risks/RiskRegisterPage';
import { ControlsPage } from './components/controls/ControlsPage';
import { DocumentsPage } from './components/documents/DocumentsPage';
import { AIAssistantPage } from './components/ai/AIAssistantPage';
import { ReportsPage } from './components/reports/ReportsPage';
import { SettingsPage } from './components/settings/SettingsPage';
import { AuditLogPage } from './components/audit/AuditLogPage';
import { LoginPage } from './components/auth/LoginPage';
import { SecurityEventsPage } from './components/security-events/SecurityEventsPage';
import { FirstTimeSetup } from './components/setup/FirstTimeSetup';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';

// Services / Contexts
import { authService } from './services/authService';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { BreadcrumbProvider, useBreadcrumb } from './contexts/BreadcrumbContext';
import { BrandingProvider, useBranding } from './contexts/BrandingContext';

// ── Tab ↔ Path mapping ───────────────────────────────────────────────────────
const PATH_TO_TAB: Record<string, string> = {
  monitoring: 'monitoring',
  dashboard: 'monitoring',
  risks: 'risks',
  assessments: 'assessments',
  controls: 'controls',
  documents: 'documents',
  assistant: 'assistant',
  'audit-logs': 'audit',
  reports: 'reports',
  settings: 'settings',
  'security-events': 'security-events',
  securitylog: 'security-events',
};

export const TAB_TO_PATH: Record<string, string> = {
  monitoring: '/monitoring',
  dashboard: '/dashboard',
  risks: '/risks',
  assessments: '/assessments',
  controls: '/controls',
  documents: '/documents',
  assistant: '/assistant',
  audit: '/audit-logs',
  reports: '/reports',
  settings: '/settings',
  'security-events': '/security-events',
};

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <BreadcrumbProvider>
          <BrandingProvider>
            <AuthProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </AuthProvider>
          </BrandingProvider>
        </BreadcrumbProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { t } = useLanguage();
  const store = useRiskStore();
  const { user, organization, isLoading, refreshState } = useAuth();
  const { clearSubLabel } = useBreadcrumb();
  const { appName, setAppName } = useBranding();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSetupNeeded, setIsSetupNeeded] = useState(false);

  // Derive active tab from URL path
  const pathSegment = location.pathname.split('/')[1] || 'monitoring';
  const activeTab = PATH_TO_TAB[pathSegment] || 'monitoring';

  // Navigation helper — maps tab IDs to clean URL paths
  const handleTabChange = useCallback((tab: string) => {
    const path = TAB_TO_PATH[tab] || `/${tab}`;
    navigate(path);
    clearSubLabel();
  }, [navigate, clearSubLabel]);

  // Sync browser tab title
  useEffect(() => {
    const name = organization?.appName || appName;
    document.title = `${name} | ${t('app.browserTagline')}`;
    if (organization?.appName && organization.appName !== appName) {
      setAppName(organization.appName);
      localStorage.setItem('grc_app_name', organization.appName);
    }
  }, [t, organization, appName, setAppName]);

  // Reload store after login
  useEffect(() => {
    if (user) store.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Clear stale demo profiles + check admin setup
  useEffect(() => {
    const raw = localStorage.getItem('riskeez_current_user');
    if (raw) {
      try {
        const p = JSON.parse(raw);
        const stale = p.id === 'user-1' || p.email === 'elnur@riskeez.app' || p.email === 'james@riskeez.app';
        if (stale) { localStorage.removeItem('riskeez_current_user'); refreshState(); }
      } catch { localStorage.removeItem('riskeez_current_user'); }
    }
    authService.checkAdminExists().then(exists => { if (!exists) setIsSetupNeeded(true); });
  }, [refreshState]);

  const isViewer = user?.role === Role.VIEWER;

  if (isSetupNeeded) return <FirstTimeSetup onComplete={() => setIsSetupNeeded(false)} />;

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

  if (!user) return <LoginPage />;

  const sharedProps = { store, onNavigate: handleTabChange };

  return (
    <div className="flex h-screen bg-[#FBF9FF] font-sans text-slate-900 overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <main className="flex-grow flex flex-col min-w-0 relative h-screen">
        <Header
          activeTab={activeTab}
          onNavigate={handleTabChange}
          setIsSidebarOpen={setIsSidebarOpen}
          isSidebarOpen={isSidebarOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          store={store}
        />

        <div className="flex-grow overflow-y-auto p-8 relative no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="max-w-[1400px] mx-auto"
            >
              <Routes>
                <Route path="/" element={<Navigate to="/monitoring" replace />} />
                <Route path="/monitoring" element={<MonitoringPage {...sharedProps} />} />
                <Route path="/dashboard" element={<Navigate to="/monitoring" replace />} />
                <Route path="/risks" element={<RiskRegisterPage {...sharedProps} />} />
                <Route path="/risks/:id" element={<RiskRegisterPage {...sharedProps} />} />
                {isViewer ? (
                  <Route path="*" element={<Navigate to="/monitoring" replace />} />
                ) : (
                  <>
                    <Route path="/assessments" element={<AssessmentsPage {...sharedProps} />} />
                    <Route path="/assessments/*" element={<AssessmentsPage {...sharedProps} />} />
                    <Route path="/controls" element={<ControlsPage {...sharedProps} />} />
                    <Route path="/documents" element={<DocumentsPage {...sharedProps} />} />
                    <Route path="/documents/:id" element={<DocumentsPage {...sharedProps} />} />
                    <Route path="/assistant" element={<AIAssistantPage {...sharedProps} />} />
                    <Route path="/audit-logs" element={<AuditLogPage onNavigate={handleTabChange} />} />
                    <Route path="/audit-logs/:id" element={<AuditLogPage onNavigate={handleTabChange} />} />
                    <Route path="/reports" element={<ReportsPage {...sharedProps} />} />
                    <Route path="/reports/:id" element={<ReportsPage {...sharedProps} />} />
                    <Route path="/settings" element={<SettingsPage {...sharedProps} />} />
                    <Route path="/security-events" element={<SecurityEventsPage />} />
                    <Route path="/security-events/:eventId" element={<SecurityEventsPage />} />
                    <Route path="/securitylog/encyclopedia/event.aspx" element={<SecurityEventsPage />} />
                    <Route path="*" element={<Navigate to="/monitoring" replace />} />
                  </>
                )}
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile slide-over */}
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
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">{appName}</h1>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                  <X size={24} />
                </button>
              </div>
              <div className="flex-grow overflow-y-auto p-4 space-y-2">
                {Object.entries(TAB_TO_PATH)
                  .filter(([tab]) => !isViewer || tab === 'monitoring')
                  .map(([tab, path]) => (
                    <NavLink
                      key={tab}
                      to={path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-4 px-5 py-4 rounded-2xl text-base font-bold transition-all ${isActive ? 'bg-accent text-white' : 'text-slate-500 hover:bg-slate-50'}`
                      }
                    >
                      {tab}
                    </NavLink>
                  ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
