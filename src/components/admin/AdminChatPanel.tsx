'use client'

import { useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LiveChatMessages } from '@/components/agent-ui/app/LiveChatMessages'
import { useUnifiedChat } from '@/hooks/useUnifiedChat'
import type { Message as ChatMessage } from '@/types/core'

interface AdminChatPanelProps {
  collapsed?: boolean
  onToggle?: () => void
  className?: string
}

export function AdminChatPanel({ collapsed, onToggle, className }: AdminChatPanelProps) {
  // Initialize sessionId synchronously to avoid hook call with empty string
  const [resolvedSessionId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('fbc-session-id')
      if (stored && stored.trim().length > 0) return stored
    } catch {}
    try {
      const id = crypto.randomUUID()
      try { localStorage.setItem('fbc-session-id', id) } catch {}
      return id
    } catch {
      const id = `session-${Date.now()}`
      try { localStorage.setItem('fbc-session-id', id) } catch {}
      return id
    }
  })
  const [pendingInput, setPendingInput] = useState('')

  const chat = useUnifiedChat(
    useMemo(() => ({ sessionId: resolvedSessionId }), [resolvedSessionId])
  )

  const messages = chat.messages as ChatMessage[]

  const handleSend = useCallback(async () => {
    const text = pendingInput.trim()
    if (!text) return
    setPendingInput('')
    try {
      await chat.sendMessage(text)
    } catch (err) {
      // Non-fatal: message sending errors are surfaced in store/UI
      console.error('AdminChatPanel send failed', err)
    }
  }, [pendingInput, chat])

  if (collapsed) {
    return (
      <div className={className}>
        <Button variant="outline" size="sm" onClick={onToggle}>Open Chat</Button>
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex items-center justify-between space-y-0 py-3">
        <CardTitle className="text-base">Admin Chat</CardTitle>
        <Button variant="ghost" size="sm" onClick={onToggle} aria-label="Collapse chat">Hide</Button>
      </CardHeader>
      <CardContent className="flex h-[calc(100vh-220px)] flex-col gap-2 p-3">
        <div className="flex-1 overflow-y-auto rounded-md border p-2">
          <LiveChatMessages messages={messages} className="space-y-2" />
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={pendingInput}
            onChange={(e) => setPendingInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
          />
          <Button onClick={handleSend} disabled={!pendingInput.trim()}>Send</Button>
        </div>
      </CardContent>
    </Card>
  )
}


