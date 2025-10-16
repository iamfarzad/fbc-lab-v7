import React from 'react'
import { cn } from '@/lib/utils'

interface BackendPillProps {
  voice: { connected: boolean; active?: boolean; error?: string | null }
  sse: { ready: boolean; streaming?: boolean; error?: string | null }
  className?: string
}

export function BackendPill({ voice, sse, className }: BackendPillProps) {
  const voiceText = voice.error
    ? 'Voice: Error'
    : voice.active
      ? 'Voice: Live'
      : voice.connected
        ? 'Voice: Connected'
        : 'Voice: Offline'

  const sseText = sse.error
    ? 'Chat: Error'
    : sse.streaming
      ? 'Chat: Streaming'
      : sse.ready
        ? 'Chat: Ready'
        : 'Chat: Idle'

  return (
    <div className={cn('inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-[11px]', className)}>
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', voice.error ? 'bg-red-500' : voice.active ? 'bg-emerald-500' : voice.connected ? 'bg-blue-500' : 'bg-muted-foreground/40')} />
      <span className="text-foreground/80">{voiceText}</span>
      <span className="mx-1 text-muted-foreground/40">•</span>
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', sse.error ? 'bg-red-500' : sse.streaming ? 'bg-amber-500' : sse.ready ? 'bg-blue-500' : 'bg-muted-foreground/40')} />
      <span className="text-foreground/80">{sseText}</span>
    </div>
  )
}

