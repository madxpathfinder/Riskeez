export interface AIResponse {
  confirmedFindings: string[];
  assumptions: string[];
  missingInformation: string[];
  recommendations: string[];
  summary: string;
}

export interface AIContext {
  assessmentAnswers?: any[];
  documentSummaries?: string[];
  riskRegisterData?: any[];
  language?: "English" | "Azerbaijani";
}

export interface AIProvider {
  generateResponse(prompt: string, context: AIContext): Promise<AIResponse>;
  getStatus(): Promise<{
    status: "Connected" | "Unavailable" | "Mock Mode";
    modelName: string;
  }>;
}
