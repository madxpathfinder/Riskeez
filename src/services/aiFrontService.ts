import { APP_CONFIG } from '../config/appConfig';
import { aiService, AIResponse as AIBackendResponse } from './aiService';

export interface AIResponse extends AIBackendResponse {}

export interface AIStatus {
  status: "Connected" | "Unavailable" | "Mock Mode";
  modelName: string;
}

export class AIFrontService {
  static async generate(task: string, context: any, subTaskParams: any = {}): Promise<AIResponse> {
    // Determine language based on content
    const text = (context.prompt || context.input || "").toLowerCase();
    const isAz = /[\u0600-\u06FF\u0400-\u04FF]/.test(text);
    
    // We merge subTaskParams into context for the unified aiService
    const combinedContext = { ...context, ...subTaskParams };
    
    // Call the new unified aiService
    return aiService.generate(task, combinedContext);
  }

  static async getStatus(): Promise<AIStatus> {
    if (APP_CONFIG.AI_PROVIDER === 'mock') {
       return { status: 'Mock Mode', modelName: 'MOCK-LLM-01' };
    }

    const response = await fetch("/api/ai/status");
    if (!response.ok) return { status: 'Unavailable', modelName: 'None' };
    return response.json();
  }
}
