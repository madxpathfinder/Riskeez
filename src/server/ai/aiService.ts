import { AIProvider, AIContext, AIResponse } from "./aiTypes";
import { LocalAiProvider } from "./localAiProvider";
import { MockAiProvider } from "./mockAiProvider";

export class AIService {
  private provider: AIProvider;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = process.env.LOCAL_AI_ENABLED === "true";
    this.provider = this.isEnabled ? new LocalAiProvider() : new MockAiProvider();
  }

  private async getProvider(): Promise<AIProvider> {
    if (!this.isEnabled) return this.provider;
    
    const status = await this.provider.getStatus();
    if (status.status === "Unavailable") {
      console.warn("Local AI enabled but unavailable. Falling back to Mock.");
      return new MockAiProvider();
    }
    return this.provider;
  }

  async generateRiskPostureSummary(context: AIContext): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.generateResponse("Provide a high-level summary of the organization's current risk posture based on all available data.", context);
  }

  async generateRiskFindings(context: AIContext): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.generateResponse("Analyze the assessment answers and document summaries to identify specific risk findings.", context);
  }

  async generateRemediationPlan(riskTitle: string, context: AIContext): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.generateResponse(`Create a detailed remediation plan for the following risk: ${riskTitle}`, context);
  }

  async summarizeDocument(docTitle: string, context: AIContext): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.generateResponse(`Provide a professional summary of the document: ${docTitle}`, context);
  }

  async identifyMissingEvidence(context: AIContext): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.generateResponse("Compare assessment answers against best practices to identify missing evidence or documentation gaps.", context);
  }

  async generateExecutiveSummary(context: AIContext): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.generateResponse("Generate a concise executive summary suitable for board-level reporting.", context);
  }

  async rewriteForManagement(text: string, context: AIContext): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.generateResponse(`Rewrite the following text for a non-technical management audience: ${text}`, context);
  }

  async create306090Plan(riskTitle: string, context: AIContext): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.generateResponse(`Create a 30-60-90 day execution plan to mitigate the following risk: ${riskTitle}`, context);
  }

  async conductChat(prompt: string, context: AIContext): Promise<AIResponse> {
    const provider = await this.getProvider();
    return provider.generateResponse(prompt, context);
  }

  async getAiStatus(): Promise<{ status: string; modelName: string }> {
    const provider = await this.getProvider();
    return provider.getStatus();
  }
}

export const aiService = new AIService();
