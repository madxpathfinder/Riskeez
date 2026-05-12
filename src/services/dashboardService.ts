import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

export interface DepartmentSummaryItem {
  department: string;
  total: number;
  resolved: number;
  unresolved: number;
  critical: number;
  overdue: number;
}

export interface Top5RiskItem {
  id: string;
  title: string;
  level: string;
  score: number;
  department: string;
  owner: string;
  status: string;
  dueDate: string | null;
}

export interface RiskMapCell {
  likelihood: number;
  impact: number;
  score: number;
  severity: string;
  count: number;
}

export interface DashboardSummary {
  totalRisks: number;
  openRisks: number;
  resolvedRisks: number;
  unresolvedRisks: number;
  mitigatedRisks: number;
  inProgressRisks: number;
  overdueRisks: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  risksBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  risksByCategory: Array<{ category: string; count: number }>;
  riskMap: RiskMapCell[];
  departmentSummary: DepartmentSummaryItem[];
  top5Risks: Top5RiskItem[];
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

export interface TimeSeriesPoint {
  period: string;
  label: string;
  createdRisks: number;
  resolvedRisks: number;
  unresolvedRisks: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  overdueRisks: number;
  changePercent: number | null;
}

export interface TimeSeriesResponse {
  groupBy: string;
  from: string;
  to: string;
  series: TimeSeriesPoint[];
}

export type GroupByOption = 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface TimeSeriesFilters {
  from: string;
  to: string;
  groupBy: GroupByOption;
  department?: string;
  severity?: string;
  status?: string;
  owner?: string;
}

export interface DashboardFilters {
  from?: string;
  to?: string;
  status?: string;
  severity?: string;
  department?: string;
  overdue?: boolean;
}

export const dashboardService = {
  async getDashboardSummary(filters?: DashboardFilters): Promise<DashboardSummary | null> {
    if (APP_CONFIG.DATA_PROVIDER !== 'api') return null;
    try {
      const params = new URLSearchParams();
      if (filters?.from)     params.set('from', filters.from);
      if (filters?.to)       params.set('to', filters.to);
      if (filters?.status)   params.set('status', filters.status);
      if (filters?.severity) params.set('severity', filters.severity);
      if (filters?.department) params.set('department', filters.department);
      if (filters?.overdue)  params.set('overdue', 'true');
      const qs = params.toString();
      return await api.get<DashboardSummary>(`/api/dashboard/summary${qs ? '?' + qs : ''}`);
    } catch (err) {
      console.error('[dashboardService] getDashboardSummary failed:', err);
      return null;
    }
  },

  async getTimeSeries(filters: TimeSeriesFilters): Promise<TimeSeriesResponse | null> {
    if (APP_CONFIG.DATA_PROVIDER !== 'api') return null;
    try {
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        groupBy: filters.groupBy,
      });
      if (filters.department) params.set('department', filters.department);
      if (filters.severity)   params.set('severity', filters.severity);
      if (filters.status)     params.set('status', filters.status);
      if (filters.owner)      params.set('owner', filters.owner);
      return await api.get<TimeSeriesResponse>(`/api/dashboard/time-series?${params.toString()}`);
    } catch (err) {
      console.error('[dashboardService] getTimeSeries failed:', err);
      return null;
    }
  }
};
