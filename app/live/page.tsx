"use client"

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { AgentUIInterface } from '@/components/agent-ui/AgentUIInterface'
import { applyThemeVariant } from '@/lib/theme-utils'
import type { ThemeVariant } from '@/lib/theme-utils'

function LiveInner() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId') || undefined
  const forceTerms = (() => {
    const v = (searchParams.get('forceTerms') || '').toLowerCase()
    return v === '1' || v === 'true' || v === 'yes'
  })()

  // Apply theme either from query (?theme=) or from persisted preference
  useEffect(() => {
    const raw = (searchParams.get('theme') || '').toLowerCase()
    const allowed: ThemeVariant[] = [
      'orange-light',
      'orange-dark',
      'monochrome',
      'monochrome-dark',
      'monochrome-orange',
      'monochrome-orange-dark',
      'system',
    ]
    const fromQuery = allowed.find((t) => t === (raw as ThemeVariant))
    if (fromQuery) {
      try { localStorage.setItem('theme', fromQuery) } catch {}
      applyThemeVariant(fromQuery)
      return
    }
    // Fallback to persisted theme
    try {
      const saved = (localStorage.getItem('theme') || 'system') as ThemeVariant
      applyThemeVariant(saved)
    } catch {
      // As a final fallback, honor system
      applyThemeVariant('system')
    }
  }, [searchParams])
  return <AgentUIInterface sessionId={sessionId} forceTermsReset={forceTerms} />
}

export default function LivePage() {
  return (
    <Suspense fallback={null}>
      <LiveInner />
    </Suspense>
  )
}
