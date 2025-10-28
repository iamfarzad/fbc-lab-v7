export interface WorkflowStep {
  id: string
  type: 'function' | 'switch' | 'parallel' | 'wait'
  function?: string
  condition?: string
  cases?: Array<{
    case: string
    step: string
  }>
  depends_on?: string[]
  timeout?: string
}

export interface WorkflowDefinition {
  name: string
  version: string
  description: string
  triggers: Array<{
    type: 'webhook' | 'schedule' | 'event'
    path?: string
    method?: string
    schedule?: string
    event?: string
  }>
  steps: WorkflowStep[]
}

export interface WorkflowExecution {
  id: string
  workflowName: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  context: Record<string, any>
  results: Record<string, any>
  startedAt: string
  completedAt?: string
  error?: string
}

export interface WorkflowFunction {
  name: string
  handler: (context: any) => Promise<any>
  timeout?: number
}

export interface WorkflowState {
  sessionId: string
  currentStep: string
  completedSteps: string[]
  context: Record<string, any>
  results: Record<string, any>
  metadata: {
    startedAt: string
    lastUpdated: string
    version: string
  }
}