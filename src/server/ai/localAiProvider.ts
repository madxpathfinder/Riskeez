import { AIProvider, AIContext, AIResponse } from "./aiTypes";

export class LocalAiProvider implements AIProvider {
  private baseURL: string;
  private model: string;
  private apiKey?: string;

  constructor() {
    this.baseURL = process.env.LOCAL_AI_BASE_URL || "http://localhost:11434";
    this.model = process.env.LOCAL_AI_MODEL || "llama3.1";
    this.apiKey = process.env.LOCAL_AI_API_KEY;
  }

  private getSystemInstruction(language: string = "English"): string {
    return `You are an enterprise risk assessment assistant. Your role is to help companies identify, explain, prioritize, and mitigate business, operational, compliance, vendor, privacy, and governance risks. Use only the provided assessment answers, uploaded document summaries, and existing risk register data. Do not invent evidence. Do not change risk scores manually. If information is missing, say exactly what is missing. Write recommendations that are practical, prioritized, and suitable for management reporting.
    
    IMPORTANT: Respond in ${language}. If the input is in Azerbaijani, respond in Azerbaijani.
    
    You MUST return your response in the following JSON format:
    {
      "confirmedFindings": ["finding 1", "finding 2"],
      "assumptions": ["assumption 1"],
      "missingInformation": ["missing detail 1"],
      "recommendations": ["recommendation 1"],
      "summary": "overall summary"
    }`;
  }

  async generateResponse(prompt: string, context: AIContext): Promise<AIResponse> {
    const systemInstr = this.getSystemInstruction(context.language);
    
    // Minimal context to avoid over-sending sensitive data
    const contextStr = JSON.stringify({
      answers: context.assessmentAnswers?.slice(0, 50),
      docs: context.documentSummaries,
      risks: context.riskRegisterData?.map(r => ({ title: r.title, score: r.score }))
    });

    try {
      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey ? { "Authorization": `Bearer ${this.apiKey}` } : {})
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: systemInstr },
            { role: "user", content: `Context: ${contextStr}\n\nTask: ${prompt}` }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`Local AI error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      return this.validateAndParse(content);
    } catch (error) {
      console.error("Local AI Provider Error:", error);
      throw error;
    }
  }

  private validateAndParse(content: string): AIResponse {
    try {
      const parsed = JSON.parse(content);
      return {
        confirmedFindings: Array.isArray(parsed.confirmedFindings) ? parsed.confirmedFindings : [],
        assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
        missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        summary: typeof parsed.summary === 'string' ? parsed.summary : "No summary provided."
      };
    } catch (e) {
      return {
        confirmedFindings: [],
        assumptions: ["Failed to parse AI output"],
        missingInformation: [],
        recommendations: [],
        summary: content // Fallback to raw content if possible
      };
    }
  }

  async getStatus(): Promise<{ status: "Connected" | "Unavailable" | "Mock Mode"; modelName: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      const response = await fetch(`${this.baseURL}/v1/models`, { 
        signal: controller.signal,
        headers: this.apiKey ? { "Authorization": `Bearer ${this.apiKey}` } : {}
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return { status: "Connected", modelName: this.model };
      }
      return { status: "Unavailable", modelName: this.model };
    } catch (e) {
      return { status: "Unavailable", modelName: this.model };
    }
  }
}
