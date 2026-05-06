import { Risk, RiskLevel, RiskStatus } from '../types/risk';
import { Control, ControlStatus, ControlEffectiveness } from '../types/control';

export const MOCK_RISKS: Risk[] = [
  {
    id: 'r1',
    title: 'Unauthorized Database Access',
    category: 'IT Security',
    description: 'Potential for sensitive client data to be accessed by internal unauthorized users.',
    likelihood: 2,
    impact: 5,
    score: 10,
    level: RiskLevel.HIGH,
    owner: 'Security Team',
    status: RiskStatus.OPEN,
    recommendation: 'Implement stronger IAM policies and MFA.',
    dueDate: '2024-06-30',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'r2',
    title: 'Compliance Deadline Breach',
    category: 'Compliance',
    description: 'Failure to submit GDPR annual audit reports by the regulatory deadline.',
    likelihood: 4,
    impact: 3,
    score: 12,
    level: RiskLevel.HIGH,
    owner: 'Compliance Dept',
    status: RiskStatus.IN_PROGRESS,
    recommendation: 'Set up automated reminders 3 months prior.',
    dueDate: '2024-05-15',
    createdAt: '2024-02-10T14:30:00Z'
  }
];

export const MOCK_CONTROLS: Control[] = [
  {
    id: 'c1',
    riskId: 'r1',
    title: 'Multi-Factor Authentication',
    description: 'Require MFA for all administrative database access.',
    status: ControlStatus.IMPLEMENTED,
    effectiveness: ControlEffectiveness.HIGH,
    owner: 'IT Ops'
  }
];
