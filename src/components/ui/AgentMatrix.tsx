"use client"

import React from 'react'
import { Matrix } from './matrix'
import { cn } from '@/lib/utils'

export type AgentStatus = 'idle' | 'active' | 'processing' | 'error' | 'offline'

interface AgentMatrixProps {
  agents: AgentStatus[]
  className?: string
  variant?: 'compact' | 'expanded'
  size?: number
}

// Generate agent activity matrix based on status
const generateAgentMatrix = (agents: AgentStatus[]): boolean[][] => {
  const rows = 5
  const cols = 7
  const matrix: boolean[][] = Array(rows).fill(null).map(() => Array(cols).fill(false))
  
  agents.forEach((status, index) => {
    if (index >= cols) return // Only fit first 7 agents
    
    const col = index
    let intensity = 0
    
    switch (status) {
      case 'active':
        intensity = rows // Full height for active agents
        break
      case 'processing':
        intensity = Math.floor(rows * 0.7) // 70% height for processing
        break
      case 'idle':
        intensity = Math.floor(rows * 0.3) // 30% height for idle
        break
      case 'error':
        intensity = 1 // Single dot for error
        break
      case 'offline':
        intensity = 0 // No dots for offline
        break
    }
    
    // Fill dots from bottom up
    for (let row = 0; row < intensity && row < rows; row++) {
      const rowFromBottom = rows - 1 - row
      matrix[rowFromBottom][col] = true
    }
  })
  
  return matrix
}

export const AgentMatrix = React.forwardRef<HTMLDivElement, AgentMatrixProps>(({
  agents = [],
  className,
  variant = 'compact',
  size = 3,
  ...props
}, ref) => {
  const agentMatrix = React.useMemo(() => generateAgentMatrix(agents), [agents])
  
  const agentThemes = {
    active: {
      on: 'hsl(142, 76%, 36%)', // Green-600
      off: 'hsl(var(--muted) / 0.1)'
    },
    processing: {
      on: 'hsl(38, 92%, 50%)', // Yellow-500  
      off: 'hsl(var(--muted) / 0.1)'
    },
    idle: {
      on: 'hsl(215, 20%, 65%)', // Gray-500
      off: 'hsl(var(--muted) / 0.1)'
    },
    error: {
      on: 'hsl(0, 84%, 60%)', // Red-500
      off: 'hsl(var(--muted) / 0.1)'
    },
    offline: {
      on: 'hsl(var(--muted) / 0.3)',
      off: 'hsl(var(--muted) / 0.05)'
    }
  }
  
  // Determine theme based on highest priority status
  const getTheme = () => {
    if (agents.some(status => status === 'error')) return agentThemes.error
    if (agents.some(status => status === 'processing')) return agentThemes.processing
    if (agents.some(status => status === 'active')) return agentThemes.active
    if (agents.some(status => status === 'idle')) return agentThemes.idle
    return agentThemes.offline
  }
  
  const theme = getTheme()
  
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <Matrix
        ref={ref}
        mode="default"
        pattern={agentMatrix.map(row => row.map(cell => cell ? 1 : 0))}
        size={size}
        gap={1}
        palette={theme}
        brightness={1.0}
        className={cn(
          'transition-all duration-300',
          variant === 'compact' && 'scale-90',
          variant === 'expanded' && 'scale-100'
        )}
        aria-label={`Agent status matrix: ${agents.filter(s => s === 'active').length} active, ${agents.filter(s => s === 'processing').length} processing`}
        {...props}
      />
      
      {/* Agent status legend */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-600" />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>Processing</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span>Idle</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>Error</span>
        </div>
      </div>
    </div>
  )
})

AgentMatrix.displayName = 'AgentMatrix'
