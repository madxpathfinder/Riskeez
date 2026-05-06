import { auditLogService } from './auditLogService';
import { storageService } from './storageService';
import { Organization } from '../types/organization';
import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

const ORG_KEY = 'riskeez_organization';

export const organizationService = {
  async getOrganization(): Promise<Organization | null> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      try {
        const res = await api.get<{ organization: Organization }>('/api/organizations/current');
        return res.organization;
      } catch {
        return null;
      }
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      console.warn('Supabase provider requested but not fully implemented');
    }

    return storageService.getItem<Organization>(ORG_KEY);
  },

  async createOrganization(data: Partial<Organization>): Promise<Organization> {
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
      // const { data, error } = await supabase.from('organizations').insert(data).select().single();
      // if (error) throw error;
      // return data;
    }

    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: data.name || '',
      industry: data.industry || 'Not Specified',
      size: data.size || '1-10',
      region: data.region || 'Global',
      country: data.country || '',
      description: data.description || '',
      createdAt: new Date().toISOString(),
      ...data
    };
    storageService.setItem(ORG_KEY, newOrg);
    auditLogService.log('Organization Created', 'System', `New organization initialized: ${newOrg.name}`);
    return newOrg;
  },

  async updateOrganization(org: Organization): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      await api.put('/api/organizations/current', org);
      return;
    }
    if (APP_CONFIG.DATA_PROVIDER === 'supabase') {
      // BACKEND INTEGRATION POINT:
    }

    storageService.setItem(ORG_KEY, org);
    auditLogService.log('Organization Updated', 'System', `Organization profile updated: ${org.name}`);
  },

  async initializeOrganization(name: string): Promise<Organization> {
    return this.createOrganization({ name });
  }
};
