export interface Organization {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  employeeCount?: number;
  country?: string;
  departments?: string[];
  region?: string;
  description?: string;
  email?: string;
  website?: string;
  address?: string;
  timezone?: string;
  defaultLanguage?: string;
  createdAt?: string;
}
