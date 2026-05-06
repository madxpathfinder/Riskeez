import { Risk, RiskLevel, RiskStatus } from '../types/risk';
import { storageService } from './storageService';
import { auditLogService as auditService } from './auditLogService';
import { APP_CONFIG } from '../config/appConfig';
import { INITIAL_RISKS } from '../data/initialData';
import { notificationService } from './notificationService';
import { NotificationType } from '../types/notification';
import { api } from './apiClient';
import { tn } from '../i18n/translate';

const RISKS_KEY = 'riskeez_risks';

export const riskService = {
  // ... existing calculateScore and getLevel ...
  calculateScore: (likelihood: number, impact: number): number => {
    return likelihood * impact;
  },

  getLevel: (score: number): RiskLevel => {
    if (score >= 16) return RiskLevel.CRITICAL;
    if (score >= 10) return RiskLevel.HIGH;
    if (score >= 5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  },

  async getRisks(): Promise<Risk[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.get<{ risks: Risk[] }>('/api/risks');
      return res.risks;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // ... Supabase logic ...
    }
    return storageService.getItem<Risk[]>(RISKS_KEY) || INITIAL_RISKS;
  },

  async getRiskById(id: string): Promise<Risk | null> {
    const risks = await this.getRisks();
    return risks.find(r => r.id === id) || null;
  },

  saveRisks(risks: Risk[]) {
    storageService.setItem(RISKS_KEY, risks);
  },

  async createRisk(risk: Omit<Risk, 'id' | 'createdAt' | 'score' | 'level'>): Promise<Risk> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ risk: Risk }>('/api/risks', risk);
      return res.risk;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
    }

    const score = this.calculateScore(risk.likelihood, risk.impact);
    const newRisk: Risk = {
      ...risk,
      id: `r-${Date.now()}`,
      score,
      level: this.getLevel(score),
      createdAt: new Date().toISOString()
    };
    
    const risks = await this.getRisks();
    risks.push(newRisk);
    this.saveRisks(risks);
    
    await auditService.log('risk_created', 'Risk', `Created risk: ${newRisk.title}`);
    
    await notificationService.addNotification({
      title: tn('notifications.newRiskTitle'),
      message: tn('notifications.newRiskMessage', { title: newRisk.title }),
      type: NotificationType.SUCCESS,
      actionPath: 'risks'
    });

    return newRisk;
  },

  async updateRisk(risk: Risk): Promise<Risk> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.put<{ risk: Risk }>(`/api/risks/${risk.id}`, risk);
      return res.risk;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
    }

    const score = this.calculateScore(risk.likelihood, risk.impact);
    const updatedRisk = {
      ...risk,
      score,
      level: this.getLevel(score),
      updatedAt: new Date().toISOString()
    };
    
    const risks = await this.getRisks();
    const index = risks.findIndex(r => r.id === risk.id);
    if (index !== -1) {
      risks[index] = updatedRisk;
      this.saveRisks(risks);
      await auditService.log('risk_updated', 'Risk', `Updated risk: ${updatedRisk.title}`);
      
      await notificationService.addNotification({
        title: tn('notifications.riskUpdatedTitle'),
        message: tn('notifications.riskUpdatedMessage', { title: updatedRisk.title }),
        type: NotificationType.INFO,
        actionPath: 'risks'
      });
    }
    
    return updatedRisk;
  },


  async deleteRisk(id: string): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      await api.delete(`/api/risks/${id}`);
      return;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
    }

    let risks = await this.getRisks();
    const risk = risks.find(r => r.id === id);
    risks = risks.filter(r => r.id !== id);
    this.saveRisks(risks);
    
    if (risk) {
      await auditService.log('risk_deleted', 'Risk', `Deleted risk: ${risk.title}`);
    }
  },

  async updateRiskStatus(id: string, status: RiskStatus, reason: string): Promise<void> {
    const risks = await this.getRisks();
    const index = risks.findIndex(r => r.id === id);
    if (index !== -1) {
      const oldStatus = risks[index].status;
      risks[index].status = status;
      risks[index].updatedAt = new Date().toISOString();
      this.saveRisks(risks);
      await auditService.log('risk_status_changed', 'Risk', `Changed status of "${risks[index].title}" from ${oldStatus} to ${status}. Reason: ${reason}`);
    }
  },

  async importRisks(rows: any[]): Promise<{ imported: number; failed: number }> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ imported: number; failed: number }>('/api/risks/import', { rows });
      return res;
    }

    let importedCount = 0;
    let failedCount = 0;

    const existingRisks = await this.getRisks();
    const newRisks: Risk[] = [...existingRisks];

    for (const row of rows) {
      try {
        const likelihood = Number(row.likelihood) || 1;
        const impact = Number(row.impact) || 1;
        const score = this.calculateScore(likelihood, impact);
        
        const newRisk: Risk = {
          id: `r-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: row.title,
          description: row.description || '',
          category: row.category || 'General',
          owner: row.owner || 'Unassigned',
          status: row.status || RiskStatus.OPEN,
          likelihood,
          impact,
          score,
          level: this.getLevel(score),
          dueDate: row.dueDate || new Date().toISOString().split('T')[0],
          recommendation: row.recommendation || '',
          existingControls: row.existingControls || '',
          notes: row.notes || '',
          createdAt: new Date().toISOString()
        };

        newRisks.push(newRisk);
        importedCount++;
      } catch (err) {
        console.error('Failed to import risk row:', row, err);
        failedCount++;
      }
    }
    
    this.saveRisks(newRisks);
    await auditService.log('risk_register_imported', 'Risk', `Batch imported ${importedCount} risks (${failedCount} failures)`);
    
    await notificationService.addNotification({
      title: 'Risk Register Import Completed',
      message: `${importedCount} risks successfully registered. ${failedCount} rows skipped due to validation failures.`,
      type: failedCount > 0 ? NotificationType.WARNING : NotificationType.SUCCESS,
      actionPath: 'risks'
    });

    return { imported: importedCount, failed: failedCount };
  },

  async exportRiskDetail(id: string): Promise<string> {
    const risk = await this.getRiskById(id);
    if (!risk) throw new Error('Risk not found');
    
    const content = `
RISK DETAIL REPORT: ${risk.title}
Generated: ${new Date().toLocaleString()}
--------------------------------------------------
ID: ${risk.id}
Status: ${risk.status}
Category: ${risk.category}
Owner: ${risk.owner}
Severity: ${risk.level} (${risk.score}/25)
Likelihood: ${risk.likelihood}
Impact: ${risk.impact}

DESCRIPTION:
${risk.description}

RECOMMENDATION:
${risk.recommendation || 'No recommendation provided.'}

DUE DATE:
${risk.dueDate}
--------------------------------------------------
DISCLAIMER: This automated report is for internal decision support only.
`;
    await auditService.log('risk_detail_exported', 'Risk', `Exported detail report for: ${risk.title}`);
    return content;
  },

  async startResponseWorkflow(id: string, data: any): Promise<void> {
    const risks = await this.getRisks();
    const index = risks.findIndex(r => r.id === id);
    if (index !== -1) {
      risks[index].status = RiskStatus.IN_PROGRESS;
      risks[index].updatedAt = new Date().toISOString();
      this.saveRisks(risks);
      await auditService.log('risk_response_workflow_started', 'Risk', `Started mitigation workflow for: ${risks[index].title}`);
    }
  },

  async saveRemediationStrategy(id: string, strategy: string): Promise<void> {
    const risks = await this.getRisks();
    const index = risks.findIndex(r => r.id === id);
    if (index !== -1) {
      risks[index].recommendation = strategy;
      risks[index].updatedAt = new Date().toISOString();
      this.saveRisks(risks);
      await auditService.log('risk_remediation_strategy_generated', 'Risk', `Saved AI remediation strategy for: ${risks[index].title}`);
    }
  },

  async addRiskEvidence(id: string, evidence: any): Promise<void> {
    // This would typically involve a separate evidence table, but for mock:
    await auditService.log('risk_evidence_added', 'Risk', `Evidence added to risk ${id}`);
  }
};
