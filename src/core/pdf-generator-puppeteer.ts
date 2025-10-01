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
}

type Mode = 'client' | 'internal'

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
        return
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
  const marginX = 40
  const lineHeight = 14
  let cursorY = 800

  const ensureRoom = () => {
    if (cursorY < 80) {
      page = pdfDoc.addPage([595.28, 841.89])
      cursorY = 800
    }
  }

  const writeLine = (text: string, size = 11, bold = false) => {
    page.drawText(text, {
      x: marginX,
      y: cursorY,
      size,
      font: bold ? boldFont : regularFont,
      color: rgb(0.1, 0.1, 0.1)
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

  writeLine('F.B/c AI Consulting', 20, true)
  writeLine('AI-Powered Lead Summary', 12)
  cursorY -= 8

  writeLine('Lead Information', 14, true)
  writeLine(`Name: ${summaryData.leadInfo.name || 'Unknown'}`)
  writeLine(`Email: ${summaryData.leadInfo.email || 'Unknown'}`)
  if (summaryData.leadInfo.company) writeLine(`Company: ${summaryData.leadInfo.company}`)
  if (summaryData.leadInfo.role) writeLine(`Role: ${summaryData.leadInfo.role}`)
  writeLine(`Session ID: ${summaryData.sessionId}`)
  cursorY -= 6

  if (summaryData.leadResearch?.conversation_summary) {
    writeLine('Executive Summary', 14, true)
    await writeParagraph(summaryData.leadResearch.conversation_summary)
    cursorY -= 4
  }

  if (summaryData.leadResearch?.consultant_brief) {
    writeLine('Consultant Brief', 14, true)
    await writeParagraph(summaryData.leadResearch.consultant_brief)
    cursorY -= 4
  }

  if (summaryData.researchHighlights && summaryData.researchHighlights.length > 0) {
    writeLine('Research Highlights', 14, true)
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
    writeLine('Generated Artifacts', 14, true)
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
  page.drawText('Farzad Bayat — AI Consulting Specialist', {
    x: marginX,
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
    color: rgb(0.98, 0.75, 0.14)
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

async function generateHtmlContent(summaryData: SummaryData, mode: Mode, language: string) {
  const leadName = summaryData.leadInfo.name || 'Valued Client'
  const translatedSummary = await translateText(summaryData.leadResearch?.conversation_summary || '')
  const translatedBrief = await translateText(summaryData.leadResearch?.consultant_brief || '')

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
      ${summaryData.researchHighlights.map((highlight, index) => {
        const sources = Array.isArray(highlight.urlsUsed)
          ? `<ul>${highlight.urlsUsed.map(url => `<li><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a></li>`).join('')}</ul>`
          : ''
        const metrics = [
          typeof highlight.citationCount === 'number' ? `Citations: ${highlight.citationCount}` : '',
          typeof highlight.searchGroundingUsed === 'number' ? `Search Grounding: ${highlight.searchGroundingUsed}` : '',
          typeof highlight.urlContextUsed === 'number' ? `URL Context: ${highlight.urlContextUsed}` : ''
        ].filter(Boolean).join(' • ')
        const answer = highlight.combinedAnswer ? `<p>${escapeHtml(highlight.combinedAnswer)}</p>` : ''
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

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Strategy Summary</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #0b1220; margin: 0; }
    .container { max-width: 720px; margin: 0 auto; padding: 32px; }
    .header { background: linear-gradient(135deg, #ff5b04 0%, #ff7f11 100%); color: white; padding: 32px; border-radius: 16px; }
    .section { margin-top: 32px; padding: 24px; border-radius: 12px; background: #f7f9fb; }
    h1 { margin: 0 0 12px; font-size: 28px; }
    h2 { margin: 0 0 16px; font-size: 20px; color: #14203b; }
    p { margin: 0 0 12px; }
    ul { margin: 0 0 12px 20px; padding: 0; }
    .footer { margin-top: 32px; text-align: center; font-size: 14px; color: #4b5563; }
    .badge { display: inline-block; padding: 8px 16px; border-radius: 999px; background: rgba(255, 91, 4, 0.1); color: #ff5b04; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <div class="badge">Personalized AI Strategy</div>
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

    ${researchSection}

    ${artifactsSection}

    <footer class="footer">
      <p>F.B/c • AI Consulting & Strategy • www.farzadbayat.com</p>
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
