import { preProcessIntent } from '@/core/agents/intent'
import type { ChatMessage } from '@/types/core'

const wrap = (content: string): ChatMessage[] => [
  { id: '1', role: 'system', content: 'sys', timestamp: new Date() },
  { id: '2', role: 'assistant', content: 'hi?', timestamp: new Date() },
  { id: '3', role: 'user', content, timestamp: new Date() },
]

describe('preProcessIntent', () => {
  it('detects booking intent', () => {
    const msgs = wrap("Let's book a call tomorrow")
    expect(preProcessIntent(msgs)).toBe('BOOKING')
  })

  it('detects exit intent (wrap up)', () => {
    const msgs = wrap("let's wrap this up")
    expect(preProcessIntent(msgs)).toBe('EXIT')
  })

  it('returns CONTINUE when no signal', () => {
    const msgs = wrap('Tell me more about options')
    expect(preProcessIntent(msgs)).toBe('CONTINUE')
  })
})
