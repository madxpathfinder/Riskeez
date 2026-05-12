import { Role } from '../types/user';

// ─── Granular permission constants ──────────────────────────────────────────
export enum Permission {
  // Dashboard
  DASHBOARD_VIEW           = 'dashboard:view',
  EXEC_DASHBOARD_VIEW      = 'executive_dashboard:view',

  // Risks
  RISKS_VIEW               = 'risks:view',
  RISKS_CREATE             = 'risks:create',
  RISKS_UPDATE             = 'risks:update',
  RISKS_DELETE             = 'risks:delete',

  // Assessments
  ASSESSMENTS_VIEW         = 'assessments:view',
  ASSESSMENTS_CREATE       = 'assessments:create',
  ASSESSMENTS_UPDATE       = 'assessments:update',
  ASSESSMENTS_DELETE       = 'assessments:delete',

  // Controls
  CONTROLS_VIEW            = 'controls:view',
  CONTROLS_CREATE          = 'controls:create',
  CONTROLS_UPDATE          = 'controls:update',
  CONTROLS_DELETE          = 'controls:delete',

  // Documents
  DOCUMENTS_VIEW           = 'documents:view',
  DOCUMENTS_CREATE         = 'documents:create',
  DOCUMENTS_UPDATE         = 'documents:update',
  DOCUMENTS_DELETE         = 'documents:delete',

  // Reports
  REPORTS_VIEW             = 'reports:view',
  REPORTS_CREATE           = 'reports:create',
  REPORTS_DELETE           = 'reports:delete',

  // Audit logs
  AUDIT_LOGS_VIEW          = 'audit_logs:view',

  // Users
  USERS_VIEW               = 'users:view',
  USERS_MANAGE             = 'users:manage',

  // Organization
  ORG_VIEW                 = 'organization:view',
  ORG_MANAGE               = 'organization:manage',

  // Settings
  SETTINGS_VIEW            = 'settings:view',
  SETTINGS_UPDATE          = 'settings:update',

  // System (Super Admin only)
  SYSTEM_ADMIN             = 'system:admin',
  EXPORT_DATA              = 'data:export',

  // Legacy aliases kept for backward compat with existing UI checks
  VIEW_DASHBOARD           = 'dashboard:view',
  MANAGE_ASSESSMENTS       = 'assessments:create',
  MANAGE_RISKS             = 'risks:create',
  MANAGE_CONTROLS          = 'controls:create',
  MANAGE_DOCUMENTS         = 'documents:create',
  GENERATE_REPORTS         = 'reports:create',
  MANAGE_USERS             = 'users:manage',
  MANAGE_SETTINGS          = 'settings:update',
  RESET_PASSWORDS          = 'users:manage',
  VIEW_AUDIT_LOGS          = 'audit_logs:view',
}

// ─── All read permissions ────────────────────────────────────────────────────
const READ_ALL: Permission[] = [
  Permission.DASHBOARD_VIEW,
  Permission.EXEC_DASHBOARD_VIEW,
  Permission.RISKS_VIEW,
  Permission.ASSESSMENTS_VIEW,
  Permission.CONTROLS_VIEW,
  Permission.DOCUMENTS_VIEW,
  Permission.REPORTS_VIEW,
  Permission.AUDIT_LOGS_VIEW,
  Permission.USERS_VIEW,
  Permission.ORG_VIEW,
  Permission.SETTINGS_VIEW,
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // ── Super Admin: everything ──────────────────────────────────────────────
  [Role.SUPER_ADMIN]: Object.values(Permission).filter(
    (v, i, a) => a.indexOf(v) === i   // deduplicate
  ),

  // ── Organization Admin: full org scope ───────────────────────────────────
  [Role.ADMIN]: [
    ...READ_ALL,
    Permission.RISKS_CREATE, Permission.RISKS_UPDATE, Permission.RISKS_DELETE,
    Permission.ASSESSMENTS_CREATE, Permission.ASSESSMENTS_UPDATE, Permission.ASSESSMENTS_DELETE,
    Permission.CONTROLS_CREATE, Permission.CONTROLS_UPDATE, Permission.CONTROLS_DELETE,
    Permission.DOCUMENTS_CREATE, Permission.DOCUMENTS_UPDATE, Permission.DOCUMENTS_DELETE,
    Permission.REPORTS_CREATE, Permission.REPORTS_DELETE,
    Permission.USERS_MANAGE,
    Permission.ORG_MANAGE,
    Permission.SETTINGS_UPDATE,
    Permission.EXPORT_DATA,
  ],

  // ── Risk Manager ─────────────────────────────────────────────────────────
  [Role.RISK_MANAGER]: [
    Permission.DASHBOARD_VIEW,
    Permission.EXEC_DASHBOARD_VIEW,
    Permission.RISKS_VIEW, Permission.RISKS_CREATE, Permission.RISKS_UPDATE, Permission.RISKS_DELETE,
    Permission.ASSESSMENTS_VIEW, Permission.ASSESSMENTS_CREATE, Permission.ASSESSMENTS_UPDATE,
    Permission.CONTROLS_VIEW, Permission.CONTROLS_CREATE, Permission.CONTROLS_UPDATE,
    Permission.DOCUMENTS_VIEW, Permission.DOCUMENTS_CREATE,
    Permission.REPORTS_VIEW, Permission.REPORTS_CREATE,
    Permission.EXPORT_DATA,
    Permission.ORG_VIEW,
  ],

  // ── Compliance Officer / Auditor ──────────────────────────────────────────
  [Role.AUDITOR]: [
    Permission.DASHBOARD_VIEW,
    Permission.EXEC_DASHBOARD_VIEW,
    Permission.RISKS_VIEW,
    Permission.ASSESSMENTS_VIEW,
    Permission.CONTROLS_VIEW,
    Permission.DOCUMENTS_VIEW, Permission.DOCUMENTS_CREATE, Permission.DOCUMENTS_UPDATE,
    Permission.REPORTS_VIEW,
    Permission.AUDIT_LOGS_VIEW,
    Permission.ORG_VIEW,
    Permission.SETTINGS_VIEW,
  ],

  // ── Contributor / Department User ─────────────────────────────────────────
  [Role.CONTRIBUTOR]: [
    Permission.DASHBOARD_VIEW,
    Permission.RISKS_VIEW, Permission.RISKS_CREATE, Permission.RISKS_UPDATE,
    Permission.ASSESSMENTS_VIEW, Permission.ASSESSMENTS_CREATE,
    Permission.CONTROLS_VIEW,
    Permission.DOCUMENTS_VIEW, Permission.DOCUMENTS_CREATE,
    Permission.REPORTS_VIEW,
  ],

  // ── Viewer / CEO (read-only) ──────────────────────────────────────────────
  [Role.VIEWER]: [
    Permission.DASHBOARD_VIEW,
    Permission.EXEC_DASHBOARD_VIEW,
    Permission.RISKS_VIEW,
    Permission.ASSESSMENTS_VIEW,
    Permission.CONTROLS_VIEW,
    Permission.DOCUMENTS_VIEW,
    Permission.REPORTS_VIEW,
  ],
};

// ─── Normalize raw DB/JWT role strings → Role enum ──────────────────────────
export function normalizeRole(role: string): Role {
  switch (role.toLowerCase().replace(/[\s_-]/g, '')) {
    case 'superadmin':    return Role.SUPER_ADMIN;
    case 'admin':         return Role.ADMIN;
    case 'riskmanager':   return Role.RISK_MANAGER;
    case 'auditor':
    case 'complianceofficer':
    case 'compliance':    return Role.AUDITOR;
    case 'contributor':
    case 'departmentuser':
    case 'department':    return Role.CONTRIBUTOR;
    default:              return Role.VIEWER;
  }
}

export const permissionService = {
  /**
   * SECURITY: UI checks are for UX only. Backend middleware enforces real auth.
   */
  hasPermission(role: Role | string, permission: Permission | string): boolean {
    const r = (Object.values(Role) as string[]).includes(role as string)
      ? (role as Role)
      : normalizeRole(role as string);
    return (ROLE_PERMISSIONS[r] ?? []).includes(permission as Permission);
  },

  getPermissionsForRole(role: Role | string): Permission[] {
    const r = (Object.values(Role) as string[]).includes(role as string)
      ? (role as Role)
      : normalizeRole(role as string);
    return ROLE_PERMISSIONS[r] ?? [];
  },

  canCreate(role: Role | string, module: 'risks'|'assessments'|'controls'|'documents'|'reports'): boolean {
    const map: Record<string, Permission> = {
      risks:       Permission.RISKS_CREATE,
      assessments: Permission.ASSESSMENTS_CREATE,
      controls:    Permission.CONTROLS_CREATE,
      documents:   Permission.DOCUMENTS_CREATE,
      reports:     Permission.REPORTS_CREATE,
    };
    return this.hasPermission(role, map[module]);
  },

  canDelete(role: Role | string, module: 'risks'|'assessments'|'controls'|'documents'|'reports'): boolean {
    const map: Record<string, Permission> = {
      risks:       Permission.RISKS_DELETE,
      assessments: Permission.ASSESSMENTS_DELETE,
      controls:    Permission.CONTROLS_DELETE,
      documents:   Permission.DOCUMENTS_DELETE,
      reports:     Permission.REPORTS_DELETE,
    };
    return this.hasPermission(role, map[module]);
  },

  isReadOnly(role: Role | string): boolean {
    return normalizeRole(role as string) === Role.VIEWER;
  },

  getPermissionMetadata(): { id: Permission; label: string; description: string }[] {
    return [
      { id: Permission.DASHBOARD_VIEW,      label: 'View Dashboard',        description: 'Access main dashboard and KPI charts.' },
      { id: Permission.EXEC_DASHBOARD_VIEW, label: 'View Executive Summary', description: 'Access executive/CEO summary view.' },
      { id: Permission.RISKS_VIEW,          label: 'View Risks',             description: 'Read the risk register.' },
      { id: Permission.RISKS_CREATE,        label: 'Create Risks',           description: 'Add new risks to the register.' },
      { id: Permission.RISKS_UPDATE,        label: 'Update Risks',           description: 'Edit existing risk records.' },
      { id: Permission.RISKS_DELETE,        label: 'Delete Risks',           description: 'Permanently remove risks.' },
      { id: Permission.ASSESSMENTS_VIEW,    label: 'View Assessments',       description: 'Read risk assessments.' },
      { id: Permission.ASSESSMENTS_CREATE,  label: 'Create Assessments',     description: 'Start new risk assessments.' },
      { id: Permission.ASSESSMENTS_UPDATE,  label: 'Update Assessments',     description: 'Edit in-progress assessments.' },
      { id: Permission.ASSESSMENTS_DELETE,  label: 'Delete Assessments',     description: 'Remove assessment records.' },
      { id: Permission.CONTROLS_VIEW,       label: 'View Controls',          description: 'Read security controls.' },
      { id: Permission.CONTROLS_CREATE,     label: 'Create Controls',        description: 'Add security controls.' },
      { id: Permission.CONTROLS_UPDATE,     label: 'Update Controls',        description: 'Edit existing controls.' },
      { id: Permission.CONTROLS_DELETE,     label: 'Delete Controls',        description: 'Remove controls.' },
      { id: Permission.DOCUMENTS_VIEW,      label: 'View Documents',         description: 'Read uploaded documents.' },
      { id: Permission.DOCUMENTS_CREATE,    label: 'Upload Documents',       description: 'Upload evidence and documents.' },
      { id: Permission.DOCUMENTS_UPDATE,    label: 'Update Documents',       description: 'Edit document metadata.' },
      { id: Permission.DOCUMENTS_DELETE,    label: 'Delete Documents',       description: 'Remove documents.' },
      { id: Permission.REPORTS_VIEW,        label: 'View Reports',           description: 'Read generated reports.' },
      { id: Permission.REPORTS_CREATE,      label: 'Generate Reports',       description: 'Create and export reports.' },
      { id: Permission.REPORTS_DELETE,      label: 'Delete Reports',         description: 'Remove report archives.' },
      { id: Permission.AUDIT_LOGS_VIEW,     label: 'View Audit Logs',        description: 'Access the full audit trail.' },
      { id: Permission.USERS_VIEW,          label: 'View Users',             description: 'List organization users.' },
      { id: Permission.USERS_MANAGE,        label: 'Manage Users',           description: 'Create, edit roles, disable users.' },
      { id: Permission.ORG_VIEW,            label: 'View Organization',      description: 'View org profile.' },
      { id: Permission.ORG_MANAGE,          label: 'Manage Organization',    description: 'Update org settings.' },
      { id: Permission.SETTINGS_VIEW,       label: 'View Settings',          description: 'Read system settings.' },
      { id: Permission.SETTINGS_UPDATE,     label: 'Update Settings',        description: 'Change system configuration.' },
      { id: Permission.EXPORT_DATA,         label: 'Export Data',            description: 'Bulk-export all data.' },
      { id: Permission.SYSTEM_ADMIN,        label: 'System Administration',  description: 'Full super-admin access.' },
    ];
  }
};
