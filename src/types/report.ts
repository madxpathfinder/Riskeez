export interface Report {
  id: string;
  assessmentId: string;
  title: string;
  executiveSummary: string;
  topRisks: string[];
  recommendations: string[];
  createdAt: string;
}
