'use client'

import { useState } from 'react'
import { AdminLayout } from './layout/AdminLayout'
import { AdminHeader } from './layout/AdminHeader'
import { AdminSidebar } from './layout/AdminSidebar'
import { OverviewSection } from './sections/OverviewSection'
import { ConversationsSection } from './sections/ConversationsSection'
import { ApiTesterSection } from './sections/ApiTesterSection'
import { SystemHealthSection } from './sections/SystemHealthSection'
import { LeadsSection } from './sections/LeadsSection'
import { LogsSection } from './sections/LogsSection'
import { AgentAnalyticsPanel } from './AgentAnalyticsPanel'
import { AdminChatPanel } from './chat/AdminChatPanel'
import { FailedConversationsSection } from './sections/FailedConversationsSection'
import { SecurityAuditSection } from './sections/SecurityAuditSection'
import { CostsSection } from './sections/CostsSection'
import { RealTimeActivitySection } from './sections/RealTimeActivitySection'
import { EmailCampaignsSection } from './sections/EmailCampaignsSection'
import { MeetingCalendarSection } from './sections/MeetingCalendarSection'
import { InteractionAnalyticsSection } from './sections/InteractionAnalyticsSection'
import { AIPerformanceMetricsSection } from './sections/AIPerformanceMetricsSection'
import { useAdminStats } from '@/hooks/useAdminStats'
import { useAdminConversations } from '@/hooks/useAdminConversations'
import { ScrollArea } from '@/components/ui/scroll-area'

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

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<NavigationItemId>('overview')
  const [isChatOpen, setIsChatOpen] = useState(false)

  const { stats, loading: statsLoading, refetch: refetchStats } = useAdminStats({
    period: '7d',
    autoRefresh: activeSection === 'overview',
    refreshInterval: 60000
  })

  const { conversations, loading: conversationsLoading, refetch: refetchConversations } = useAdminConversations({
    period: 'last_30_days',
    autoRefresh: activeSection === 'conversations',
    refreshInterval: 60000
  })

  const handleRefresh = () => {
    if (activeSection === 'overview') {
      void refetchStats()
    } else if (activeSection === 'conversations') {
      void refetchConversations()
    }
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export functionality not yet implemented')
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection stats={stats} loading={statsLoading} />
      case 'conversations':
        return <ConversationsSection conversations={conversations} loading={conversationsLoading} />
      case 'failed-leads':
        return <FailedConversationsSection />
      case 'api-tester':
        return <ApiTesterSection />
      case 'system-health':
        return <SystemHealthSection />
      case 'security':
        return <SecurityAuditSection />
      case 'costs':
        return <CostsSection />
      case 'activity':
        return <RealTimeActivitySection />
      case 'email-campaigns':
        return <EmailCampaignsSection />
      case 'meetings':
        return <MeetingCalendarSection />
      case 'analytics':
        return <AgentAnalyticsPanel />
      case 'interaction-analytics':
        return <InteractionAnalyticsSection />
      case 'ai-performance':
        return <AIPerformanceMetricsSection />
      case 'leads':
        return <LeadsSection />
      case 'logs':
        return <LogsSection />
      default:
        return (
          <div className="space-y-6">
            <div className="text-center text-muted-foreground">Section not found</div>
          </div>
        )
    }
  }

  return (
    <AdminLayout>
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border bg-card shrink-0">
            <div className="mx-auto max-w-7xl">
              <AdminHeader
                onRefresh={handleRefresh}
                onExport={handleExport}
              />
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-background">
            <ScrollArea className="h-full">
              <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
                {renderSection()}
              </div>
            </ScrollArea>
          </div>
        </div>
        {/* Floating chat button/drawer */}
        <AdminChatPanel isOpen={isChatOpen} onOpenChange={setIsChatOpen} />
      </div>
    </AdminLayout>
  )
}
