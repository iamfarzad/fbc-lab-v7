import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { multimodalContextManager } from '@/src/core/context/multimodal-context'
import type { ChatAttachment } from '@/types/attachments'

const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB limit to protect memory usage

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb * 10) / 10} KB`
  const mb = kb / 1024
  return `${Math.round(mb * 10) / 10} MB`
}

function bufferToDataUrl(mimeType: string, buffer: Buffer): string {
  const safeMime = mimeType || 'application/octet-stream'
  const base64 = buffer.toString('base64')
  return `data:${safeMime};base64,${base64}`
}

function buildPrompt(attachments: ChatAttachment[]): string {
  if (attachments.length === 0) return ''
  const lines = attachments.map((attachment, index) => {
    const summarySnippet = attachment.summary ? `\nSummary preview: ${attachment.summary}` : ''
    const pagesInfo = attachment.pages ? ` (${attachment.pages} page${attachment.pages === 1 ? '' : 's'})` : ''
    return `Attachment ${index + 1}: ${attachment.name} [${attachment.type || 'unknown'}, ${formatSize(attachment.size)}${pagesInfo}]\n${attachment.analysis}.${summarySnippet}`
  })

  return `I have uploaded additional reference material for context. Please review the attachments below:\n\n${lines.join('\n\n')}`
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const sessionId = formData.get('sessionId')

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
      return NextResponse.json({ ok: false, error: 'Missing sessionId' }, { status: 400 })
    }

    const incoming = formData.getAll('files')
    const files = incoming.filter((item): item is File => item instanceof File)

    if (files.length === 0) {
      return NextResponse.json({ ok: false, error: 'No files uploaded' }, { status: 400 })
    }

    const attachmentSummaries: ChatAttachment[] = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({
          ok: false,
          error: `File ${file.name} exceeds the ${formatSize(MAX_FILE_SIZE)} limit`
        }, { status: 413 })
      }

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const mimeType = file.type || 'application/octet-stream'
      const id = randomUUID()
      const uploadedAt = new Date().toISOString()

      let analysis = `File uploaded (${formatSize(file.size)}).`
      let summary: string | undefined
      let pages: number | undefined
      let dataUrl: string | undefined

      if (mimeType.startsWith('image/')) {
        analysis = `Image attachment ready for visual analysis.`
        dataUrl = bufferToDataUrl(mimeType, buffer)
      } else if (mimeType === 'application/pdf') {
        try {
          const pdfDoc = await PDFDocument.load(buffer)
          pages = pdfDoc.getPageCount()
          analysis = `PDF document with ${pages} page${pages === 1 ? '' : 's'} (${formatSize(file.size)}).`
        } catch (error) {
          console.warn('Failed to parse PDF for summary', error)
          analysis = `PDF document (${formatSize(file.size)}).`
        }
        dataUrl = bufferToDataUrl(mimeType, buffer)
      } else if (mimeType.startsWith('text/')) {
        const text = buffer.toString('utf-8').trim()
        summary = text.substring(0, 500).replace(/\s+/g, ' ')
        analysis = `Text document with approximately ${text.length} characters.`
        dataUrl = bufferToDataUrl(mimeType, buffer)
      } else if (mimeType.startsWith('audio/')) {
        analysis = `Audio file uploaded (${formatSize(file.size)}). Ready for transcription.`
        dataUrl = bufferToDataUrl(mimeType, buffer)
      } else {
        analysis = `File uploaded (${mimeType || 'unknown type'}) with size ${formatSize(file.size)}.`
        dataUrl = bufferToDataUrl(mimeType, buffer)
      }

      await multimodalContextManager.addUploadEntry(sessionId, {
        id,
        filename: file.name,
        mimeType,
        size: file.size,
        analysis,
        summary,
        dataUrl,
        pages
      })

      attachmentSummaries.push({
        id,
        name: file.name,
        type: mimeType,
        size: file.size,
        url: dataUrl,
        analysis,
        summary,
        pages,
        uploadedAt
      })
    }

    const prompt = buildPrompt(attachmentSummaries)

    return NextResponse.json({
      ok: true,
      attachments: attachmentSummaries,
      prompt
    })
  } catch (error) {
    console.error('Attachment upload failed', error)
    return NextResponse.json({ ok: false, error: 'Failed to process attachments' }, { status: 500 })
  }
}
