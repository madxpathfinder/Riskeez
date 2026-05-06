import { Role } from '../types/user';

export enum Permission {
  VIEW_DASHBOARD = 'view_dashboard',
  MANAGE_ASSESSMENTS = 'manage_assessments',
  MANAGE_RISKS = 'manage_risks',
  MANAGE_CONTROLS = 'manage_controls',
  MANAGE_DOCUMENTS = 'manage_documents',
  GENERATE_REPORTS = 'generate_reports',
  MANAGE_USERS = 'manage_users',
  MANAGE_SETTINGS = 'manage_settings',
  RESET_PASSWORDS = 'reset_passwords',
  EXPORT_DATA = 'export_data',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.RISK_MANAGER]: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_ASSESSMENTS,
    Permission.MANAGE_RISKS,
    Permission.MANAGE_CONTROLS,
    Permission.MANAGE_DOCUMENTS,
    Permission.GENERATE_REPORTS,
    Permission.EXPORT_DATA,
  ],
  [Role.AUDITOR]: [
    Permission.VIEW_DASHBOARD,
    Permission.MANAGE_ASSESSMENTS,
    Permission.MANAGE_RISKS,
    Permission.MANAGE_CONTROLS,
    Permission.MANAGE_DOCUMENTS,
    Permission.GENERATE_REPORTS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [Role.VIEWER]: [
    Permission.VIEW_DASHBOARD,
    Permission.GENERATE_REPORTS,
  ],
};

export const permissionService = {
  /**
   * IMPORTANT SECURITY NOTICE:
   * 
   * UI-side permission checks are provided EXCLUSIVELY for UX/UI improvements (e.g., hiding buttons).
   * They DO NOT provide actual security. 
   * 
   * In a production environment:
   * 1. Backend authorization MUST enforce these permissions for every API request.
   * 2. Database Row Level Security (RLS) MUST enforce organization-level isolation.
   * 3. Middleware should verify JWT claims against the requested resource's organization_id.
   * 
   * NEVER trust the client to enforce its own permissions.
   */
  hasPermission(role: Role, permission: Permission | string): boolean {
    return ROLE_PERMISSIONS[role].includes(permission as Permission);
  },
  
  getPermissionsForRole(role: Role): Permission[] {
    return ROLE_PERMISSIONS[role];
  },

  getPermissionMetadata(): { id: Permission; label: string; description: string }[] {
    return [
      { id: Permission.VIEW_DASHBOARD, label: 'View Dashboard', description: 'Access to the executive dashboard and KPI charts.' },
      { id: Permission.MANAGE_ASSESSMENTS, label: 'Manage Assessments', description: 'Create, edit, and submit risk assessments.' },
      { id: Permission.MANAGE_RISKS, label: 'Manage Risks', description: 'Access and modify the corporate risk register.' },
      { id: Permission.MANAGE_CONTROLS, label: 'Manage Controls', description: 'Define and track the status of mitigation controls.' },
      { id: Permission.MANAGE_DOCUMENTS, label: 'Manage Documents', description: 'Upload and analyze policy/evidence documents.' },
      { id: Permission.GENERATE_REPORTS, label: 'Generate Reports', description: 'Create PDF/Excel exports of risk findings.' },
      { id: Permission.MANAGE_USERS, label: 'Manage Users', description: 'Invite, edit roles, and disable system users.' },
      { id: Permission.MANAGE_SETTINGS, label: 'Manage Settings', description: 'Conceptualize organization-wide system settings.' },
      { id: Permission.RESET_PASSWORDS, label: 'Reset Passwords', description: 'Ability to reset temporary passwords for any user.' },
      { id: Permission.EXPORT_DATA, label: 'Export Data', description: 'Bulk export all system data to external formats.' },
      { id: Permission.VIEW_AUDIT_LOGS, label: 'View Audit Logs', description: 'Access to the system-wide security and activity trails.' },
    ];
  }
};
