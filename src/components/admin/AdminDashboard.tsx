'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Activity,
  Brain,
  Calendar,
  DollarSign,
  Download,
  Filter,
  Home,
  Mail,
  Search,
  Server,
  TrendingUp,
  Users,
  Zap
} from 'lucide-react'

// Placeholder navigation for future deep-linking
const navigationItems = [
  { id: 'overview', label: 'Overview', icon: Home, description: 'System overview and key metrics' },
  { id: 'leads', label: 'Leads', icon: Users, description: 'Lead management and scoring' },
  { id: 'meetings', label: 'Meetings', icon: Calendar, description: 'Meeting scheduling and tracking' },
  { id: 'emails', label: 'Emails', icon: Mail, description: 'Email campaigns and automation' },
  { id: 'costs', label: 'Costs', icon: DollarSign, description: 'AI usage and cost tracking' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, description: 'Business performance insights' },
  { id: 'ai-performance', label: 'AI Performance', icon: Zap, description: 'AI model performance metrics' },
  { id: 'gemini-optimization', label: 'Gemini Optimization', icon: Brain, description: 'Gemini API cost optimization and caching' },
  { id: 'activity', label: 'Activity', icon: Activity, description: 'Real-time system activity' },
  { id: 'system-health', label: 'System Health', icon: Server, description: 'Real-time system monitoring and health' }
] as const

type NavigationItemId = (typeof navigationItems)[number]['id']

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<NavigationItemId>('overview')

  const renderPlaceholder = () => (
    <Card>
      <CardHeader>
        <CardTitle>Admin Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="py-8 text-center">
            <Brain className="mx-auto mb-4 size-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">Admin Features Coming Online</h3>
            <p className="text-muted-foreground">
              Intelligence reporting, lead triage, and session playback are reinstated incrementally as the
              migration proceeds. Use this console to monitor progress and validate Supabase connectivity.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="bg-info/10 text-info">
                System Healthy
              </Badge>
              <Badge variant="secondary" className="bg-success/10 text-success">
                AI Online
              </Badge>
              <Badge variant="secondary" className="bg-accent/10 text-accent">
                DB Connected
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-7xl p-6">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <header className="border-b border-border p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Admin Dashboard</h2>
                <p className="mt-1 text-muted-foreground">System overview and management</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm">
                  <Search className="mr-2 size-4" />
                  Search
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 size-4" />
                  Filter
                </Button>
                <Button variant="default" size="sm">
                  <Download className="mr-2 size-4" />
                  Export
                </Button>
              </div>
            </div>
            <nav className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = activeSection === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex items-center rounded-lg border px-4 py-3 text-left transition hover:border-primary hover:bg-primary/5 ${isActive ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-foreground'}`}
                  >
                    <Icon className="mr-3 size-5" />
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </button>
                )
              })}
            </nav>
          </header>
          <div className="p-6">{renderPlaceholder()}</div>
        </div>
      </div>
    </div>
  )
}
