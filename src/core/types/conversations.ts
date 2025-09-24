export interface ConversationRecord {
  id?: string;
  name: string;
  email: string;
  summary: string;
  leadScore: number;
  researchJson: Record<string, any>;  // jsonb in DB
  pdfUrl?: string;
  emailStatus?: 'pending' | 'sent' | 'failed';
  emailRetries?: number;
  createdAt?: string;
}

export interface LeadContext {
  name: string
  email: string
  summary: string
  leadScore: number
  researchJson: Record<string, any>
}
