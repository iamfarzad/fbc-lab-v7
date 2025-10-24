'use client'

import { createContext, useContext } from 'react'
import { useAgentAdapter } from '@/hooks/agent-ui/useAgentAdapter'

export const AgentSessionContext = createContext<any>(null)

export function AgentSessionProvider({ children }: { children: React.ReactNode }) {
  const session = useAgentAdapter()
  
  return (
    <AgentSessionContext.Provider value={session}>
      {children}
    </AgentSessionContext.Provider>
  )
}

export function useAgentSession() {
  const context = useContext(AgentSessionContext)
  if (!context) throw new Error('useAgentSession must be used within AgentSessionProvider')
  return context
}
