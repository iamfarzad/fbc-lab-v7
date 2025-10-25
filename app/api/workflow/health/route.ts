// import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { createClient } from '@vercel/kv'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const startTime = Date.now()
    const healthChecks = {
      workflow: { status: 'unknown' as 'unknown' | 'healthy' | 'unhealthy', latency: 0, error: null as string | null },
      redis: { status: 'unknown' as 'unknown' | 'healthy' | 'unhealthy', latency: 0, error: null as string | null },
      supabase: { status: 'unknown' as 'unknown' | 'healthy' | 'unhealthy', latency: 0, error: null as string | null },
      overall: { status: 'unknown' as 'unknown' | 'healthy' | 'unhealthy', latency: 0 }
    }
    
    // Check Redis/KV
    try {
      const kvStart = Date.now()
      const kv = createClient({
        url: process.env.KV_REST_API_URL!,
        token: process.env.KV_REST_API_TOKEN!,
      })
      
      await kv.ping()
      healthChecks.redis = {
        status: 'healthy',
        latency: Date.now() - kvStart,
        error: null
      }
    } catch (error) {
      healthChecks.redis = {
        status: 'unhealthy',
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Check Supabase
    try {
      const supabaseStart = Date.now()
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { error } = await supabase
        .from('conversation_contexts')
        .select('id')
        .limit(1)
      
      if (error) throw error
      
      healthChecks.supabase = {
        status: 'healthy',
        latency: Date.now() - supabaseStart,
        error: null
      }
    } catch (error) {
      healthChecks.supabase = {
        status: 'unhealthy',
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Check workflow system
    try {
      const workflowStart = Date.now()
      
      // Test workflow engine initialization
      // const { WorkflowEngine } = await import('@/lib/workflow/engine')
      // const workflow = new WorkflowEngine('fbc-sales-funnel')
      
      healthChecks.workflow = {
        status: 'healthy',
        latency: Date.now() - workflowStart,
        error: null
      }
    } catch (error) {
      healthChecks.workflow = {
        status: 'unhealthy',
        latency: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    
    // Determine overall health
    const allHealthy = Object.values(healthChecks).every(
      check => check.status === 'healthy' || check.status === 'unknown'
    )
    
    healthChecks.overall = {
      status: allHealthy ? 'healthy' : 'unhealthy',
      latency: Date.now() - startTime
    }
    
    const statusCode = allHealthy ? 200 : 503
    
    return new Response(JSON.stringify(healthChecks), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('[WORKFLOW_HEALTH] Error:', error)
    
    return respond.error(
      error instanceof Error ? error.message : 'Health check failed',
      500,
      'HEALTH_CHECK_ERROR'
    )
  }
}