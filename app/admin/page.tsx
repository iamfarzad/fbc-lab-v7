'use client'

// eslint-disable-next-line react-refresh/only-export-components
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { LiveApiProvider } from '@/hooks/LiveApiProvider'

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const response = await fetch('/api/admin/stats', {
          credentials: 'include'
        })

        if (response.ok) {
          setIsAuthenticated(true)
        } else {
          router.push('/admin/login')
        }
      } catch (error) {
        console.error('Admin auth check failed', error)
        router.push('/admin/login')
      } finally {
        setIsLoading(false)
      }
    }

    void verifyAccess()
  }, [router])

  useEffect(() => {
    // Resolve a stable session id for Live API/Agent UI usage
    const resolved = (() => {
      try {
        const stored = localStorage.getItem('fbc-session-id')
        if (stored && stored.trim().length > 0) return stored
      } catch {}
      try {
        return crypto.randomUUID()
      } catch {
        return `session-${Date.now()}`
      }
    })()
    setSessionId(resolved)
    try {
      localStorage.setItem('fbc-session-id', resolved)
    } catch {}
  }, [router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-screen overflow-hidden">
      {sessionId ? (
        <LiveApiProvider sessionId={sessionId}>
          <AdminDashboard />
        </LiveApiProvider>
      ) : (
        <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">Setting up session…</div>
      )}
    </div>
  )
}
