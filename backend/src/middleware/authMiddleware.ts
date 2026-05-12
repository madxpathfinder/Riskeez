import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ─── Role → permission matrix (mirrors frontend permissionService) ────────────
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'super admin':    ['*'],   // wildcard — all permissions
  'admin':          [
    'dashboard:view','executive_dashboard:view',
    'risks:view','risks:create','risks:update','risks:delete',
    'assessments:view','assessments:create','assessments:update','assessments:delete',
    'controls:view','controls:create','controls:update','controls:delete',
    'documents:view','documents:create','documents:update','documents:delete',
    'reports:view','reports:create','reports:delete',
    'audit_logs:view',
    'users:view','users:manage',
    'organization:view','organization:manage',
    'settings:view','settings:update',
    'data:export',
  ],
  'risk manager':   [
    'dashboard:view','executive_dashboard:view',
    'risks:view','risks:create','risks:update','risks:delete',
    'assessments:view','assessments:create','assessments:update',
    'controls:view','controls:create','controls:update',
    'documents:view','documents:create',
    'reports:view','reports:create',
    'data:export','organization:view',
  ],
  'auditor':        [
    'dashboard:view','executive_dashboard:view',
    'risks:view','assessments:view',
    'controls:view',
    'documents:view','documents:create','documents:update',
    'reports:view','audit_logs:view',
    'organization:view','settings:view',
  ],
  'contributor':    [
    'dashboard:view',
    'risks:view','risks:create','risks:update',
    'assessments:view','assessments:create',
    'controls:view',
    'documents:view','documents:create',
    'reports:view',
  ],
  'viewer':         [
    'dashboard:view','executive_dashboard:view',
    'risks:view','assessments:view','controls:view',
    'documents:view','reports:view',
  ],
};

function normalizeRole(role: string): string {
  return (role || '').toLowerCase().replace(/[\s_-]/g, ' ').trim();
}

function hasPermission(role: string, permission: string): boolean {
  const normalized = normalizeRole(role);
  const perms = ROLE_PERMISSIONS[normalized] ?? ROLE_PERMISSIONS['viewer'];
  return perms.includes('*') || perms.includes(permission);
}

// ─── Auth middleware ──────────────────────────────────────────────────────────
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'riskeez-dev-secret');
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// ─── Permission middleware ────────────────────────────────────────────────────
// Usage: router.post('/', authMiddleware, requirePermission('risks:create'), handler)
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({ error: `Forbidden: requires '${permission}'` });
    }
    next();
  };
};

// ─── Legacy alias (role-list style) ──────────────────────────────────────────
export const permissionMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const lower = allowedRoles.map(r => normalizeRole(r));
    if (!user || !lower.includes(normalizeRole(user.role))) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

// ─── Audit middleware ─────────────────────────────────────────────────────────
export const auditMiddleware = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
      const user = (req as any).user;
      if (user) {
        console.log(`[AUDIT] ${new Date().toISOString()} User:${user.id} Action:${action} ${req.method} ${req.path}`);
      }
    });
    next();
  };
};
