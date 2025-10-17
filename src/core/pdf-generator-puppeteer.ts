import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import puppeteer from 'puppeteer'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

interface ResearchHighlight {
  messageId: string
  timestamp: string | Date
  query?: string
  combinedAnswer?: string
  urlsUsed?: string[]
  citationCount?: number
  searchGroundingUsed?: number
  urlContextUsed?: number
  error?: string
}

interface ArtifactInsight {
  id: string
  type: string
  status?: string
  payload?: Record<string, any> | null
  createdAt?: number
  updatedAt?: number
  version?: number
  error?: string
}

interface SummaryData {
  leadInfo: {
    name: string
    email: string
    company?: string
    role?: string
  }
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: string
  }>
  leadResearch?: {
    conversation_summary?: string
    consultant_brief?: string
    lead_score?: number
    ai_capabilities_shown?: string
  }
  sessionId: string
  researchHighlights?: ResearchHighlight[]
  artifactInsights?: ArtifactInsight[]
  multimodalContext?: {
    visualAnalyses: Array<{
      id: string
      timestamp: string
      type: 'webcam' | 'screen' | 'upload'
      analysis: string
    }>
    voiceTranscripts: Array<{
      id: string
      timestamp: string
      type: 'voice_input' | 'voice_output' | 'voice_transcript'
      data: { transcript?: string; isFinal?: boolean }
    }>
    uploadedFiles: Array<{
      id: string
      filename: string
      mimeType: string
      size: number
      analysis: string
      pages?: number
    }>
    summary: {
      totalMessages: number
      modalitiesUsed: string[]
      recentVisualAnalyses: number
      recentAudioEntries: number
      recentUploads: number
    }
  }
}

type Mode = 'client' | 'internal'

interface ConversationPair {
  user: { content: string; timestamp: string }
  assistant?: { content: string; timestamp: string }
}

/**
 * Lightweight text helper until the Gemini translator is migrated.
 */
async function translateText(text: string) {
  return text
}

export async function generatePdfWithPuppeteer(
  summaryData: SummaryData,
  outputPath: string,
  mode: Mode = 'client',
  language: string = 'en'
): Promise<Uint8Array> {
  const usePdfLib = process.env.PDF_USE_PDFLIB === 'true'

  if (!usePdfLib) {
    try {
      const browser = await puppeteer.launch({
        headless: 'new' as any,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      })

      try {
        const page = await browser.newPage()
        const htmlContent = await generateHtmlContent(summaryData, mode, language)
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 })
        await page.pdf({
          path: outputPath,
          format: 'A4',
          margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
          printBackground: true,
          preferCSSPageSize: true
        })
        return new Uint8Array()
      } finally {
        await browser.close()
      }
    } catch (error) {
      console.error('Puppeteer failed, falling back to pdf-lib:', (error as any)?.message || error)
    }
  }

  return await generatePdfWithPdfLib(summaryData, outputPath)
}

async function generatePdfWithPdfLib(
  summaryData: SummaryData,
  outputPath: string
) {
  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([595.28, 841.89])
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier)
  const marginX = 40
  const lineHeight = 14
  let cursorY = 800

  const ensureRoom = () => {
    if (cursorY < 80) {
      page = pdfDoc.addPage([595.28, 841.89])
      cursorY = 800
    }
  }

  const writeLine = (text: string, size = 11, bold = false, isOrange = false) => {
    const textColor = isOrange 
      ? rgb(1.0, 0.356, 0.016)    // F.B/c Orange
      : rgb(0.067, 0.094, 0.157)  // Dark slate
    
    page.drawText(text, {
      x: marginX,
      y: cursorY,
      size,
      font: bold ? boldFont : regularFont,
      color: textColor
    })
    cursorY -= lineHeight * 1.2
    ensureRoom()
  }

  const toPrintable = (value: unknown) => {
    if (value == null) return ''
    if (typeof value === 'string') return sanitizeTextForPdf(value)
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    try {
      return sanitizeTextForPdf(JSON.stringify(value, null, 2))
    } catch {
      return '[unserializable payload]'
    }
  }

  // Draw F.B/c logo with orange 'c'
  page.drawText('F.B/', {
    x: marginX,
    y: cursorY,
    size: 24,
    font: monoFont,
    color: rgb(0.067, 0.094, 0.157) // Dark
  })
  page.drawText('c', {
    x: marginX + 52, // Adjust based on character width
    y: cursorY,
    size: 24,
    font: monoFont,
    color: rgb(1.0, 0.356, 0.016) // F.B/c Orange
  })
  cursorY -= 28
  writeLine('AI Consulting & Strategy', 12)
  cursorY -= 8

  writeLine('LEAD INFORMATION', 14, true, true)
  writeLine(`Name: ${summaryData.leadInfo.name || 'Unknown'}`)
  writeLine(`Email: ${summaryData.leadInfo.email || 'Unknown'}`)
  if (summaryData.leadInfo.company) writeLine(`Company: ${summaryData.leadInfo.company}`)
  if (summaryData.leadInfo.role) writeLine(`Role: ${summaryData.leadInfo.role}`)
  writeLine(`Session ID: ${summaryData.sessionId}`)
  cursorY -= 6

  if (summaryData.leadResearch?.conversation_summary) {
    writeLine('EXECUTIVE SUMMARY', 14, true, true)
    await writeParagraph(summaryData.leadResearch.conversation_summary)
    cursorY -= 4
  }

  if (summaryData.leadResearch?.consultant_brief) {
    writeLine('CONSULTANT BRIEF', 14, true, true)
    await writeParagraph(summaryData.leadResearch.consultant_brief)
    cursorY -= 4
  }

  // NEW: Multimodal Context Section
  if (summaryData.multimodalContext) {
    const mc = summaryData.multimodalContext
    
    if (mc.summary.modalitiesUsed.length > 0) {
      writeLine('MULTIMODAL INTERACTIONS', 14, true, true)
      writeLine(`Modalities Used: ${mc.summary.modalitiesUsed.join(', ')}`)
      writeLine(`Total Messages: ${mc.summary.totalMessages}`)
      cursorY -= 4
    }

    // Voice Transcripts Summary
    if (mc.voiceTranscripts.length > 0) {
      writeLine('Voice Conversation Excerpts', 12, true)
      const userTranscripts = mc.voiceTranscripts
        .filter(t => t.type === 'voice_input' && t.data.transcript && t.data.isFinal)
        .slice(-5) // Last 5 user voice inputs
      
      for (const transcript of userTranscripts) {
        if (transcript.data.transcript) {
          writeLine(`[Voice] ${new Date(transcript.timestamp).toLocaleTimeString()}`, 10)
          await writeParagraph(shortenText(transcript.data.transcript, 200))
          cursorY -= 2
        }
      }
      cursorY -= 4
    }

    // Visual Analyses Summary
    if (mc.visualAnalyses.length > 0) {
      writeLine('Visual Context Analyzed', 12, true)
      const grouped = mc.visualAnalyses.reduce((acc, v) => {
        acc[v.type] = (acc[v.type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(grouped).forEach(([type, count]) => {
        writeLine(`${type.charAt(0).toUpperCase() + type.slice(1)}: ${count} captures`)
      })
      
      // Show sample analyses
      const recent = mc.visualAnalyses.slice(-3)
      for (const analysis of recent) {
        writeLine(`[${analysis.type}] ${new Date(analysis.timestamp).toLocaleTimeString()}`, 10)
        await writeParagraph(shortenText(analysis.analysis, 150))
        cursorY -= 2
      }
      cursorY -= 4
    }

    // Uploaded Files
    if (mc.uploadedFiles.length > 0) {
      writeLine('Documents Shared', 12, true)
      for (const file of mc.uploadedFiles) {
        const sizeKB = Math.round(file.size / 1024)
        const pageInfo = file.pages ? ` (${file.pages} pages)` : ''
        writeLine(`${file.filename} - ${sizeKB}KB${pageInfo}`, 10)
        if (file.analysis) {
          await writeParagraph(shortenText(file.analysis, 100))
        }
        cursorY -= 2
      }
      cursorY -= 4
    }
  }

  const conversationPairs = buildConversationPairs(summaryData.conversationHistory)
  if (conversationPairs.length > 0) {
    writeLine('CONVERSATION HIGHLIGHTS', 14, true, true)
    for (const pair of conversationPairs.slice(-6)) {
      writeLine('You', 11, true)
      await writeParagraph(shortenText(pair.user.content))
      if (pair.assistant?.content) {
        writeLine('F.B/c', 11, true)
        await writeParagraph(shortenText(pair.assistant.content))
      }
      cursorY -= 6
    }
  }

  if (summaryData.researchHighlights && summaryData.researchHighlights.length > 0) {
    writeLine('RESEARCH HIGHLIGHTS', 14, true, true)
    for (const [index, highlight] of summaryData.researchHighlights.entries()) {
      const label = highlight.query ? `Query: ${highlight.query}` : `Insight ${index + 1}`
      writeLine(label, 11, true)
      if (highlight.combinedAnswer) {
        await writeParagraph(highlight.combinedAnswer)
      }
      if (highlight.urlsUsed && highlight.urlsUsed.length > 0) {
        writeLine('Sources:', 11, true)
        for (const url of highlight.urlsUsed) {
          writeLine(`• ${url}`)
        }
      }
      const metrics: string[] = []
      if (typeof highlight.citationCount === 'number') {
        metrics.push(`Citations: ${highlight.citationCount}`)
      }
      if (typeof highlight.searchGroundingUsed === 'number') {
        metrics.push(`Search Grounding: ${highlight.searchGroundingUsed}`)
      }
      if (typeof highlight.urlContextUsed === 'number') {
        metrics.push(`URL Context: ${highlight.urlContextUsed}`)
      }
      if (metrics.length > 0) {
        writeLine(metrics.join(' • '))
      }
      if (highlight.error) {
        writeLine(`Note: ${highlight.error}`)
      }
      cursorY -= 4
    }
  }

  if (summaryData.artifactInsights && summaryData.artifactInsights.length > 0) {
    writeLine('GENERATED ARTIFACTS', 14, true, true)
    for (const artifact of summaryData.artifactInsights) {
      const heading = `${artifact.type || 'Artifact'} ${artifact.status ? `(${artifact.status})` : ''}`.trim()
      writeLine(heading, 11, true)
      if (artifact.error) {
        writeLine(`Error: ${artifact.error}`)
      }
      if (artifact.payload) {
        const preview = toPrintable(artifact.payload)
        if (preview) {
          await writeParagraph(preview.length > 2000 ? `${preview.slice(0, 2000)}…` : preview)
        }
      }
      cursorY -= 4
    }
  }

  cursorY = Math.max(cursorY, 60)
  // Footer with F.B/c logo
  page.drawText('F.B/', {
    x: marginX,
    y: 50,
    size: 10,
    font: monoFont,
    color: rgb(0.42, 0.45, 0.5)
  })
  page.drawText('c', {
    x: marginX + 22,
    y: 50,
    size: 10,
    font: monoFont,
    color: rgb(1.0, 0.356, 0.016) // F.B/c Orange
  })
  page.drawText(' • AI Consulting & Strategy', {
    x: marginX + 32,
    y: 50,
    size: 10,
    font: regularFont,
    color: rgb(0.42, 0.45, 0.5)
  })
  page.drawText('www.farzadbayat.com', {
    x: marginX,
    y: 36,
    size: 10,
    font: regularFont,
    color: rgb(1.0, 0.356, 0.016) // F.B/c Orange
  })

  const pdfBytes = await pdfDoc.save()
  
  // In serverless environments (like Vercel), we can't write to filesystem
  // Instead, we'll return the PDF bytes directly for email attachment
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    // Store PDF bytes in memory or return them directly
    return pdfBytes
  } else {
    // Only write to filesystem in development
    await fs.promises.writeFile(outputPath, pdfBytes)
    return pdfBytes
  }

  async function writeParagraph(text: string, size = 11) {
    const translated = await translateText(text)
    const maxWidth = 595.28 - marginX * 2
    const words = translated.split(/\s+/)
    let line = ''

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      const width = regularFont.widthOfTextAtSize(testLine, size)
      if (width > maxWidth) {
        page.drawText(line, {
          x: marginX,
          y: cursorY,
          size,
          font: regularFont,
          color: rgb(0.28, 0.32, 0.35)
        })
        cursorY -= lineHeight
        ensureRoom()
        line = word
      } else {
        line = testLine
      }
    }

    if (line) {
      page.drawText(line, {
        x: marginX,
        y: cursorY,
        size,
        font: regularFont,
        color: rgb(0.28, 0.32, 0.35)
      })
      cursorY -= lineHeight
      ensureRoom()
    }
  }
}

export function generatePdfPath(sessionId: string, leadName: string) {
  const sanitizedName = leadName.replace(/[^a-zA-Z0-9]/g, '_') || 'lead'
  const timestamp = new Date().toISOString().split('T')[0]
  
  // In serverless environments, we don't use file paths
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    return `FB-c_Summary_${sanitizedName}_${timestamp}_${sessionId}.pdf`
  } else {
    return `/tmp/FB-c_Summary_${sanitizedName}_${timestamp}_${sessionId}.pdf`
  }
}

export function sanitizeTextForPdf(text: string) {
  return text
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function generateHtmlContent(summaryData: SummaryData, _mode: Mode, language: string) {
  const leadName = summaryData.leadInfo.name || 'Valued Client'
  const translatedSummary = await translateText(summaryData.leadResearch?.conversation_summary || '')
  const translatedBrief = await translateText(summaryData.leadResearch?.consultant_brief || '')
  const conversationPairs = buildConversationPairs(summaryData.conversationHistory)

  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const toPrintableHtml = (value: unknown) => {
    if (value == null) return ''
    if (typeof value === 'string') return sanitizeTextForPdf(value)
    if (value instanceof Date) return value.toISOString()
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }
    try {
      return sanitizeTextForPdf(JSON.stringify(value, null, 2))
    } catch {
      return '[unserializable payload]'
    }
  }

  const researchSection = (summaryData.researchHighlights && summaryData.researchHighlights.length > 0)
    ? `<section class="section">
      <h2>Research Highlights</h2>
      ${summaryData.researchHighlights.slice(0, 3).map((highlight, index) => {
        const sources = Array.isArray(highlight.urlsUsed)
          ? `<ul>${highlight.urlsUsed.slice(0, 5).map(url => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a></li>`).join('')}</ul>`
          : ''
        const metrics = [
          typeof highlight.citationCount === 'number' ? `Citations: ${highlight.citationCount}` : '',
          typeof highlight.searchGroundingUsed === 'number' ? `Search Grounding: ${highlight.searchGroundingUsed}` : '',
          typeof highlight.urlContextUsed === 'number' ? `URL Context: ${highlight.urlContextUsed}` : ''
        ].filter(Boolean).join(' • ')
        const answer = highlight.combinedAnswer ? `<p>${escapeHtml(shortenText(highlight.combinedAnswer))}</p>` : ''
        const metricBlock = metrics ? `<p><strong>${metrics}</strong></p>` : ''
        const note = highlight.error ? `<p>Note: ${escapeHtml(highlight.error)}</p>` : ''
        return `<article>
          <h3>${escapeHtml(highlight.query || `Insight ${index + 1}`)}</h3>
          ${answer}
          ${metricBlock}
          ${sources}
          ${note}
        </article>`
      }).join('')}
    </section>`
    : ''

  const artifactsSection = (summaryData.artifactInsights && summaryData.artifactInsights.length > 0)
    ? `<section class="section">
      <h2>Generated Artifacts</h2>
      ${summaryData.artifactInsights.map((artifact) => {
        const payloadPreview = artifact.payload
          ? escapeHtml(toPrintableHtml(artifact.payload))
          : 'No payload data'
        const status = artifact.status ? `<p><strong>Status:</strong> ${escapeHtml(artifact.status)}</p>` : ''
        const error = artifact.error ? `<p><strong>Error:</strong> ${escapeHtml(artifact.error)}</p>` : ''
        return `<article>
          <h3>${escapeHtml(artifact.type || 'Artifact')}</h3>
          ${status}
          ${error}
          <pre>${payloadPreview}</pre>
        </article>`
      }).join('')}
    </section>`
    : ''

  const palette = {
    background: '#ffffff',
    surface: '#f8f9fa',
    border: '#e5e7eb',
    text: '#111827',
    heading: '#0f172a',
    muted: '#6b7280',
    accent: '#ff5b04',      // F.B/c Orange
    accentText: '#ffffff',
    highlight: '#fff7ed'
  } as const

  const conversationSection = conversationPairs.length > 0
    ? `<section class="section">
        <h2>Conversation Highlights</h2>
        ${conversationPairs.slice(-6).map((pair) => `
          <article>
            <p><strong>You:</strong> ${escapeHtml(shortenText(pair.user.content))}</p>
            ${pair.assistant?.content ? `<p><strong>F.B/c:</strong> ${escapeHtml(shortenText(pair.assistant.content))}</p>` : ''}
          </article>
        `).join('')}
      </section>`
    : ''

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Strategy Summary</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap');
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: ${palette.text}; margin: 0; background: ${palette.background}; }
    .container { max-width: 720px; margin: 0 auto; padding: 32px; }
    .header { background: linear-gradient(135deg, #ff5b04 0%, #ff8040 100%); color: white; padding: 40px; border-radius: 16px; text-align: center; box-shadow: 0 4px 6px rgba(255, 91, 4, 0.1); }
    .logo { font-family: 'JetBrains Mono', monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.1em; margin-bottom: 8px; }
    .logo .orange-c { color: #ff5b04; background: white; padding: 2px 6px; border-radius: 4px; }
    .section { margin-top: 24px; padding: 24px; border-radius: 12px; background: white; border: 1px solid ${palette.border}; border-left: 4px solid #ff5b04; }
    h1 { margin: 0 0 12px; font-size: 28px; color: white; font-weight: 700; }
    h2 { margin: 0 0 16px; font-size: 20px; color: #ff5b04; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    h3 { color: #ff5b04; font-weight: 600; }
    p { margin: 0 0 12px; color: ${palette.text}; }
    ul { margin: 0 0 12px 20px; padding: 0; color: ${palette.text}; }
    li { margin-bottom: 6px; }
    a { color: #ff5b04; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    strong { color: #ff5b04; }
    pre { background: ${palette.highlight}; color: ${palette.text}; padding: 16px; border-radius: 8px; border: 1px solid ${palette.border}; font-family: 'JetBrains Mono', monospace; white-space: pre-wrap; }
    .footer { margin-top: 32px; text-align: center; padding: 24px; background: ${palette.surface}; border-radius: 12px; font-size: 14px; color: ${palette.muted}; }
    .badge { display: inline-block; padding: 8px 16px; border-radius: 999px; background: rgba(255, 255, 255, 0.2); color: white; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="logo">F.B/<span class="orange-c">c</span></div>
      <div class="badge">AI Consulting & Strategy</div>
      <h1>Summary for ${leadName}</h1>
      <p>Prepared by Farzad Bayat • Session ${summaryData.sessionId}</p>
    </header>

    <section class="section">
      <h2>Executive Summary</h2>
      <p>${translatedSummary || 'Our AI analysis session is complete. Review the details below for tailored insights.'}</p>
    </section>

    <section class="section">
      <h2>Consultant Brief</h2>
      <p>${translatedBrief || 'We have compiled the key findings and recommendations for your team.'}</p>
    </section>

    ${conversationSection}

    ${researchSection}

    ${artifactsSection}

    <footer class="footer">
      <p style="font-family: 'JetBrains Mono', monospace;">F.B/<span style="color: #ff5b04;">c</span> • AI Consulting & Strategy</p>
      <p style="margin-top: 8px;"><a href="https://www.farzadbayat.com">www.farzadbayat.com</a></p>
    </footer>
  </div>
</body>
</html>`
}

export function resolveAssetPath(relativePath: string) {
  // Use __dirname in CommonJS environments (Jest) or compute it from import.meta.url in ESM
  let currentDir: string
  
  if (typeof __dirname !== 'undefined') {
    // CommonJS environment (Jest)
    currentDir = __dirname
  } else if (typeof import.meta !== 'undefined' && import.meta.url) {
    // ESM environment
    const currentModuleUrl = import.meta.url
    const currentFilePath = fileURLToPath(currentModuleUrl)
    currentDir = path.dirname(currentFilePath)
  } else {
    // Fallback
    currentDir = process.cwd()
  }
  
  return path.resolve(currentDir, relativePath)
}

function buildConversationPairs(history: SummaryData['conversationHistory'] = []): ConversationPair[] {
  const pairs: ConversationPair[] = []
  let pendingUser: { content: string; timestamp: string } | null = null

  for (const entry of history) {
    const trimmed = entry.content?.trim()
    if (!trimmed) continue

    if (entry.role === 'user') {
      pendingUser = { content: trimmed, timestamp: entry.timestamp }
    } else if (entry.role === 'assistant') {
      if (pendingUser) {
        pairs.push({ user: pendingUser, assistant: { content: trimmed, timestamp: entry.timestamp } })
        pendingUser = null
      } else if (pairs.length > 0) {
        const last = pairs[pairs.length - 1]
        if (!last.assistant) {
          last.assistant = { content: trimmed, timestamp: entry.timestamp }
        }
      }
    }
  }

  if (pendingUser) {
    pairs.push({ user: pendingUser })
  }

  return pairs
}

function shortenText(text: string, sentenceLimit = 2): string {
  if (!text) return ''
  const sanitized = text.replace(/\s+/g, ' ').trim()
  const sentenceEnd = /[.!?] +/g
  const sentences: string[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = sentenceEnd.exec(sanitized)) !== null && sentences.length < sentenceLimit - 1) {
    sentences.push(sanitized.slice(lastIndex, match.index + 1).trim())
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < sanitized.length && sentences.length < sentenceLimit) {
    sentences.push(sanitized.slice(lastIndex).trim())
  }

  return sentences.join(' ')
}
