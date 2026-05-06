import { AIProvider, AIContext, AIResponse } from "./aiTypes";

export class MockAiProvider implements AIProvider {
  async generateResponse(prompt: string, context: AIContext): Promise<AIResponse> {
    const isAz = context.language === "Azerbaijani";
    
    return {
      confirmedFindings: isAz 
        ? ["Sistem tərəfindən müəyyən edilmiş risklər mövcuddur.", "Sənəd təhlili tamamlanıb."]
        : ["System identified risks are present.", "Document analysis completed."],
      assumptions: isAz
        ? ["Məlumatların tamlığı fərz edilir."]
        : ["Data completeness is assumed."],
      missingInformation: isAz
        ? ["Son 6 ayın audit hesabatları çatışmır."]
        : ["Audit reports for the last 6 months are missing."],
      recommendations: isAz
        ? ["Təhlükəsizlik siyasətlərini yeniləyin.", "İşçilər üçün təlim keçirin."]
        : ["Update security policies.", "Conduct employee awareness training."],
      summary: isAz
        ? `Bu, ${prompt} üçün simulasiya edilmiş (MOCK) AI cavabıdır. Hazırda lokal AI serverinə qoşulmaq mümkün deyil.`
        : `This is a simulated (MOCK) AI response for: ${prompt}. Local AI server is currently unavailable.`
    };
  }

  async getStatus(): Promise<{ status: "Connected" | "Unavailable" | "Mock Mode"; modelName: string }> {
    return { status: "Mock Mode", modelName: "Mock Engine v1" };
  }
}
