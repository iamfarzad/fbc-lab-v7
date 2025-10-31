'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TokenCostAnalyticsSection } from './TokenCostAnalyticsSection'
import { FlyIOCostControlsSection } from './FlyIOCostControlsSection'
import { DollarSign, Zap, Server } from 'lucide-react'

export function CostsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <DollarSign className="size-6" />
        <h2 className="text-2xl font-semibold">Cost Management</h2>
      </div>

      <Tabs defaultValue="tokens" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <Zap className="size-4" />
            Token Costs
          </TabsTrigger>
          <TabsTrigger value="flyio" className="flex items-center gap-2">
            <Server className="size-4" />
            Fly.io Costs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tokens">
          <TokenCostAnalyticsSection />
        </TabsContent>

        <TabsContent value="flyio">
          <FlyIOCostControlsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}

