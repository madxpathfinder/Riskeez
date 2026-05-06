import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Permission } from '../services/permissionService';

interface PermissionContextType {
  can: (permission: Permission | string) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider = ({ children }: { children: ReactNode }) => {
  const { hasPermission } = useAuth();

  const can = (permission: Permission | string) => {
    return hasPermission(permission);
  };

  return (
    <PermissionContext.Provider value={{ can }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }
  return context;
};

/**
 * A component that only renders its children if the user has the required permission.
 */
export const PermissionGate = ({ 
  permission, 
  children, 
  fallback = null 
}: { 
  permission: Permission | string; 
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  const { can } = usePermission();
  
  if (!can(permission)) return <>{fallback}</>;
  
  return <>{children}</>;
};
