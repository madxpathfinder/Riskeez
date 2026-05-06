import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Authentication Middleware
 * Validates JWT from Authorization header
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    (req as any).user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Permission Middleware
 * Enforces role-based access control
 */
export const permissionMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }
    next();
  };
};

/**
 * Audit Middleware
 * Logs API actions to the audit trail
 */
export const auditMiddleware = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Logic to log action after response completes
    res.on('finish', () => {
      const user = (req as any).user;
      if (user) {
        console.log(`[AUDIT] ${new Date().toISOString()} - User:${user.id} - Action:${action} - Method:${req.method} - Path:${req.path}`);
        // In real impl: await db.insert('audit_logs').values(...)
      }
    });
    next();
  };
};
