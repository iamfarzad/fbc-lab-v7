'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AdminLayoutProps {
  children: ReactNode
  className?: string
}

export function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    <div className={cn('h-screen bg-background overflow-hidden', className)}>
      {children}
    </div>
  )
}

