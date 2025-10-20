import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ShowcaseSectionProps {
  title: string
  children: ReactNode
  className?: string
}

export function ShowcaseSection({ title, children, className }: ShowcaseSectionProps) {
  return (
    <section className={cn("py-16 px-6", className)}>
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          {title}
        </h2>
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </section>
  )
}
