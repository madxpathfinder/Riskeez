import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Organization } from '../types/organization';
import { organizationService } from '../services/organizationService';

interface OrganizationContextType {
  organization: Organization | null;
  updateOrganization: (org: Organization) => Promise<void>;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      const org = await organizationService.getOrganization();
      setOrganization(org);
      setIsLoading(false);
    };
    fetchOrg();
  }, []);

  const updateOrganization = async (org: Organization) => {
    await organizationService.updateOrganization(org);
    setOrganization(org);
  };

  return (
    <OrganizationContext.Provider value={{ organization, updateOrganization, isLoading }}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
