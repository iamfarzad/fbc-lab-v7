import { useEffect, useState } from 'react'
import type { LiveClientWS } from '@/core/live/client'
import { cn } from '@/lib/utils'

export function LiveStatusBadge({ client, className }: { client: LiveClientWS; className?: string }) {
  const [wsOpen, setWsOpen] = useState(false)
  const [sessionActive, setSessionActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const off = [
      client.on('open', () => { setWsOpen(true); setError(null) }),
      client.on('close', () => { setWsOpen(false); setSessionActive(false) }),
      client.on('error', (m) => setError(m)),
      client.on('session_started', () => setSessionActive(true)),
      client.on('session_closed', () => setSessionActive(false)),
    ]
    return () => { off.forEach((fn) => fn()) }
  }, [client])

  const color = error ? 'bg-red-500' : sessionActive ? 'bg-emerald-500' : wsOpen ? 'bg-amber-500' : 'bg-muted-foreground/50'
  const label = error ? 'live: error' : sessionActive ? 'live: active' : wsOpen ? 'live: connected' : 'live: idle'

  return (
    <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)} title={label} aria-label={label}>
      <span className={cn('inline-block h-2 w-2 rounded-full', color)} />
      <span className="hidden sm:inline">{label}</span>
    </div>
  )
}

