/**
 * AI Configuration for Riskeez
 * 
 * Supports switching between local LLMs (Ollama), OpenAI-compatible APIs, 
 * Google Gemini, and a professional Mock fallback.
 */

export type AIProvider = 'mock' | 'ollama' | 'openai_compatible' | 'gemini';

export interface AIConfig {
  provider: AIProvider;
  model: string;
  baseUrl?: string;
  isConfigured: boolean;
  mockFallbackEnabled: boolean;
  language: 'en' | 'az';
  disclaimer: string;
}

export const AI_CONFIG: AIConfig = {
  // Toggle this to 'ollama' or 'gemini' when backend is connected
  provider: 'mock',
  
  model: 'llama3.1:8b', // Default for Ollama
  baseUrl: 'http://localhost:11434', // Default Ollama URL
  
  isConfigured: false,
  mockFallbackEnabled: true,
  
  language: 'en',
  
  disclaimer: 'AI-generated insights are advisory and based on available documentation. Always verify findings against official regulatory frameworks.'
};
