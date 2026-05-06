import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Permission, permissionService } from '../../services/permissionService';

interface PermissionGateProps {
  children: ReactNode;
  permission: Permission | string;
  fallback?: ReactNode;
  showError?: boolean;
  key?: React.Key;
}

export const PermissionGate = ({ 
  children, 
  permission, 
  fallback = null,
  showError = false 
}: PermissionGateProps) => {
  const { user } = useAuth();
  
  if (!user) return fallback;
  
  const hasPermission = permissionService.hasPermission(user.role, permission);
  
  if (hasPermission) {
    return <>{children}</>;
  }
  
  if (showError) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold">
        You do not have permission to perform this action.
      </div>
    );
  }
  
  return <>{fallback}</>;
};
