import fs from 'fs'
import type { LeadContext } from '../types/conversations'
import {
  saveConversation,
  updatePdfUrl,
  updateEmailStatus,
  logFailedEmail
} from '../db/conversations'
import {
  generatePdfWithPuppeteer,
  generatePdfPath
} from '../pdf-generator-puppeteer'
import { EmailService } from '../email-service'
import { logger } from '../../lib/logger'

interface StoredConversation {
  id: string
  email: string
}

export async function finalizeLeadSession(ctx: LeadContext) {
  let conversation: StoredConversation | null = null

  try {
    conversation = (await saveConversation({
      name: ctx.name,
      email: ctx.email,
      summary: ctx.summary,
      leadScore: ctx.leadScore,
      researchJson: ctx.researchJson,
      emailStatus: 'pending'
    })) as StoredConversation

    logger.info('Conversation stored for lead finalization', {
      conversationId: conversation?.id,
      email: ctx.email
    })

    const { pdfPath, pdfBytes } = await generateLeadPdf(ctx, conversation.id)
    if (pdfPath) {
      await updatePdfUrl(conversation.id, pdfPath)
    }

    const emailSent = await sendLeadEmail(ctx.email, ctx, pdfPath, conversation.id, pdfBytes)
    await updateEmailStatus(conversation.id, emailSent ? 'sent' : 'failed')

    return conversation
  } catch (error) {
    logger.error('finalizeLeadSession failed', error)

    if (conversation?.id) {
      await updateEmailStatus(conversation.id, 'failed').catch(err => {
        logger.error('Unable to flag conversation as failed', err)
      })
    }

    throw error
  }
}

async function generateLeadPdf(ctx: LeadContext, conversationId: string): Promise<{ pdfPath: string | null; pdfBytes?: Uint8Array }> {
  try {
    const pdfPath = generatePdfPath(conversationId, ctx.name)

    const pdfBytes: Uint8Array | undefined = await generatePdfWithPuppeteer(
      {
        leadInfo: {
          name: ctx.name,
          email: ctx.email,
          company: ctx.researchJson?.company?.name,
          role: ctx.researchJson?.person?.role
        },
        conversationHistory: [
          {
            role: 'assistant',
            content: ctx.summary,
            timestamp: new Date().toISOString()
          }
        ],
        leadResearch: {
          conversation_summary: ctx.summary,
          consultant_brief: buildConsultantBrief(ctx),
          lead_score: ctx.leadScore,
          ai_capabilities_shown: extractCapabilities(ctx)
        },
        sessionId: ctx.researchJson?.session?.id || conversationId
      },
      pdfPath,
      'internal'
    )

    return { pdfPath, pdfBytes }
  } catch (error) {
    logger.error('Lead PDF generation failed', error)
    throw error
  }
}

async function sendLeadEmail(
  recipient: string,
  ctx: LeadContext,
  pdfPath: string | null,
  conversationId: string,
  pdfBytes?: Uint8Array
) {
  const subject = 'Your Personalized AI Strategy Summary - F.B/c'
  const html = buildLeadEmailHtml(ctx, pdfPath)
  const attachments = await buildAttachments(pdfPath, pdfBytes)

  for (let attempt = 0; attempt <= 2; attempt += 1) {
    try {
      await EmailService.sendEmail({
        to: recipient,
        subject,
        html,
        attachments
      })

      logger.info('Lead summary email sent', { conversationId, recipient })
      return true
    } catch (error: any) {
      const failureReason = error?.message || 'Unknown email error'

      await logFailedEmail(conversationId, recipient, failureReason, attempt + 1, {
        subject,
        html
      }).catch(err => logger.error('Failed to log email failure', err))

      logger.warn(`Lead email attempt ${attempt + 1} failed`, { failureReason })

      if (attempt === 2) {
        return false
      }

      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  return false
}

async function buildAttachments(pdfPath: string | null, pdfBytes?: Uint8Array) {
  if (!pdfPath && !pdfBytes) return undefined

  try {
    // In serverless environments, use the PDF bytes directly
    if (pdfBytes) {
      return [
        {
          filename: 'AI_Strategy_Summary.pdf',
          content: Buffer.from(pdfBytes),
          contentType: 'application/pdf'
        }
      ]
    }
    
    // In development, read from file system
    if (pdfPath && !process.env.VERCEL && process.env.NODE_ENV !== 'production') {
      const content = await fs.promises.readFile(pdfPath)
      return [
        {
          filename: 'AI_Strategy_Summary.pdf',
          content,
          contentType: 'application/pdf'
        }
      ]
    }
    
    return undefined
  } catch (error) {
    logger.warn('Unable to attach PDF to email', error)
    return undefined
  }
}

function buildConsultantBrief(ctx: LeadContext) {
  const company = ctx.researchJson?.company
  const person = ctx.researchJson?.person
  const intelligence = ctx.researchJson?.intelligence

  return `Lead: ${person?.fullName || ctx.name} at ${company?.name || 'Unknown Company'}
Industry: ${company?.industry || 'Unknown'}
Company Size: ${intelligence?.headcount ? `${intelligence.headcount} employees` : 'Unknown'}
HQ: ${intelligence?.hq || 'Unknown'}
Lead Score: ${ctx.leadScore}/100

Key Findings:
- Company focus: ${company?.summary || 'Not available'}
- Decision maker: ${person?.role || 'Unknown role'}

Recommended Next Steps:
1. Schedule discovery call within 24 hours
2. Prepare customized AI implementation roadmap
3. Share relevant case studies from ${company?.industry || 'similar industries'}`
}

function extractCapabilities(ctx: LeadContext) {
  const capabilities: string[] = []

  const keywords: string[] | undefined = ctx.researchJson?.intelligence?.keywords
  if (Array.isArray(keywords)) {
    capabilities.push(...keywords)
  }

  const industry = ctx.researchJson?.company?.industry
  if (industry) {
    capabilities.push(`${industry} AI solutions`)
  }

  return capabilities.length > 0
    ? capabilities.slice(0, 5).join(', ')
    : 'AI consultation, strategy development'
}

function buildLeadEmailHtml(ctx: LeadContext, pdfUrl: string | null) {
  const palette = {
    background: '#0b0b0b',
    surface: '#121212',
    border: '#1d1d1d',
    text: '#e6e6e6',
    muted: '#9f9f9f',
    accent: '#f2f2f2',
    accentText: '#111111',
    highlight: '#161616'
  } as const

  const button = pdfUrl
    ? `<p><strong>📄 Your AI Strategy Summary PDF:</strong><br />
         <span style="display:inline-block;padding:12px 24px;background:${palette.accent};color:${palette.accentText};border-radius:6px;">Attached to this email</span></p>`
    : ''

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your AI Strategy Summary - F.B/c</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: ${palette.text}; margin: 0; padding: 0; background: ${palette.background}; }
      .container { max-width: 600px; margin: 0 auto; padding: 24px; }
      .header { background: linear-gradient(135deg, #111111 0%, #181818 100%); color: ${palette.text}; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; border: 1px solid ${palette.border}; }
      .content { background: ${palette.surface}; padding: 30px; border: 1px solid ${palette.border}; border-top: none; }
      .footer { background: ${palette.surface}; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: ${palette.muted}; border: 1px solid ${palette.border}; border-top: none; }
      .highlight { background: ${palette.highlight}; padding: 16px; border-left: 4px solid ${palette.border}; margin: 20px 0; }
      .btn { display: inline-block; background: ${palette.accent}; color: ${palette.accentText}; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
      p, ul, li { color: ${palette.text}; }
      strong { color: ${palette.accent}; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Your AI Strategy Summary</h1>
        <p>Insights from your session with F.B/c</p>
      </div>

      <div class="content">
        <h2>Hello ${ctx.name || ctx.email}!</h2>
        <p>Thank you for exploring how AI can accelerate growth with F.B/c. Based on our conversation, I've prepared a personalized strategy summary for your team.</p>

        <div class="highlight">
          <h3>📋 What's inside:</h3>
          <ul>
            <li>Executive summary tailored to your goals</li>
            <li>Recommended AI roadmap with next steps</li>
            <li>Potential ROI opportunities we identified</li>
            <li>Key resources to review before our follow-up</li>
          </ul>
        </div>

        ${button}

        <p><strong>Ready for the next step?</strong></p>
        <a href="https://www.farzadbayat.com/contact" class="btn">Schedule a follow-up</a>

        <p>If questions pop up, reply directly to this email and I’ll get back to you quickly.</p>

        <p>Best regards,<br />
        <strong>Farzad Bayat</strong><br />
        Founder, F.B/c<br />
        AI Strategy & Implementation</p>
      </div>

      <div class="footer">
        <p>F.B/c - AI Consulting & Strategy</p>
        <p>www.farzadbayat.com | contact@farzadbayat.com</p>
      </div>
    </div>
  </body>
</html>`
}

export default finalizeLeadSession
