'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Home,
  FileText,
  Zap,
  Users,
  Mail,
  TrendingUp,
  Server,
  ChevronLeft,
  ChevronRight,
  Menu,
  AlertTriangle,
  DollarSign,
  Activity,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { LucideIcon } from 'lucide-react'

type NavigationItemId = 
  | 'overview'
  | 'logs'
  | 'api-tester'
  | 'leads'
  | 'conversations'
  | 'failed-leads'
  | 'analytics'
  | 'system-health'
  | 'security'
  | 'costs'
  | 'activity'
  | 'email-campaigns'
  | 'meetings'
  | 'interaction-analytics'
  | 'ai-performance'

interface NavigationItem {
  id: NavigationItemId
  label: string
  icon: LucideIcon
  description: string
  isExternal?: boolean
  href?: string
  badge?: number | null
}

interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

const navigationGroups: NavigationGroup[] = [
  {
    title: 'Dashboard',
    items: [
      { id: 'overview', label: 'Overview', icon: Home, description: 'System overview and key metrics' },
      { id: 'analytics', label: 'Agent Analytics', icon: TrendingUp, description: 'Agent and tool performance' },
      { id: 'interaction-analytics', label: 'Interaction Analytics', icon: TrendingUp, description: 'Business performance metrics' },
      { id: 'ai-performance', label: 'AI Performance', icon: Zap, description: 'Model performance and efficiency' },
    ]
  },
  {
    title: 'Management',
    items: [
      { id: 'conversations', label: 'Conversations', icon: Mail, description: 'View all conversations' },
      { id: 'failed-leads', label: 'Failed Leads', icon: AlertTriangle, description: 'View failed email deliveries' },
      { id: 'email-campaigns', label: 'Email Campaigns', icon: Mail, description: 'Create and manage email campaigns' },
      { id: 'meetings', label: 'Meetings', icon: Calendar, description: 'Schedule and track consultations' },
      { id: 'leads', label: 'Leads', icon: Users, description: 'Lead management and scoring' },
    ]
  },
  {
    title: 'Tools',
    items: [
      { id: 'api-tester', label: 'API Tester', icon: Zap, description: 'Test all API endpoints' },
      { id: 'system-health', label: 'System Health', icon: Server, description: 'Real-time system monitoring' },
      { id: 'security', label: 'Security Audit', icon: AlertTriangle, description: 'Security monitoring and audit trails' },
      { id: 'activity', label: 'Real-Time Activity', icon: Activity, description: 'Live system activity feed' },
      { id: 'logs', label: 'Logs', icon: FileText, description: 'Production log monitoring' },
    ]
  },
  {
    title: 'Costs',
    items: [
      { id: 'costs', label: 'Cost Management', icon: DollarSign, description: 'Token and infrastructure costs' },
    ]
  },
]

interface AdminSidebarProps {
  activeSection?: NavigationItemId
  onSectionChange?: (section: NavigationItemId) => void
  className?: string
}

const SIDEBAR_STORAGE_KEY = 'admin-sidebar-collapsed'

export function AdminSidebar({ activeSection, onSectionChange, className }: AdminSidebarProps) {
  const isMobile = useIsMobile()
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
      return stored === 'true'
    } catch {
      return false
    }
  })
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isCollapsed))
    } catch {
      // Ignore localStorage errors
    }
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev)
  }

  const handleSectionClick = (item: NavigationItem) => {
    if (item.isExternal && item.href) {
      return // Let Link handle external navigation
    }
    if (onSectionChange && !item.isExternal) {
      onSectionChange(item.id)
    }
    if (isMobile) {
      setIsMobileOpen(false)
    }
  }

  // Mobile: Show button to open drawer
  if (isMobile) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="lg:hidden"
        >
          <Menu className="size-4" />
          <span className="sr-only">Open menu</span>
        </Button>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setIsMobileOpen(false)}>
            <div 
              className="fixed left-0 top-0 h-full w-64 bg-background border-r border-border p-4 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Navigation</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsMobileOpen(false)}>
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
              <nav className="space-y-6">
                {navigationGroups.map((group) => (
                  <div key={group.title}>
                    <h4 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.title}
                    </h4>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon
                        const isActive = activeSection === item.id
                        
                        if (item.isExternal && item.href) {
                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                "text-foreground"
                              )}
                            >
                              <Icon className="size-5" />
                              <span>{item.label}</span>
                            </Link>
                          )
                        }
                        
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSectionClick(item)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-accent hover:text-accent-foreground text-foreground"
                            )}
                          >
                            <Icon className="size-5" />
                            <span>{item.label}</span>
                            {item.badge !== null && item.badge !== undefined && (
                              <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop: Collapsible sidebar
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 shrink-0",
        isCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed && (
          <h3 className="font-semibold text-sm">Navigation</h3>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleCollapse}
          className="ml-auto"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </Button>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.title}>
              {!isCollapsed && (
                <h4 className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.title}
                </h4>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = activeSection === item.id
                  
                  if (item.isExternal && item.href) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "text-foreground",
                          isCollapsed && "justify-center"
                        )}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon className="size-5 shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                      </Link>
                    )
                  }
                  
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSectionClick(item)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent hover:text-accent-foreground text-foreground",
                        isCollapsed && "justify-center"
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="size-5 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge !== null && item.badge !== undefined && (
                            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  )
}

