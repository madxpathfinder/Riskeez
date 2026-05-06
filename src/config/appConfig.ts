export type DataProviderType = 'mock' | 'supabase' | 'api';
export type AIProviderType = 'mock' | 'ollama' | 'gemini' | 'openai_compatible';

// Set VITE_DATA_PROVIDER=api in your .env to use the PostgreSQL backend
const dataProvider = (import.meta.env.VITE_DATA_PROVIDER as DataProviderType) || 'mock';

export const APP_CONFIG = {
  DATA_PROVIDER: dataProvider,

  // Base URL of the Express backend (only used when DATA_PROVIDER === 'api')
  API_URL: (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001',

  AI_PROVIDER: 'gemini' as AIProviderType,
  ENABLE_LOCAL_AI: false,

  FEATURES: {
    REALTIME_COLLABORATION: false,
    ADVANCED_ANALYTICS: true,
    AI_DOCUMENT_ANALYSIS: true
  },

  SUPABASE_PROJECT_ID: '',
  VERSION: '1.0.0-mvp.2'
};
