export interface ChatAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
  analysis: string
  summary?: string
  pages?: number
  uploadedAt?: string
}

export interface AttachmentUploadResponse {
  ok: boolean
  attachments: ChatAttachment[]
  prompt?: string
}
