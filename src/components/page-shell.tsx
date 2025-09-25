import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'fullscreen'
}

export function PageShell({ children, className, variant = 'default', ...props }: PageShellProps) {
  if (variant === 'fullscreen') {
    return (
      <section className={cn('h-full w-full', className)} {...props}>
        {children}
      </section>
    )
  }

  return (
    <section className={cn('container py-12 md:py-20', className)} {...props}>
      {children}
    </section>
  )
}

interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn('mx-auto max-w-3xl text-center', className)} {...props}>
      <h1 className="text-balance text-3xl font-bold tracking-tight text-primary sm:text-4xl md:text-5xl lg:text-6xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-6 text-balance text-lg leading-8 text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
