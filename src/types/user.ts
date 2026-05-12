export enum Role {
  SUPER_ADMIN       = 'Super Admin',
  ADMIN             = 'Admin',             // Organization Admin
  RISK_MANAGER      = 'Risk Manager',
  AUDITOR           = 'Auditor',           // Compliance Officer / Auditor
  CONTRIBUTOR       = 'Contributor',       // Department user
  VIEWER            = 'Viewer',            // CEO / Read-only
}

export enum UserStatus {
  ACTIVE   = 'Active',
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
