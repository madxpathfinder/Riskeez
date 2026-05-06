import { Assessment, AssessmentStatus } from '../types/assessment';
import { storageService } from './storageService';
import { auditLogService } from './auditLogService';
import { APP_CONFIG } from '../config/appConfig';
import { INITIAL_ASSESSMENTS } from '../data/initialData';
import { api } from './apiClient';

const ASSESSMENTS_KEY = 'riskeez_assessments';

export const assessmentService = {
  async getAssessments(): Promise<Assessment[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.get<{ assessments: Assessment[] }>('/api/assessments');
      return res.assessments;
    }
    return storageService.getItem<Assessment[]>(ASSESSMENTS_KEY) || INITIAL_ASSESSMENTS;
  },

  async getAssessmentById(id: string): Promise<{ assessment: Assessment; answers: any[] } | null> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try {
        return await api.get<{ assessment: Assessment; answers: any[] }>(`/api/assessments/${id}`);
      } catch {
        return null;
      }
    }
    const assessments = storageService.getItem<Assessment[]>(ASSESSMENTS_KEY) || [];
    const assessment = assessments.find(a => a.id === id) || null;
    return assessment ? { assessment, answers: [] } : null;
  },

  saveAssessmentsLocal(assessments: Assessment[]) {
    storageService.setItem(ASSESSMENTS_KEY, assessments);
  },

  async createAssessment(data: { title: string; scope: string; description?: string; framework?: string; startedBy?: string }): Promise<Assessment> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ assessment: Assessment }>('/api/assessments', data);
      await auditLogService.log('assessment_created', 'Assessment', `Created assessment: ${res.assessment.title}`);
      return res.assessment;
    }
    const newAssessment: Assessment = {
      id: `a-${Date.now()}`,
      organizationId: 'org-1',
      title: data.title,
      scope: data.scope,
      status: AssessmentStatus.IN_PROGRESS,
      overallScore: 0,
      riskLevel: null as any,
      createdAt: new Date().toISOString()
    };
    const all = storageService.getItem<Assessment[]>(ASSESSMENTS_KEY) || [];
    all.push(newAssessment);
    storageService.setItem(ASSESSMENTS_KEY, all);
    await auditLogService.log('assessment_created', 'Assessment', `Created: ${newAssessment.title}`);
    return newAssessment;
  },

  async updateAssessment(assessment: Assessment): Promise<Assessment> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.put<{ assessment: Assessment }>(`/api/assessments/${assessment.id}`, assessment);
      return res.assessment;
    }
    const all = storageService.getItem<Assessment[]>(ASSESSMENTS_KEY) || [];
    const idx = all.findIndex(a => a.id === assessment.id);
    if (idx !== -1) {
      all[idx] = assessment;
      storageService.setItem(ASSESSMENTS_KEY, all);
      await auditLogService.log('assessment_updated', 'Assessment', `Updated: ${assessment.title}`);
    }
    return assessment;
  },

  async saveAnswer(assessmentId: string, questionId: string, value: string, notes?: string): Promise<any> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ answer: any }>(`/api/assessments/${assessmentId}/answers`, { questionId, value, notes });
      return res.answer;
    }
    // local fallback handled by answerService
    return null;
  },

  async getAnswers(assessmentId: string): Promise<any[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try {
        const res = await api.get<{ answers: any[] }>(`/api/assessments/${assessmentId}/answers`);
        return res.answers;
      } catch {
        return [];
      }
    }
    return [];
  },

  async completeAssessment(assessmentId: string): Promise<{ assessment: Assessment; score: number; riskLevel: string; inferredRisks: any[] }> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ assessment: Assessment; score: number; riskLevel: string; inferredRisks: any[] }>(
        `/api/assessments/${assessmentId}/complete`, {}
      );
      await auditLogService.log('assessment_completed', 'Assessment', `Completed assessment ${assessmentId}`);
      return res;
    }
    // local fallback: just mark complete
    const all = storageService.getItem<Assessment[]>(ASSESSMENTS_KEY) || [];
    const idx = all.findIndex(a => a.id === assessmentId);
    if (idx !== -1) {
      all[idx].status = AssessmentStatus.COMPLETED;
      all[idx].overallScore = 65; // fallback static score
      all[idx].completedAt = new Date().toISOString();
      storageService.setItem(ASSESSMENTS_KEY, all);
    }
    return { assessment: all[idx], score: 65, riskLevel: 'medium', inferredRisks: [] };
  },

  async saveAIAnalysis(assessmentId: string, analysis: any): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      await api.post(`/api/assessments/${assessmentId}/ai-analysis`, { analysis });
      await auditLogService.log('assessment_ai_analysis_generated', 'Assessment', `AI analysis saved for ${assessmentId}`);
    }
  },

  async generateReport(assessmentId: string): Promise<{ report: string; generatedAt: string }> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ report: string; generatedAt: string }>(`/api/assessments/${assessmentId}/report`, {});
      await auditLogService.log('assessment_report_generated', 'Assessment', `Report generated for ${assessmentId}`);
      return res;
    }
    return { report: 'Report not available in offline mode.', generatedAt: new Date().toISOString() };
  },

  async getQuestions(): Promise<any[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try {
        const res = await api.get<{ questions: any[] }>('/api/assessments/questions');
        if (res.questions && res.questions.length > 0) return res.questions;
      } catch {}
    }
    // fallback to frontend questionnaire
    const { ASSESSMENT_QUESTIONS } = await import(/* @vite-ignore */ '../data/questionnaire');
    return ASSESSMENT_QUESTIONS;
  },

  async generateAssessmentReport(id: string): Promise<string> {
    const result = await this.generateReport(id);
    return result.report;
  },

  async generateExecutiveBrief(id: string): Promise<string> {
    const assessment = await this.getAssessmentById(id);
    if (!assessment) throw new Error('Assessment not found');
    const { assessment: a } = assessment;
    return `EXECUTIVE BRIEF: ${a.title}\n--\nRisk Posture: ${(a.overallScore || 0) > 70 ? 'Satisfactory' : 'Needs Attention'}\nScore: ${a.overallScore}/100`;
  },

  async getIndicators(assessmentId: string): Promise<any[]> {
    return [];
  },

  async getPendingProof(assessmentId: string): Promise<any[]> {
    return [];
  }
};
