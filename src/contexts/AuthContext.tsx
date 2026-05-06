import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Role } from '../types/user';
import { Organization } from '../types/organization';
import { organizationService } from '../services/organizationService';
import { authService } from '../services/authService';
import { permissionService, Permission } from '../services/permissionService';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
  updateOrganization: (org: Organization) => Promise<void>;
  refreshState: () => Promise<void>;
  hasPermission: (permission: Permission | string) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshState = async () => {
    setIsLoading(true);
    const currentUser = authService.getCurrentUser();
    const currentOrg = await organizationService.getOrganization();
    setUser(currentUser);
    setOrganization(currentOrg);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshState();
  }, []);

  const login = async (email: string, pass: string) => {
    const loggedInUser = await authService.login(email, pass);
    if (loggedInUser) {
      setUser(loggedInUser);
      const org = await organizationService.getOrganization();
      setOrganization(org);
      return true;
    }
    return false;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    setOrganization(null);
    // Hard reset is actually safer to clear all memory states and listeners
    window.location.href = '/'; 
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const updateOrganization = async (updatedOrg: Organization) => {
    await organizationService.updateOrganization(updatedOrg);
    setOrganization(updatedOrg);
  };

  const hasPermission = (permission: Permission | string) => {
    if (!user) return false;
    return permissionService.hasPermission(user.role, permission);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      organization, 
      login, 
      logout, 
      updateUser, 
      updateOrganization, 
      refreshState,
      hasPermission,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
