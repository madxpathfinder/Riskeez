export enum RiskLevel {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum RiskStatus {
  OPEN = 'Open',
  IN_PROGRESS = 'In Progress',
  MITIGATED = 'Mitigated',
  ACCEPTED = 'Accepted',
  DEFERRED = 'Deferred',
  CLOSED = 'Closed'
}

export interface Risk {
  id: string;
  assessmentId?: string;
  title: string;
  category: string;
  description: string;
  likelihood: number; // 1-5
  impact: number;    // 1-5
  score: number;     // likelihood * impact
  level: RiskLevel;
  owner: string;
  status: RiskStatus;
  recommendation: string;
  existingControls?: string;
  notes?: string;
  dueDate: string;
  createdAt: string;
  updatedAt?: string;
}

export const RISK_CATEGORIES = [
  'Governance',
  'Financial',
  'Operational',
  'Cybersecurity',
  'Compliance',
  'Vendor / Third Party',
  'Business Continuity',
  'HR / People',
  'Legal',
  'Strategic'
];
