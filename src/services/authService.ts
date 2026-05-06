import { User, Role, UserStatus } from '../types/user';
import { userService } from './userService';
import { storageService } from './storageService';
import { APP_CONFIG } from '../config/appConfig';
import { auditLogService } from './auditLogService';
import { notificationService } from './notificationService';
import { NotificationType } from '../types/notification';
import { api } from './apiClient';

const CURRENT_USER_KEY = 'riskeez_current_user';

export const authService = {
  async checkAdminExists(): Promise<boolean> {
    return await userService.checkAdminExists();
  },

  getCurrentUser(): User | null {
    return storageService.getItem<User>(CURRENT_USER_KEY);
  },

  setCurrentUser(user: User): void {
    storageService.setItem(CURRENT_USER_KEY, user);
  },

  async login(email: string, password: string): Promise<User | null> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try {
        const res = await api.post<{ token: string; user: User }>('/api/auth/login', { email, password });
        localStorage.setItem('riskeez_jwt', res.token);
        this.setCurrentUser(res.user);
        storageService.setItem('riskeez_session', 'active');
        return res.user;
      } catch {
        return null;
      }
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // ... Supabase logic ...
    }

    const users = await userService.getUsers();
    
    // Hardcoded fallback for "admin/admin" as requested for development/quick access
    if (email === 'admin' && password === 'admin') {
      let adminUser = users.find(u => u.role === Role.ADMIN);
      if (!adminUser) {
        // Create an ad-hoc admin and sample organization for this session if none exists
        // This prevents the setup loop
        const org = await storageService.getItem('riskeez_organization');
        if (!org) {
          storageService.setItem('riskeez_organization', {
            id: 'org-default',
            name: 'Default Enterprise',
            industry: 'Technology',
            country: 'Azerbaijan',
            createdAt: new Date().toISOString()
          });
        }

        adminUser = {
          id: 'u-temp-admin',
          name: 'System Admin',
          email: 'admin',
          role: Role.ADMIN,
          organizationId: 'org-default',
          status: UserStatus.ACTIVE,
          createdAt: new Date().toISOString()
        };
        
        // Persist it if no users exist at all
        if (users.length === 0) {
          userService.saveUsers([adminUser]);
        }
      }
      const loggedUser = { ...adminUser, lastLogin: new Date().toISOString() };
      this.setCurrentUser(loggedUser);
      storageService.setItem('riskeez_session', 'active');
      await auditLogService.log('user_logged_in', 'User', `User logged in: ${loggedUser.email} (Administrative Access)`);
      
      await notificationService.addNotification({
        title: 'System Access Granted',
        message: `Welcome back, ${loggedUser.name}. Administrative session established.`,
        type: NotificationType.INFO
      });

      return loggedUser;
    }

    const user = users.find(u => (u.email === email || u.name === email) && u.status === UserStatus.ACTIVE);
    
    if (user) {
      const loggedUser = { ...user, lastLogin: new Date().toISOString() };
      this.setCurrentUser(loggedUser);
      storageService.setItem('riskeez_session', 'active');
      await userService.updateUser(loggedUser);
      await auditLogService.log('user_logged_in', 'User', `User logged in: ${loggedUser.email}`);
      
      await notificationService.addNotification({
        title: 'Login Successful',
        message: `Session started for ${loggedUser.email}`,
        type: NotificationType.SUCCESS
      });

      return loggedUser;
    }
    
    return null;
  },

  async logout(): Promise<void> {
    const user = this.getCurrentUser();

    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try { await api.post('/api/auth/logout', {}); } catch { /* ignore */ }
      localStorage.removeItem('riskeez_jwt');
      storageService.removeItem(CURRENT_USER_KEY);
      storageService.removeItem('riskeez_session');
      return;
    }

    if (user) {
      await auditLogService.log('user_logged_out', 'User', `User logged out: ${user.email}`);
      await notificationService.addNotification({
        title: 'Session Terminated',
        message: `User ${user.email} has safely exited the system.`,
        type: NotificationType.INFO
      });
    }

    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
    }
    storageService.removeItem(CURRENT_USER_KEY);
    storageService.removeItem('riskeez_session');
  },

  clearCurrentSession(): void {
    storageService.removeItem(CURRENT_USER_KEY);
    storageService.removeItem('riskeez_session');
  },

  isAuthenticated(): boolean {
    return !!this.getCurrentUser();
  },

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user?.role === Role.ADMIN;
  },

  resetMockSessionForDevelopmentOnly() {
    storageService.removeItem(CURRENT_USER_KEY);
    storageService.removeItem('riskeez_users');
    storageService.removeItem('riskeez_organization');
    window.location.reload();
  }
};
