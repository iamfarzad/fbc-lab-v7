import { logger } from '../lib/logger'

export interface EmailAttachment {
  filename: string
  content: string | Buffer
  contentType?: string
}

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: EmailAttachment[]
  tags?: Record<string, string>
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export class EmailService {
  static async sendEmail(template: EmailTemplate) {
    const apiKey = process.env.RESEND_API_KEY
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'F.B/c <contact@farzadbayat.com>'

    if (!apiKey) {
      logger.warn('EmailService: RESEND_API_KEY missing, skipping email send', {
        to: template.to,
        subject: template.subject
      })
      return { success: true, emailId: 'mock-email-id' }
    }

    const body = buildPayload(fromAddress, template)

    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorBody = await safeReadJson(response)
      throw new Error(
        `Resend API error (${response.status}): ${JSON.stringify(errorBody || {})}`
      )
    }

    const data = await response.json().catch(() => ({}))
    return { success: true, emailId: data?.id }
  }
}

function buildPayload(from: string, template: EmailTemplate) {
  const text = template.text ?? stripHtml(template.html)

  return {
    from,
    to: [template.to],
    subject: template.subject,
    html: template.html,
    text,
    ...(template.tags
      ? {
          tags: Object.entries(template.tags).map(([name, value]) => ({ name, value }))
        }
      : {}),
    ...(template.attachments && template.attachments.length > 0
      ? {
          attachments: template.attachments.map(attachment => ({
            filename: attachment.filename,
            content: encodeAttachment(attachment.content),
            content_type: attachment.contentType ?? 'application/octet-stream'
          }))
        }
      : {})
  }
}

function encodeAttachment(content: string | Buffer) {
  if (typeof content === 'string') {
    return Buffer.from(content).toString('base64')
  }

  return Buffer.from(content).toString('base64')
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

async function safeReadJson(response: Response) {
  try {
    return await response.json()
  } catch (error) {
    logger.warn('EmailService: failed to parse Resend error payload', error)
    return null
  }
}

