'use client'

// eslint-disable-next-line react-refresh/only-export-components
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { PageHeader, PageShell } from '@/components/page-shell'

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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
    <PageShell>
      <PageHeader
        title="F.B/c AI Admin Dashboard"
        subtitle="Monitor leads, analyze interactions, and track AI performance"
      />
      <AdminDashboard />
    </PageShell>
  )
}
