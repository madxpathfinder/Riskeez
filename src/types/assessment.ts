import { RiskLevel } from './risk';

export enum AssessmentStatus {
  DRAFT = 'Draft',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed'
}

export enum AnswerType {
  YES_NO = 'YesNo',
  SCALE = 'Scale',
  TEXT = 'Text',
  SELECT = 'Select'
}

export interface Assessment {
  id: string;
  organizationId: string;
  title: string;
  scope: string;
  status: AssessmentStatus;
  overallScore: number;
  riskLevel: RiskLevel;
  createdAt: string;
  completedAt?: string;
}

export interface Question {
  id: string;
  category: string;
  text: string;
  weight: number;
  answerType: AnswerType;
  helpText?: string;
}

export interface Answer {
  id: string;
  assessmentId: string;
  questionId: string;
  value: string;
  notes?: string;
  evidenceDocumentId?: string;
}
