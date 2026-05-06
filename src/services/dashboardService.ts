import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

export interface DashboardSummary {
  totalRisks: number;
  openRisks: number;
  mitigatedRisks: number;
  inProgressRisks: number;
  overdueRisks: number;
  risksBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  risksByCategory: Array<{ category: string; count: number }>;
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  totalControls: number;
  totalDocuments: number;
  risksWithoutControls: number;
  recentAuditActivity: Array<{
    id: string;
    action: string;
    entity_type: string;
    description: string;
    performed_by: string;
    timestamp: string;
  }>;
}

export const dashboardService = {
  async getDashboardSummary(): Promise<DashboardSummary | null> {
    if (APP_CONFIG.DATA_PROVIDER !== 'api') return null;
    try {
      return await api.get<DashboardSummary>('/api/dashboard/summary');
    } catch (err) {
      console.error('[dashboardService] getDashboardSummary failed:', err);
      return null;
    }
  }
};
