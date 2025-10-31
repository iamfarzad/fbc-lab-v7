'use client'

import { Button } from '@/components/ui/button'
import { Download, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

interface AdminHeaderProps {
  title?: string
  subtitle?: string
  onRefresh?: () => void
  onExport?: () => void
  actions?: ReactNode
}

export function AdminHeader({
  title = 'Admin Dashboard',
  subtitle = 'System overview and management',
  onRefresh,
  onExport,
  actions
}: AdminHeaderProps) {
  return (
    <header className="border-b border-border p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
          )}
          {onExport && (
            <Button variant="default" size="sm" onClick={onExport}>
              <Download className="mr-2 size-4" />
              Export
            </Button>
          )}
          {actions}
        </div>
      </div>
    </header>
  )
}

