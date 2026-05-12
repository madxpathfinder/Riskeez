import { storageService } from './storageService';
import { auditLogService as auditService } from './auditLogService';
import { notificationService } from './notificationService';
import { NotificationType } from '../types/notification';
import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

const getToken = () => localStorage.getItem('riskeez_jwt');

export interface Report {
  id: string;
  title: string;
  assessmentId: string;
  overallScore: number;
  riskLevel: string;
  createdAt: string;
  createdBy: string;
  type?: string;
  config: {
    includeRiskRegister: boolean;
    includeEvidence: boolean;
    includePlan: boolean;
    includeAISummary: boolean;
  };
  content?: {
    executiveSummary?: string;
    findings?: string[];
    missingInfo?: string[];
    recommendations?: string[];
    remediationPlan?: any;
    risks?: any[];
  };
}

const REPORTS_KEY = 'riskeez_reports';

export const reportService = {
  async getReports(): Promise<Report[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.get<{ reports: Report[] }>('/api/reports');
      return res.reports;
    }
    return storageService.getItem<Report[]>(REPORTS_KEY) || [];
  },

  saveReports(reports: Report[]): void {
    storageService.setItem(REPORTS_KEY, reports);
  },

  async createReport(report: Omit<Report, 'id' | 'createdAt'>): Promise<Report> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ report: Report }>('/api/reports', report);
      await notificationService.addNotification({
        title: 'Report Generated',
        message: `The report "${res.report.title}" has been finalized and is ready for export.`,
        type: NotificationType.SUCCESS,
        actionPath: 'reporting'
      });
      return res.report;
    }

    const newReport: Report = {
      ...report,
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    const reports = await this.getReports();
    reports.push(newReport);
    this.saveReports(reports);

    await auditService.log('report_generated', 'Reporting', `Generated report: ${newReport.title}`);
    await notificationService.addNotification({
      title: 'Report Generated',
      message: `The report "${newReport.title}" has been finalized and is ready for export.`,
      type: NotificationType.SUCCESS,
      actionPath: 'reporting'
    });
    return newReport;
  },

  async updateReport(id: string, updates: Partial<Report>): Promise<Report> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.put<{ report: Report }>(`/api/reports/${id}`, updates);
      return res.report;
    }
    const reports = await this.getReports();
    const idx = reports.findIndex(r => r.id === id);
    if (idx >= 0) { reports[idx] = { ...reports[idx], ...updates }; this.saveReports(reports); }
    return reports[idx];
  },

  async deleteReport(id: string): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      await api.delete(`/api/reports/${id}`);
      return;
    }
    let reports = await this.getReports();
    reports = reports.filter(r => r.id !== id);
    this.saveReports(reports);
    await auditService.log('report_deleted', 'Reporting', `Deleted report ID: ${id}`);
  },

  async exportRiskRegisterCSV(reportId?: string): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const token = getToken();
      const url = reportId
        ? `${APP_CONFIG.API_URL}/api/reports/${reportId}/export.csv`
        : `${APP_CONFIG.API_URL}/api/risks/export.csv`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `risk_register_${Date.now()}.csv`;
      link.click();
      return;
    }
    // localStorage fallback handled by caller
  }
};
