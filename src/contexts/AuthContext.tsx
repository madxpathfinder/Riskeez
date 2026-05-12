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
    const storedUser = authService.getCurrentUser();
    const jwt = localStorage.getItem('riskeez_jwt');

    // If user appears logged in but JWT is missing, clear the stale session
    if (storedUser && !jwt) {
      authService.clearCurrentSession();
      setUser(null);
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    // If JWT is older than 12 hours, silently clear the session
    if (jwt) {
      try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        if (Date.now() - payload.iat * 1000 > 12 * 60 * 60 * 1000) {
          authService.clearCurrentSession();
          setUser(null);
          setOrganization(null);
          setIsLoading(false);
          return;
        }
      } catch {
        // Malformed JWT — clear it
        authService.clearCurrentSession();
        setUser(null);
        setOrganization(null);
        setIsLoading(false);
        return;
      }
    }

    // Only fetch org data when authenticated — avoids triggering 401 loops pre-login
    let currentOrg = null;
    if (storedUser && jwt) {
      currentOrg = await organizationService.getOrganization().catch(() => null);
    }
    setUser(storedUser);
    setOrganization(currentOrg);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshState();
  }, []);

  // Re-check token expiry every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshState();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  // Re-check token expiry whenever the window regains focus
  useEffect(() => {
    window.addEventListener('focus', refreshState);
    return () => window.removeEventListener('focus', refreshState);
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
