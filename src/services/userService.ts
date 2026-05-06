import { User, Role, UserStatus } from '../types/user';
import { auditLogService } from './auditLogService';
import { storageService } from './storageService';
import { organizationService } from './organizationService';
import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

const MOCK_USERS_KEY = 'riskeez_users';

export const userService = {
  async getUsers(): Promise<User[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.get<{ users: User[] }>('/api/users');
      return res.users;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
       // BACKEND INTEGRATION POINT:
    }
    return storageService.getItem<User[]>(MOCK_USERS_KEY) || [];
  },

  async getUserById(id: string): Promise<User | undefined> {
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
      // const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
      // if (error) throw error;
      // return data;
    }
    const users = await this.getUsers();
    return users.find(u => u.id === id);
  },

  saveUsers(users: User[]) {
    storageService.setItem(MOCK_USERS_KEY, users);
  },

  async addUser(user: Omit<User, 'id' | 'createdAt' | 'status'>): Promise<User> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ user: User }>('/api/users', user);
      return res.user;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
    }

    const newUser: User = {
      ...user,
      id: `u-${Date.now()}`,
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString()
    };
    
    const users = await this.getUsers();
    users.push(newUser);
    this.saveUsers(users);
    
    auditLogService.log('user_created', 'System', `Admin created user: ${newUser.name} (${newUser.role})`);
    
    return newUser;
  },

  async updateUser(user: User): Promise<User> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.put<{ user: User }>(`/api/users/${user.id}`, user);
      return res.user;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
    }

    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      const oldUser = users[index];
      users[index] = user;
      this.saveUsers(users);
      
      auditLogService.log('user_updated', 'System', `User ${user.email} updated`);

      if (oldUser.status !== user.status) {
        auditLogService.log(user.status === UserStatus.DISABLED ? 'user_disabled' : 'user_enabled', 'System', `User ${user.email} status updated to ${user.status}`);
      }
      if (oldUser.role !== user.role) {
        auditLogService.log('role_changed', 'System', `User ${user.email} role updated from ${oldUser.role} to ${user.role}`);
      }
    }
    return user;
  },

  async disableUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    if (user) {
      user.status = UserStatus.DISABLED;
      await this.updateUser(user);
    }
  },

  async enableUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    if (user) {
      user.status = UserStatus.ACTIVE;
      await this.updateUser(user);
    }
  },

  async resetUserPassword(userId: string, tempPass: string, forceChange: boolean): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
      // await supabase.auth.admin.updateUserById(userId, { password: tempPass })
    }
    
    const user = await this.getUserById(userId);
    if (user) {
      user.forcePasswordChange = forceChange;
      await this.updateUser(user);
      
      auditLogService.log('password_reset', 'System', `Password reset for user ${user.email} by administrator`);
    }
  },

  async checkAdminExists(): Promise<boolean> {
    const users = await this.getUsers();
    return users.some(u => u.role === Role.ADMIN);
  },

  async createInitialAdmin(data: { name: string; email: string; organizationName: string; industry: string; country: string }): Promise<User> {
    const org = await organizationService.initializeOrganization(data.organizationName);
    await organizationService.updateOrganization({
      ...org,
      industry: data.industry,
      country: data.country
    });
    
    const newUser: User = {
      id: `u-admin-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: Role.ADMIN,
      organizationId: org.id,
      status: UserStatus.ACTIVE,
      createdAt: new Date().toISOString()
    };
    
    this.saveUsers([newUser]);
    
    auditLogService.log('First Admin Created', 'System', `Initial system administrator setup: ${data.name} for ${data.organizationName}`);
    
    return newUser;
  }
};
