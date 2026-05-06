export interface Document {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  uploadedAt: string;
  summary?: string;
  detectedRisks?: string[]; // Relevant Risk Areas
  missingEvidence?: string[];
  suggestedControls?: string[];
  relatedRisks?: string[];
  content: string; // The text content of the document
  aiFindings?: string[]; // Confirmed Findings
  aiAssumptions?: string[]; // Assumptions
  aiMissingInfo?: string[]; // Missing Information (general)
  aiStatus?: 'Pending' | 'Analyzed' | 'Failed';
}
