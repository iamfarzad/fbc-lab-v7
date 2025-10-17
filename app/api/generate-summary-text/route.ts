import { NextRequest, NextResponse } from 'next/server'
import { respond } from '@/lib/api/response'
import { multimodalContextManager } from '@/core/context/multimodal-context'
import { walLog } from '@/core/context/write-ahead-log'

/**
 * Generate conversation summary as markdown text for inline display
 * Used to render summary as artifact before PDF generation
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()

    if (!sessionId) {
      return respond.badRequest('Missing sessionId')
    }

    // Flush WAL to ensure all data is synced
    console.log('🔄 Flushing WAL before summary generation...')
    await walLog.flushSession(sessionId)

    // Load multimodal context
    console.log('📦 Loading multimodal context...')
    const context = await multimodalContextManager.getConversationContext(
      sessionId,
      true, // include visual
      true  // include audio
    )

    // Build markdown summary
    const summary = `# Conversation Summary

## Lead Information
- **Name:** ${context.summary.totalMessages > 0 ? (await multimodalContextManager.getContext(sessionId))?.leadContext.name || 'Unknown' : 'Unknown'}
- **Email:** ${(await multimodalContextManager.getContext(sessionId))?.leadContext.email || 'Unknown'}
- **Company:** ${(await multimodalContextManager.getContext(sessionId))?.leadContext.company || 'Not provided'}

## Session Overview
- **Modalities Used:** ${context.summary.modalitiesUsed.join(', ')}
- **Total Interactions:** ${context.summary.totalMessages}
- **Duration:** ${context.summary.lastActivity ? new Date(context.summary.lastActivity).toLocaleString() : 'N/A'}

${context.summary.recentAudioEntries > 0 ? `
## Voice Conversation Highlights

We discussed the following topics via voice:

${context.audioContext
  .filter(t => t.type === 'voice_input' && t.data.transcript && t.data.isFinal)
  .slice(-5)
  .map((t, i) => `${i + 1}. ${t.data.transcript}`)
  .join('\n')}
` : ''}

${context.summary.recentVisualAnalyses > 0 ? `
## Visual Context Analyzed

During our session, we reviewed:

${(() => {
  const grouped = context.visualContext.reduce((acc, v) => {
    acc[v.type] = (acc[v.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return Object.entries(grouped)
    .map(([type, count]) => `- **${type.charAt(0).toUpperCase() + type.slice(1)}:** ${count} capture${count > 1 ? 's' : ''}`)
    .join('\n')
})()}

**Sample Analyses:**
${context.visualContext.slice(-3).map((v) => `- [${v.type}] ${v.analysis.substring(0, 150)}...`).join('\n')}
` : ''}

${context.summary.recentUploads > 0 ? `
## Documents Shared

You shared the following documents:

${context.uploadContext.map((u, i) => {
  const sizeKB = Math.round(u.size / 1024)
  const pageInfo = u.pages ? ` (${u.pages} page${u.pages > 1 ? 's' : ''})` : ''
  return `${i + 1}. **${u.filename}** - ${sizeKB}KB${pageInfo}\n   ${u.analysis}`
}).join('\n\n')}
` : ''}

## Conversation Highlights

${context.conversationHistory
  .filter(e => e.metadata?.type !== 'summary' && e.content.length > 50)
  .slice(-10)
  .map((e) => {
    const speaker = e.metadata?.speaker === 'user' ? 'You' : 'F.B/c AI'
    return `**${speaker}:** ${e.content.substring(0, 200)}${e.content.length > 200 ? '...' : ''}`
  })
  .join('\n\n')}

---

## What Happens Next

This summary will be saved as a PDF document. After you download or receive it via email:

### Data Retained (for follow-up purposes):
- ✅ PDF summary document
- ✅ Your contact information (name, email, company)
- ✅ Audit trail of our interaction

### Data Permanently Deleted (GDPR compliance):
- 🗑️ Voice transcripts and audio data
- 🗑️ Screen share captures and analyses
- 🗑️ Webcam captures
- 🗑️ Original uploaded files
- 🗑️ Raw chat messages

Your data will be handled according to our [Privacy Policy](/docs/privacy-policy) and retained for 90 days, after which it will be automatically deleted.

You have the right to request immediate deletion at any time by contacting **privacy@farzadbayat.com**.
`

    return NextResponse.json({ 
      summary,
      metadata: {
        sessionId,
        totalMessages: context.summary.totalMessages,
        modalitiesUsed: context.summary.modalitiesUsed,
        leadEmail: (await multimodalContextManager.getContext(sessionId))?.leadContext.email
      }
    })
  } catch (error) {
    console.error('Summary generation failed:', error)
    return respond.error('Failed to generate summary', 500)
  }
}

