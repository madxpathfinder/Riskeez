/**
 * Riskeez PostgreSQL / Supabase Schema Plan
 * 
 * This file documents the target database structure. 
 * Use this as a reference when creating SQL migrations in Supabase.
 */

export const DATABASE_SCHEMA = {
  organizations: `
    CREATE TABLE organizations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      industry TEXT,
      employee_count INTEGER DEFAULT 0,
      country TEXT,
      departments TEXT[], -- Array of strings
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    -- RLS: Organizations can only be read/updated by their own members (via profiles table join).
  `,

  profiles: `
    CREATE TABLE profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id),
      organization_id UUID REFERENCES organizations(id),
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer', -- admin, risk_manager, auditor, viewer
      status TEXT NOT NULL DEFAULT 'active', -- active, disabled
      last_login_at TIMESTAMP WITH TIME ZONE,
      force_password_change BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    -- RLS: Profiles are visible to members of the same organization. 
    -- Only active users with 'admin' role can update other profiles.
  `,

  assessments: `
    CREATE TABLE assessments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL, -- draft, in_progress, completed, archived
      overall_score FLOAT,
      risk_level TEXT, -- low, medium, high, critical
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  questions: `
    CREATE TABLE questions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      category TEXT NOT NULL,
      text TEXT NOT NULL,
      weight FLOAT DEFAULT 1.0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  assessment_answers: `
    CREATE TABLE assessment_answers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
      question_id UUID REFERENCES questions(id),
      answer TEXT,
      score FLOAT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  risks: `
    CREATE TABLE risks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      assessment_id UUID REFERENCES assessments(id),
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      likelihood INTEGER, -- 1-5
      impact INTEGER, -- 1-5
      calculated_score INTEGER,
      risk_level TEXT,
      owner UUID REFERENCES auth.users(id),
      status TEXT NOT NULL, -- identified, mitigated, accepted, active
      due_date DATE,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  risk_history: `
    CREATE TABLE risk_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      risk_id UUID REFERENCES risks(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      previous_value JSONB,
      new_value JSONB,
      changed_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  controls: `
    CREATE TABLE controls (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      related_risk_id UUID REFERENCES risks(id),
      category TEXT,
      status TEXT NOT NULL, -- active, testing, inactive
      effectiveness TEXT, -- effective, partially_effective, ineffective
      owner UUID REFERENCES auth.users(id),
      last_reviewed TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  documents: `
    CREATE TABLE documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      name TEXT NOT NULL,
      type TEXT,
      uploaded_by UUID REFERENCES auth.users(id),
      storage_path TEXT NOT NULL, -- Supabase Storage link
      extracted_text TEXT,
      summary TEXT,
      detected_risk_areas JSONB,
      missing_evidence JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  document_analysis: `
    CREATE TABLE document_analysis (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
      confirmed_findings JSONB,
      assumptions JSONB,
      missing_information JSONB,
      suggested_controls JSONB,
      related_risks JSONB,
      ai_model TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  reports: `
    CREATE TABLE reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      title TEXT NOT NULL,
      assessment_id UUID REFERENCES assessments(id),
      overall_risk_score FLOAT,
      risk_level TEXT,
      executive_summary TEXT,
      created_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  report_sections: `
    CREATE TABLE report_sections (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
      section_title TEXT NOT NULL,
      section_content TEXT,
      order_index INTEGER NOT NULL
    );
  `,

  audit_logs: `
    CREATE TABLE audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      user_id UUID REFERENCES auth.users(id),
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  ai_actions: `
    CREATE TABLE ai_actions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      user_id UUID REFERENCES auth.users(id),
      action_type TEXT NOT NULL,
      input_summary TEXT,
      output_summary TEXT,
      model_provider TEXT,
      model_name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  settings: `
    CREATE TABLE settings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      organization_id UUID REFERENCES organizations(id) NOT NULL,
      key TEXT NOT NULL,
      value JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(organization_id, key)
    );
  `
};

export const SECURITY_POLICIES = {
  RLS_SUMMARY: `
    - ALL tables must include an 'organization_id'.
    - Row Level Security (RLS) must be ENABLED for all tables.
    - Policy: users can only SELECT/INSERT/UPDATE where organization_id matches their own.
    - Organization ID is derived from the 'profiles' table via 'auth.uid()'.
  `,
  
  MULTI_TENANCY: `
    CREATE POLICY multitenant_org_isolation ON assessments
    FOR ALL USING (
      organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    );
  `
};
