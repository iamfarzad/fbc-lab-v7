// Types for the Intelligence System

export interface ContextSnapshot {
  lead: {
    email: string;
    name: string;
  };
  capabilities?: string[];
  role?: string;
  // Add other properties as found in context-manager.ts or usage
}

export interface IntentResult {
  type: 'consulting' | 'workshop' | 'other' | string; // Allow string for extensibility
  confidence: number;
  slots: Record<string, any>;
}

export interface ResearchResult {
  company: {
    name: string;
    domain: string;
    summary?: string;
    industry?: string;
    // Add other company properties as needed
  };
  person: {
    fullName: string;
    profileUrl: string;
    // Add other person properties as needed
  };
  role: string;
  confidence: number;
}

// Suggestion is already defined in chat-enhanced.ts, but if it's heavily used by intelligence,
// it might be re-exported here for convenience, or imports should point to chat-enhanced.
// For now, we'll assume imports will correctly point to chat-enhanced.ts if needed.
// export type { Suggestion } from './chat-enhanced';
