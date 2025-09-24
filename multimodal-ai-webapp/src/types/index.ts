export interface AIMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  type: 'image' | 'audio' | 'document';
  url: string;
  name: string;
  size?: number;
}

export interface AIProvider {
  name: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface MultimodalInput {
  text?: string;
  images?: File[];
  audio?: File;
}

export interface AIResponse {
  text: string;
  attachments?: Attachment[];
}
