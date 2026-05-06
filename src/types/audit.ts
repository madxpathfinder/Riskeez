export type AuditSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface AuditLog {
  id: string;
  action: string;
  module: 'Risk' | 'Assessment' | 'Control' | 'Document' | 'Report' | 'Setting' | 'User' | 'System' | 'Intelligence' | 'AI' | 'Settings' | 'Reporting';
  userId: string;
  userName: string;
  userRole?: string;
  details: string;
  timestamp: string;
  severity: AuditSeverity;
  source: 'UI' | 'System' | 'API' | 'AI';
  entityId?: string;
  metadata?: {
    before?: any;
    after?: any;
    aiProvider?: string;
    aiModel?: string;
    isAiGenerated?: boolean;
    notes?: string;
    ipAddress?: string;
  };
}
