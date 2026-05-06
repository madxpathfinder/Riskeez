import { AuditLog, AuditSeverity } from '../types/audit';
import { authService } from './authService';
import { storageService } from './storageService';
import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

const AUDIT_LOGS_KEY = 'riskeez_audit_logs';

export const auditLogService = {
  async getLogs(): Promise<AuditLog[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.get<{ logs: AuditLog[] }>('/api/audit-logs');
      return res.logs;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
    }
    return storageService.getItem<AuditLog[]>(AUDIT_LOGS_KEY) || [];
  },

  async log(
    action: string, 
    module: AuditLog['module'], 
    details: string, 
    severity: AuditSeverity = 'Low',
    source: AuditLog['source'] = 'UI',
    entityId?: string,
    metadata?: AuditLog['metadata']
  ): Promise<AuditLog> {
    const user = authService.getCurrentUser();
    
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action,
      module,
      userId: user?.id || 'system',
      userName: user?.name || 'System',
      userRole: user?.role,
      details,
      timestamp: new Date().toISOString(),
      severity,
      source,
      entityId,
      metadata
    };
    
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try {
        await api.post('/api/audit-logs', { action, module, details, severity, source, entityId, metadata });
      } catch { /* fire-and-forget */ }
      return newLog;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
    }

    const logs = await this.getLogs();
    logs.unshift(newLog); // Newest first
    storageService.setItem(AUDIT_LOGS_KEY, logs.slice(0, 1000)); // Keep last 1000
    
    console.log(`[Audit Log - ${module}]:`, newLog);
    
    return newLog;
  }
};

// Export as auditService for compatibility during refactor if needed, 
// but we should update imports to use auditLogService.
export const auditService = auditLogService;
