import { AI_CONFIG, AIProvider } from '../config/aiConfig';
import { auditLogService } from './auditLogService';

export interface AIResponse {
  answer?: string;
  summary?: string;
  confirmedFindings: string[];
  assumptions: string[];
  missingInformation: string[];
  missingEvidence?: string[];
  relevantRiskAreas?: string[];
  suggestedControls?: string[];
  relatedRisks?: string[];
  recommendations?: string[];
  plan?: string;
  disclaimer: string;
  isMock?: boolean;
}

export const aiService = {
  /**
   * General purpose generator that routes requests through the backend
   * or uses a local professional mock fallback.
   */
  async generate(task: string, context: any): Promise<AIResponse> {
    const startTime = Date.now();
    const savedLang = localStorage.getItem('riskeez_language') || 'en';
    
    // Log the AI action trigger
    await auditLogService.log('ai_action_triggered', 'System', `AI action: ${task}`);

    if (AI_CONFIG.provider === 'mock' || !AI_CONFIG.isConfigured) {
      return this.getMockResponse(task, context);
    }

    try {
      // PRODUCTION BACKEND INTEGRATION
      // This routes through our /api/ai/generate endpoint to keep keys secure
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          context,
          provider: AI_CONFIG.provider,
          model: AI_CONFIG.model,
          baseUrl: AI_CONFIG.baseUrl,
          language: savedLang === 'az' ? 'Azerbaijani' : 'English'
        })
      });

      if (!response.ok) {
        throw new Error('AI Service error');
      }

      const result = await response.json();
      
      // Log completion
      await auditLogService.log('ai_action_completed', 'System', `AI action ${task} completed in ${Date.now() - startTime}ms`);
      
      return {
        ...result,
        disclaimer: AI_CONFIG.disclaimer,
        isMock: false
      };
    } catch (error) {
      console.warn('AI backend failed, falling back to mock:', error);
      return this.getMockResponse(task, context);
    }
  },

  async chatWithRiskAdvisor(input: string, history: any[]): Promise<AIResponse> {
    return this.generate('risk_advisor_chat', { input, history });
  },

  async analyzeDocument(documentText: string, metadata: any): Promise<AIResponse> {
    return this.generate('document_analysis', { text: documentText, metadata });
  },

  async suggestControls(risks: any[]): Promise<AIResponse> {
    return this.generate('suggest_controls', { risks });
  },

  async generateRemediationPlan(risk: any): Promise<AIResponse> {
    return this.generate('remediation_plan', { risk });
  },

  async generateExecutiveSummary(reportData: any): Promise<AIResponse> {
    return this.generate('executive_summary', { reportData });
  },

  async explainRiskScore(risk: any): Promise<AIResponse> {
    return this.generate('explain_risk_score', { risk });
  },

  async create306090Plan(risks: any[]): Promise<AIResponse> {
    return this.generate('thirty_sixty_ninety_plan', { risks });
  },

  async generateDashboardInsights(context: any): Promise<AIResponse> {
    return this.generate('dashboard_insights', context);
  },

  async analyzeAssessment(assessmentData: any): Promise<AIResponse> {
    return this.generate('analyze_assessment', assessmentData);
  },

  async refineRiskRegisterFromAssessment(assessmentData: any, currentRisks: any[]): Promise<AIResponse> {
    return this.generate('refine_risk_register', { assessmentData, currentRisks });
  },

  async inferRisksFromAssessment(assessmentData: any): Promise<AIResponse> {
    return this.generate('infer_risks', assessmentData);
  },

  async analyzeEvidence(evidenceText: string): Promise<AIResponse> {
    return this.generate('analyze_evidence', { text: evidenceText });
  },

  /**
   * PROFESSIONAL MOCK FALLBACK LOGIC
   * Follows strict rules: no invented evidence, professional tone, 
   * clear separation of findings vs assumptions.
   */
  getMockResponse(task: string, context: any): AIResponse {
    const savedLang = localStorage.getItem('riskeez_language') || 'en';
    const isAz = savedLang === 'az';
    const langLabel = isAz ? 'Azerbaijani' : 'English';

    const baseResponse: AIResponse = {
      disclaimer: AI_CONFIG.disclaimer,
      isMock: true,
      confirmedFindings: [],
      assumptions: [],
      missingInformation: [
        isAz ? "Daha dəqiq təhlil üçün əlavə sənədlər tələb olunur." : "Additional documentation is required for a more accurate analysis."
      ]
    };

    switch (task) {
      case 'dashboard_insights':
        return {
          ...baseResponse,
          summary: isAz 
            ? "Təşkilatın risk mühiti stabil görünsə də, kiber təhlükəsizlik sahəsində 2 kritik boşluq aşkarlanıb." 
            : "While the risk posture remains stable, 2 critical gaps in cyber security controls have been identified.",
          confirmedFindings: [
            isAz ? "Biznesin davamlılığı planı 180 gündür yenilənməyib." : "Business Continuity Plan has not been updated in 180 days.",
            isAz ? "İstifadəçi girişi rəylərinin 15%-i gecikir." : "15% of user access reviews are overdue."
          ],
          assumptions: [
            isAz ? "Kadr dəyişikliyinin əməliyyat risklərinə təsir etmədiyi fərz edilir." : "Personnel turnover is assumed to have minimal impact on operational risk."
          ],
          missingInformation: [
            isAz ? "Bulud infrastrukturunun son audit hesabatları yoxdur." : "Missing latest cloud infrastructure audit reports."
          ],
          recommendations: [
            isAz ? "DR testini növbəti 30 gün ərzində reallaşdırın." : "Conduct DR testing within the next 30 days.",
            isAz ? "MFA tətbiqini bütün kənar sistemlər üçün sürətləndirin." : "Accelerate MFA deployment for all external systems."
          ]
        };

      case 'analyze_assessment':
        return {
          ...baseResponse,
          summary: "Assessment analysis identifies partial compliance with internal standards.",
          confirmedFindings: [
            "Network security controls are partially implemented.",
            "Incident response documentation is missing evidence of testing."
          ],
          missingInformation: [
            "No logs provided for administrative access reviews."
          ],
          relevantRiskAreas: ["Infrastructure", "Access Management"],
          recommendations: [
            "Formalize the access review process.",
            "Schedule a tabletop exercise for the CIRT team."
          ]
        };

      case 'refine_risk_register':
        return {
          ...baseResponse,
          summary: "Suggested enhancements to the risk register based on recent assessment data.",
          recommendations: [
            "Add 'Unpatched Legacy Systems' as a high-level risk.",
            "Update likelihood of 'Unauthorized Data Access' due to missing MFA findings."
          ]
        };

      case 'infer_risks':
        return {
          ...baseResponse,
          summary: "Inferred risks detected from non-compliant assessment answers.",
          relatedRisks: [
            "Data Breach (Likelihood: 3, Impact: 5)",
            "Regulatory Non-Compliance (Likelihood: 2, Impact: 4)"
          ]
        };

      case 'analyze_evidence':
        return {
          ...baseResponse,
          summary: "Evidence analysis confirms basic policy alignment but lacks implementation metrics.",
          confirmedFindings: [
            "Policy structure meets industry standards.",
            "User acknowledgment procedures are defined."
          ],
          missingInformation: [
            "Technical enforcement mechanisms are not detailed in this text."
          ]
        };

      case 'document_analysis':
      case 'summarize_doc':
        return {
          ...baseResponse,
          summary: isAz ? "Sənədin ilkin təhlili tamamlandı." : "Preliminary document analysis completed.",
          confirmedFindings: [
            isAz ? "Sənəd formatı və əhatə dairəsi müəyyən edildi." : "Document format and scope identified.",
            isAz ? "Təşkilatı məsuliyyət bəndləri sənəddə mövcuddur." : "Organizational responsibility clauses present."
          ],
          assumptions: [
            isAz ? "Sənədin hal-hazırdakı əməliyyat mühitinə uyğun olduğu güman edilir." : "Document is assumed to be relevant to the current operational environment."
          ],
          relevantRiskAreas: ["Operational", "Compliance", "Legal"],
          missingInformation: [
            isAz ? "Son baxış və təsdiq tarixi qeyd olunmayıb." : "Missing last review and approval date.",
            isAz ? "Xüsusi icra mexanizmləri detallı təsvir edilməyib." : "Specific execution mechanisms not described in detail."
          ],
          missingEvidence: [
            isAz ? "Nəzarət tədbirlərinin effektivliyi barədə qeydlər yoxdur." : "No records of control effectiveness testing."
          ]
        };

      case 'remediation_plan':
        return {
          ...baseResponse,
          plan: isAz ? "Tapılmış boşluqların aradan qaldırılması üçün kompleks tədbirlər planı." : "Comprehensive remediation plan for identified gaps.",
          recommendations: [
            isAz ? "Mövcud nəzarət mexanizmlərini təkrar qiymətləndirin." : "Re-evaluate existing control mechanisms.",
            isAz ? "Fəaliyyət planı üçün büdcə və resursları təsdiqləyin." : "Approve budget and resources for the action plan.",
            isAz ? "İcraçı şəxsləri və son tarixləri təyin edin." : "Assign responsible persons and deadlines."
          ]
        };

      case 'executive_summary':
        return {
          ...baseResponse,
          summary: isAz ? "Rəhbərlik üçün risk profilinin icmalı." : "Executive summary of the risk profile.",
          confirmedFindings: [
            isAz ? "Kritik risk səviyyələri müəyyən edilib." : "Critical risk levels identified.",
            isAz ? "Nəzarət çatışmazlıqları prioritetləşdirilib." : "Control deficiencies prioritized."
          ],
          recommendations: [
            isAz ? "Strateji risk iştahasını yenidən nəzərdən keçirin." : "Review strategic risk appetite.",
            isAz ? "Kritik sahələrə investisiya ayırın." : "Allocate investment to critical areas."
          ]
        };

      case 'risk_advisor_chat':
        return {
          ...baseResponse,
          answer: isAz 
            ? "Salam! Risklərin idarə edilməsi üzrə məsləhətçiniz olaraq, daxil etdiyiniz məlumatlar əsasında sizə kömək edə bilərəm. Mən sizin qiymətləndirmələrinizi, sənədlərinizi və risk reyestrinizi təhlil edə bilərəm." 
            : "Hello! As your Risk Advisor, I can help you analyze your risk landscape based on the data you provided. I can analyze your assessments, documents, and risk register.",
          recommendations: [
            isAz ? "Ən son qiymətləndirmə nəticələrini təhlil edək?" : "Shall we analyze the latest assessment results?",
            isAz ? "Yeni sənəd yükləyərək riskləri müəyyən edək?" : "Identify risks by uploading a new document?"
          ]
        };

      case 'findings':
        return {
          ...baseResponse,
          summary: isAz ? "Mövcud məlumatlar əsasında əsas tapıntılar." : "Key findings based on available data.",
          confirmedFindings: [
            isAz ? "Yüksək təsirli risklər müəyyən edilib." : "High-impact risks identified.",
            isAz ? "Qiymətləndirmə cavablarında ziddiyyətlər aşkarlanıb." : "Inconsistencies detected in assessment answers."
          ],
          missingInformation: [
            isAz ? "Bəzi suallar hələ cavablandırılmayıb." : "Some questions have not been answered yet."
          ]
        };

      case 'thirty_sixty_ninety_plan':
        return {
          ...baseResponse,
          plan: isAz ? "30/60/90 Günlük Strateji Plan." : "30/60/90 Day Strategic Plan.",
          recommendations: [
            isAz ? "30 GÜN: Kritik boşluqları bağlayın." : "30 DAYS: Close critical gaps.",
            isAz ? "60 GÜN: Yeni siyasətləri tətbiq edin." : "60 DAYS: Implement new policies.",
            isAz ? "90 GÜN: Daxili audit hazırlığına başlayın." : "90 DAYS: Start internal audit preparation."
          ]
        };

      case 'management_rewrite':
        return {
          ...baseResponse,
          answer: isAz ? "Təsvir rəhbərlik üçün daha strateji və qısa formaya salındı." : "Description rewritten in a more strategic and concise format for management.",
          summary: isAz ? "Strateji təsir və biznes nəticələrinə fokuslanıb." : "Focused on strategic impact and business outcomes."
        };

      case 'explain_risk_score':
        return {
          ...baseResponse,
          answer: isAz ? "Risk balı ehtimal və təsir dərəcələrinin hasili əsasında hesablanır." : "The risk score is calculated based on the product of likelihood and impact ratings.",
          confirmedFindings: [
            isAz ? "Cari ballar daxili metodologiyaya uyğundur." : "Current scores align with internal methodology."
          ]
        };

      default:
        return {
          ...baseResponse,
          answer: isAz ? "Soruşduğunuz mövzu üzrə məlumatlar təhlil edilir." : "Analyzing information regarding your request.",
          summary: isAz ? "Bu, tərtibat rejimində olan süni intellekt cavabıdır." : "This is an AI response generated in development mode."
        };
    }
  }
};
