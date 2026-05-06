import { Document } from '../types/document';
import { storageService } from './storageService';
import { auditLogService } from './auditLogService';
import { notificationService } from './notificationService';
import { NotificationType } from '../types/notification';
import { APP_CONFIG } from '../config/appConfig';
import { api } from './apiClient';

const DOCUMENTS_KEY = 'riskeez_documents';

export const documentService = {
  async getDocuments(): Promise<Document[]> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.get<{ documents: Document[] }>('/api/documents');
      return res.documents;
    }
    return storageService.getItem<Document[]>(DOCUMENTS_KEY) || [];
  },

  saveDocuments(docs: Document[]) {
    storageService.setItem(DOCUMENTS_KEY, docs);
  },

  async uploadDocument(doc: Omit<Document, 'id' | 'uploadedAt'>): Promise<Document> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.post<{ document: Document }>('/api/documents', doc);
      return res.document;
    }
    const newDoc: Document = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date().toISOString()
    };

    const docs = await this.getDocuments();
    docs.push(newDoc);
    this.saveDocuments(docs);

    await auditLogService.log('document_uploaded', 'Document', `Uploaded document: ${newDoc.name}`);

    await notificationService.addNotification({
      title: 'Artifact Uploaded',
      message: `The artifact "${newDoc.name}" has been successfully vaulted.`,
      type: NotificationType.SUCCESS,
      actionPath: 'documents'
    });

    return newDoc;
  },

  async addEvidence(data: any): Promise<void> {
    const docs = await this.getDocuments();
    const newDoc: Document = {
      id: `doc-ev-${Date.now()}`,
      organizationId: data.organizationId || 'org-internal',
      name: data.title || 'Manual Evidence',
      type: data.type || 'Policy',
      uploadedAt: new Date().toISOString(),
      summary: data.summary || 'Uploaded evidence artifact',
      content: data.content || '',
      detectedRisks: [],
      missingEvidence: [],
      suggestedControls: []
    };
    docs.push(newDoc);
    this.saveDocuments(docs);
    await auditLogService.log('assessment_evidence_added', 'Document', `Added evidence: ${newDoc.name}`);
  },

  async linkEvidenceToAssessment(data: any): Promise<void> {
    await auditLogService.log('assessment_evidence_linked', 'Document', `Linked evidence to assessment ${data.assessmentId}`);
  },

  async linkEvidenceToRisk(data: any): Promise<void> {
    await auditLogService.log('risk_evidence_linked', 'Document', `Linked evidence to risk ${data.riskId}`);
  },

  async updateDocument(doc: Document): Promise<Document> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      const res = await api.put<{ document: Document }>(`/api/documents/${doc.id}`, doc);
      return res.document;
    }
    const docs = await this.getDocuments();
    const index = docs.findIndex(d => d.id === doc.id);
    if (index !== -1) {
      docs[index] = doc;
      this.saveDocuments(docs);
      await auditLogService.log('document_updated', 'Document', `Updated document: ${doc.name}`);
    }
    return doc;
  },

  async deleteDocument(id: string): Promise<void> {
    if (APP_CONFIG.DATA_PROVIDER === 'api') {
      await api.delete(`/api/documents/${id}`);
      return;
    }
    let docs = await this.getDocuments();
    const doc = docs.find(d => d.id === id);
    docs = docs.filter(d => d.id !== id);
    this.saveDocuments(docs);

    if (doc) {
      await auditLogService.log('document_deleted', 'Document', `Deleted document: ${doc.name}`);
    }
  }
};
