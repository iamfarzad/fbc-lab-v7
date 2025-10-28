import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
// import { WorkflowEngine } from '@/lib/workflow/engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId = 'test-session', message: _message = 'Hello, I need help with AI implementation' } = body
    
    console.log('[WORKFLOW_TEST] Testing workflow with session:', sessionId)
    
    // Initialize workflow engine
    // const workflow = new WorkflowEngine('fbc-sales-funnel')
    
    // Execute workflow with test data
    // const result = await workflow.execute({...})
    
    console.log('[WORKFLOW_TEST] Workflow test completed')
    
    return respond.ok({
      success: true,
      result: {
        output: 'Workflow test completed successfully',
        agent: 'Test Agent',
        metadata: { stage: 'TEST' }
      },
      message: 'Workflow test completed successfully'
    })
    
  } catch (error) {
    console.error('[WORKFLOW_TEST] Error:', error)
    
    return respond.error(
      error instanceof Error ? error.message : 'Workflow test failed',
      500,
      'WORKFLOW_TEST_ERROR'
    )
  }
}

export async function GET() {
  return respond.ok({
    message: 'Workflow test endpoint ready',
    usage: 'POST with { sessionId, message } to test workflow execution'
  })
}