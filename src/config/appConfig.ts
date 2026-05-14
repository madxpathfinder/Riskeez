export type DataProviderType = 'mock' | 'supabase' | 'api';
export type AIProviderType = 'mock' | 'ollama' | 'gemini' | 'openai_compatible';

const dataProvider = (import.meta.env.VITE_DATA_PROVIDER as DataProviderType) || 'api';

export const APP_CONFIG = {
  DATA_PROVIDER: dataProvider,

  // Backend base URL — set via VITE_API_BASE_URL (no trailing slash, no /api suffix)
  // Falls back to VITE_API_URL for backward compat, then localhost for dev
  API_URL: (import.meta.env.VITE_API_BASE_URL as string)
        || (import.meta.env.VITE_API_URL as string)
        || '',

  AI_PROVIDER: 'gemini' as AIProviderType,
  ENABLE_LOCAL_AI: false,

  FEATURES: {
    REALTIME_COLLABORATION: false,
    ADVANCED_ANALYTICS: true,
    AI_DOCUMENT_ANALYSIS: true
  },

  VERSION: '1.0.0'
};
