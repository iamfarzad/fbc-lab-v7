'use client'

import { AgentSessionProvider } from '@/components/agent-ui/session/session-provider'
import { AgentInterface } from '@/components/agent-ui/AgentInterface'

export default function LivePage() {
  return (
    <AgentSessionProvider>
      <AgentInterface />
    </AgentSessionProvider>
  )
}
