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
  ControlEffectiveness 
} from '../types';

export const INITIAL_ORG: Organization = {
  id: 'org-default',
  name: 'Default Organization',
  industry: 'Infrastructure',
  employeeCount: 0,
  country: 'Global',
  departments: ['Executive', 'Operations'],
  createdAt: new Date().toISOString()
};

export const INITIAL_ASSESSMENTS: Assessment[] = [
  {
    id: 'as-1',
    organizationId: 'org-1',
    title: 'Annual Business Risk Review 2025',
    scope: 'Full Company',
    status: AssessmentStatus.COMPLETED,
    overallScore: 68,
    riskLevel: RiskLevel.HIGH,
    createdAt: new Date('2025-01-15').toISOString(),
    completedAt: new Date('2025-01-28').toISOString()
  },
  {
    id: 'as-2',
    organizationId: 'org-1',
    title: 'Cyber & Privacy Compliance Check',
    scope: 'IT & HR Departments',
    status: AssessmentStatus.IN_PROGRESS,
    overallScore: 0,
    riskLevel: RiskLevel.LOW,
    createdAt: new Date('2025-04-20').toISOString()
  }
];

export const INITIAL_RISKS: Risk[] = [
  {
    id: 'r-1',
    assessmentId: 'as-1',
    title: 'No formal risk register exists',
    category: 'Operational Risk',
    description: 'The company lacks a centralized repository to track, prioritize, and manage identified business risks.',
    likelihood: 4,
    impact: 4,
    score: 16,
    level: RiskLevel.CRITICAL,
    owner: 'Operations Manager',
    status: RiskStatus.IN_PROGRESS,
    recommendation: 'Establish a centralized risk register and assign risk owners.',
    dueDate: '2025-06-30',
    createdAt: new Date('2025-01-20').toISOString()
  },
  {
    id: 'r-2',
    assessmentId: 'as-1',
    title: 'Business continuity plan has not been tested',
    category: 'Business Continuity Risk',
    description: 'While a BCP exists, it hasn\'t been exercised in over 18 months, leading to uncertainty in disaster recovery capability.',
    likelihood: 4,
    impact: 5,
    score: 20,
    level: RiskLevel.CRITICAL,
    owner: 'CEO',
    status: RiskStatus.OPEN,
    recommendation: 'Conduct a tabletop exercise and document recovery responsibilities.',
    dueDate: '2025-08-15',
    createdAt: new Date('2025-01-20').toISOString()
  },
  {
    id: 'r-3',
    assessmentId: 'as-1',
    title: 'Vendor review process is informal',
    category: 'Vendor Risk',
    description: 'Critical third-party vendors are not subject to a structured annual review or initial GRC assessment.',
    likelihood: 3,
    impact: 4,
    score: 12,
    level: RiskLevel.HIGH,
    owner: 'Procurement Owner',
    status: RiskStatus.OPEN,
    recommendation: 'Implement a vendor onboarding and annual review process.',
    dueDate: '2025-09-01',
    createdAt: new Date('2025-01-20').toISOString()
  },
  {
    id: 'r-4',
    assessmentId: 'as-1',
    title: 'Policies are not reviewed annually',
    category: 'Compliance Risk',
    description: 'Several key HR and IT security policies have not been updated for 24 months.',
    likelihood: 3,
    impact: 4,
    score: 12,
    level: RiskLevel.HIGH,
    owner: 'Compliance Manager',
    status: RiskStatus.IN_PROGRESS,
    recommendation: 'Create an annual policy review calendar and assign owners.',
    dueDate: '2025-05-30',
    createdAt: new Date('2025-01-20').toISOString()
  },
  {
    id: 'r-5',
    assessmentId: 'as-1',
    title: 'Access rights are not periodically reviewed',
    category: 'IT Governance Risk',
    description: 'System access for terminated employees or moved staff is not consistently revoked or adjusted.',
    likelihood: 4,
    impact: 4,
    score: 16,
    level: RiskLevel.CRITICAL,
    owner: 'IT Ops Lead',
    status: RiskStatus.OPEN,
    recommendation: 'Implement quarterly access reviews for critical systems.',
    dueDate: '2025-07-01',
    createdAt: new Date('2025-01-20').toISOString()
  },
  {
    id: 'r-6',
    title: 'Unsecured physical server room access',
    category: 'Operational Risk',
    description: 'The server room door is often left unlocked or used for storage by non-IT personnel.',
    likelihood: 3,
    impact: 3,
    score: 9,
    level: RiskLevel.MEDIUM,
    owner: 'Office Manager',
    status: RiskStatus.MITIGATED,
    recommendation: 'Install electronic badge access and restrict entry to authorized personnel only.',
    dueDate: '2025-03-15',
    createdAt: new Date('2024-12-05').toISOString()
  }
];

export const INITIAL_CONTROLS: Control[] = [
  {
    id: 'c-1',
    riskId: 'r-5',
    title: 'Active Directory User Audit',
    description: 'Monthly export and review of active accounts against current HR payroll list.',
    status: ControlStatus.PARTIALLY_IMPLEMENTED,
    effectiveness: ControlEffectiveness.MEDIUM,
    owner: 'IT Admin'
  },
  {
    id: 'c-2',
    riskId: 'r-2',
    title: 'Cloud Backup Automation',
    description: 'AWS S3 cross-region replication and daily backup testing.',
    status: ControlStatus.IMPLEMENTED,
    effectiveness: ControlEffectiveness.HIGH,
    owner: 'DevOps'
  }
];

export const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'doc-1',
    organizationId: 'org-1',
    name: 'Conflict of Interest Policy v2.1',
    type: 'Policy',
    uploadedAt: new Date('2025-02-10').toISOString(),
    summary: 'Comprehensive policy governing corporate disclosure and ethical conduct. Clearly defines financial interests and disclosure thresholds.',
    content: 'Policy COI-2024: Employees must disclose any external financial interests that may compete with the projects of the organization. The policy applies to all full-time and contract staff within the region.',
    detectedRisks: ['Compliance', 'Ethical Misconduct'],
    missingEvidence: ['Past 12 months disclosure logs', 'Evidence of policy acknowledgment training'],
    suggestedControls: ['Automated COI disclosure workflow', 'Quarterly ethical conduct briefing'],
    relatedRisks: ['Regulatory non-compliance during external audit'],
    aiFindings: ['Clear disclosure timelines defined', 'Disciplinary actions for non-compliance noted'],
    aiAssumptions: ['Assumes standard corporate legal framework applies', 'Internal HR portal manages the actual tracking'],
    aiStatus: 'Analyzed'
  },
  {
    id: 'doc-2',
    organizationId: 'org-1',
    name: 'Q4 Disaster Recovery Tabletop Exercise',
    type: 'Audit Report',
    uploadedAt: new Date('2025-01-05').toISOString(),
    summary: 'Post-action report for the Q4 tabletop exercise. Simulates data center failure scenario and evaluates response times.',
    content: 'Exercise ID: DR-2024-Q4. Scenario: Primary Data Center Power Failure. Team Participation: IT Operations, Executive Leadership, PR. Result: Recovery time objectives (RTO) met within 85% of target.',
    detectedRisks: ['Business Continuity', 'Operational Resilience'],
    missingEvidence: ['Sign-off from Head of Infrastructure', 'Secondary site connectivity validation results'],
    suggestedControls: ['Real-time replication health monitoring', 'Bi-annual BCP tabletop schedule'],
    relatedRisks: ['Customer SLA breach during power outage'],
    aiFindings: ['Core RTO targets identified and measured', 'PR/Communications integration confirmed'],
    aiAssumptions: ['Assumes backup power systems are fully operational', 'Third-party cloud providers are excluded from this specific scope'],
    aiStatus: 'Analyzed'
  }
];

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep-1',
    assessmentId: 'as-1',
    title: 'Management Risk Brief Q1 2025',
    executiveSummary: 'The organization faces critical risks in Business Continuity and IT Governance. Immediate investment in testing recovery procedures is required to ensure uptime.',
    topRisks: ['Business continuity plan testing gap', 'Manual access review failure'],
    recommendations: ['Perform DR test in Q2', 'Automate IAM reviews'],
    createdAt: new Date('2025-02-01').toISOString()
  }
];
