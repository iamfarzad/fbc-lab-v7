'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailCampaignSection } from './EmailCampaignSection'
import { EmailTestSection } from './EmailTestSection'
import { Mail, Send } from 'lucide-react'

export function EmailCampaignsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Mail className="size-6" />
        <h2 className="text-2xl font-semibold">Email Campaigns</h2>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Mail className="size-4" />
            Campaign Manager
          </TabsTrigger>
          <TabsTrigger value="test" className="flex items-center gap-2">
            <Send className="size-4" />
            Test Panel
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <EmailCampaignSection />
        </TabsContent>

        <TabsContent value="test">
          <EmailTestSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

