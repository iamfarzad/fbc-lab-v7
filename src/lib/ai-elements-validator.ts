import type { Message } from '@/types/core'

export function validateAIElementMetadata(messages: Message[]) {
  if (typeof window === 'undefined') return
  const issues: string[] = []
  for (const m of messages) {
    if (m.role !== 'assistant') continue
    const md = m.metadata || {}
    if (md.sources && !Array.isArray(md.sources)) {
      issues.push(`Message ${m.id}: metadata.sources is not an array`)
    }
    if (md.artifacts && !Array.isArray(md.artifacts)) {
      issues.push(`Message ${m.id}: metadata.artifacts is not an array`)
    }
    if (md.codeBlocks && !Array.isArray(md.codeBlocks)) {
      issues.push(`Message ${m.id}: metadata.codeBlocks is not an array`)
    }
    if (md.inlineCitations && !Array.isArray(md.inlineCitations)) {
      issues.push(`Message ${m.id}: metadata.inlineCitations is not an array`)
    }
    if ((md as any).reasoning && typeof (md as any).reasoning !== 'string') {
      issues.push(`Message ${m.id}: metadata.reasoning should be a string when present`)
    }
  }
  if (issues.length) {
     
    console.warn('[AI-Elements] Metadata validation warnings:', issues)
  }
}

