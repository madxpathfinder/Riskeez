export enum Role {
  ADMIN = 'Admin',
  RISK_MANAGER = 'Risk Manager',
  AUDITOR = 'Auditor',
  VIEWER = 'Viewer'
}

export enum UserStatus {
  ACTIVE = 'Active',
  DISABLED = 'Disabled'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organizationId: string;
  status: UserStatus;
  lastLogin?: string;
  createdAt: string;
  forcePasswordChange?: boolean;
}
