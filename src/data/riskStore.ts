import { useState, useCallback, useEffect } from 'react';
import {
  Organization,
  Assessment,
  Risk,
  Control,
  Document,
  Report,
  RiskLevel,
  RiskStatus,
  AssessmentStatus,
  ControlStatus,
  ControlEffectiveness,
  Answer
} from '../types';
import {
  INITIAL_ORG,
} from './initialData';
import { assessmentService } from '../services/assessmentService';
import { riskService } from '../services/riskService';
import { answerService } from '../services/answerService';
import { documentService } from '../services/documentService';
import { controlService } from '../services/controlService';
import { reportService } from '../services/reportService';
import { auditLogService } from '../services/auditLogService';

export function useRiskStore() {
  const [isLoading, setIsLoading] = useState(true);
  const [org, setOrg] = useState<Organization>(INITIAL_ORG);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [controls, setControls] = useState<Control[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);

  const refresh = useCallback(async () => {
    if (!localStorage.getItem('riskeez_jwt')) return;
    setIsLoading(true);
    try {
      const [fetchedAssessments, fetchedRisks, fetchedAnswers, fetchedDocs, fetchedControls, fetchedReports] = await Promise.all([
        assessmentService.getAssessments(),
        riskService.getRisks(),
        answerService.getAnswers(),
        documentService.getDocuments(),
        controlService.getControls(),
        reportService.getReports()
      ]);
      setAssessments(fetchedAssessments);
      setRisks(fetchedRisks);
      setAnswers(fetchedAnswers);
      setDocuments(fetchedDocs);
      setControls(fetchedControls);
      setReports(fetchedReports);
    } catch (err) {
      console.error("Failed to refresh risk store:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial Fetch
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Scoring Logic
  const calculateRiskScore = (likelihood: number, impact: number) => likelihood * impact;

  const getRiskLevel = (score: number): RiskLevel => {
    if (score >= 16) return RiskLevel.CRITICAL;
    if (score >= 10) return RiskLevel.HIGH;
    if (score >= 5) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  };

  const getOverallRiskLevel = (score: number): RiskLevel => {
    if (score >= 76) return RiskLevel.CRITICAL;
    if (score >= 51) return RiskLevel.HIGH;
    if (score >= 26) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  };

  const saveAssessment = useCallback(async (assessment: Assessment) => {
    const updated = await assessmentService.updateAssessment(assessment);
    setAssessments(prev => {
      const exists = prev.find(a => a.id === updated.id);
      if (exists) return prev.map(a => a.id === updated.id ? updated : a);
      return [...prev, updated];
    });
  }, []);

  const addRisk = useCallback(async (risk: Omit<Risk, 'id' | 'createdAt' | 'score' | 'level'>) => {
    const newRisk = await riskService.createRisk(risk);
    setRisks(prev => [...prev, newRisk]);
    return newRisk;
  }, []);

  const updateRisk = useCallback(async (risk: Risk) => {
    const updatedRisk = await riskService.updateRisk(risk);
    setRisks(prev => prev.map(r => r.id === risk.id ? updatedRisk : r));
  }, []);

  const deleteRisk = useCallback(async (id: string) => {
    await riskService.deleteRisk(id);
    setRisks(prev => prev.filter(r => r.id !== id));
  }, []);

  // Controls CRUD
  const addControl = useCallback(async (control: Omit<Control, 'id'>) => {
    const newControl = await controlService.createControl(control);
    setControls(prev => [...prev, newControl]);
    return newControl;
  }, []);

  const updateControl = useCallback(async (control: Control) => {
    const updated = await controlService.updateControl(control);
    setControls(prev => prev.map(c => c.id === control.id ? updated : c));
    return updated;
  }, []);

  const deleteControl = useCallback(async (id: string) => {
    await controlService.deleteControl(id);
    setControls(prev => prev.filter(c => c.id !== id));
  }, []);

  // Documents CRUD
  const addDocument = useCallback(async (doc: Omit<Document, 'id' | 'uploadedAt'>) => {
    const newDoc = await documentService.uploadDocument(doc);
    setDocuments(prev => [...prev, newDoc]);
    return newDoc;
  }, []);

  const updateDocument = useCallback(async (doc: Document) => {
    const updated = await documentService.updateDocument(doc);
    setDocuments(prev => prev.map(d => d.id === doc.id ? updated : d));
    return updated;
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    await documentService.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  // Reports CRUD
  const addReport = useCallback(async (report: Omit<Report, 'id' | 'createdAt'>) => {
    const newReport = await reportService.createReport(report);
    setReports(prev => [...prev, newReport]);
    return newReport;
  }, []);

  const updateReport = useCallback(async (id: string, updates: Partial<Report>) => {
    const updated = await reportService.updateReport(id, updates);
    setReports(prev => prev.map(r => r.id === id ? updated : r));
    return updated;
  }, []);

  const deleteReport = useCallback(async (id: string) => {
    await reportService.deleteReport(id);
    setReports(prev => prev.filter(r => r.id !== id));
  }, []);

  const addAnswer = useCallback(async (answer: Omit<Answer, 'id'>) => {
    const newAns = await answerService.submitAnswer(answer);
    setAnswers(prev => {
      const exists = prev.find(a => a.id === newAns.id);
      if (exists) return prev.map(a => a.id === exists.id ? newAns : a);
      return [...prev, newAns];
    });
  }, []);

  return {
    isLoading,
    org, setOrg,
    assessments, saveAssessment,
    risks, addRisk, updateRisk, deleteRisk,
    controls, setControls, addControl, updateControl, deleteControl,
    documents, addDocument, updateDocument, deleteDocument,
    reports, setReports, addReport, updateReport, deleteReport,
    answers, addAnswer,
    getOverallRiskLevel,
    refresh
  };
}
