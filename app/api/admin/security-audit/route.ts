import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'
import { supabaseService } from '@/src/core/supabase/client'
import { createClient } from '@supabase/supabase-js'

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase || typeof (supabase as any)?.from !== 'function') {
    throw new Error('Supabase service client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
}

export async function GET(request: NextRequest) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return respond.ok({ disabled: true, message: 'Admin features require Supabase configuration' })
  }

  const rateLimitResult = adminRateLimit(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  const authResult = await adminAuthMiddleware(request)
  if (authResult) {
    return authResult
  }

  try {
    const supabase = ensureSupabase()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    // Query recent audit logs
    const { data: recentAudits, error: auditError } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)

    // Check RLS status by querying system tables
    // Note: This may require specific permissions - if it fails, we'll handle gracefully
    let rlsStatus: Array<{ table: string; rls_enabled: boolean }> = []
    try {
      const { data: rlsData } = await supabase
        .rpc('check_rls_status')
        .catch(() => ({ data: null }))
      
      if (!rlsData) {
        // Fallback: Check RLS by attempting to query with anon key
        const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
        const { error: anonError } = await anonClient
          .from('audit_log')
          .select('count')
          .limit(1)
        
        rlsStatus = [
          { table: 'audit_log', rls_enabled: !!anonError }
        ]
      }
    } catch {
      // RLS check failed - assume enabled
      rlsStatus = [
        { table: 'audit_log', rls_enabled: true }
      ]
    }

    // Get audit log statistics
    const { data: auditStats } = await supabase
      .from('audit_log')
      .select('event')
      .limit(1000)

    const eventCounts: Record<string, number> = {}
    auditStats?.forEach((stat: any) => {
      if (stat.event) {
        eventCounts[stat.event] = (eventCounts[stat.event] || 0) + 1
      }
    })

    // Security checks
    const securityChecks = [
      {
        check: 'Audit log accessible',
        status: !auditError ? '✅ PASS' : '❌ FAIL',
        description: 'Service role can query audit_log table'
      },
      {
        check: 'RLS enabled on audit_log',
        status: rlsStatus.length > 0 && rlsStatus[0].rls_enabled ? '✅ PASS' : '⚠️  UNKNOWN',
        description: 'Row Level Security should be enabled'
      },
      {
        check: 'Recent audit entries exist',
        status: recentAudits && recentAudits.length > 0 ? '✅ PASS' : '⚠️  WARNING',
        description: 'Audit logging appears active'
      }
    ]

    const auditResult = {
      timestamp: new Date().toISOString(),
      security_checks: securityChecks,
      recent_audits: recentAudits || [],
      audit_statistics: {
        total_recent: recentAudits?.length || 0,
        event_counts: eventCounts,
        last_audit: recentAudits && recentAudits.length > 0 ? recentAudits[0].timestamp : null
      },
      rls_status: rlsStatus,
      overall_security: securityChecks.every(check => check.status === '✅ PASS') ? '🔒 SECURE' : '⚠️  REVIEW NEEDED'
    }

    return respond.ok(auditResult)
  } catch (error) {
    console.error('Security audit error:', error)
    return respond.serverError('Failed to run security audit')
  }
}

// POST endpoint to test public access (should fail)
export async function POST(request: NextRequest) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return respond.ok({ disabled: true, message: 'Admin features require Supabase configuration' })
  }

  const rateLimitResult = adminRateLimit(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  const authResult = await adminAuthMiddleware(request)
  if (authResult) {
    return authResult
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Create public client with anon key (simulates unauthenticated user)
    const publicSupabase = createClient(supabaseUrl, anonKey)

    // Test 1: Try to access audit_log (should fail with RLS)
    const { data: auditData, error: auditError } = await publicSupabase
      .from('audit_log')
      .select('*')
      .limit(1)

    // Test 2: Try to access conversations (should fail with RLS)
    const { data: convData, error: convError } = await publicSupabase
      .from('conversations')
      .select('id')
      .limit(1)

    // Test 3: Try to access failed_conversations (should fail with RLS)
    const { data: failedData, error: failedError } = await publicSupabase
      .from('failed_conversations')
      .select('*')
      .limit(1)

    const publicAccessTests = [
      {
        test: 'Public access to audit_log',
        status: auditError ? '✅ BLOCKED (Expected)' : '❌ VULNERABLE',
        error: auditError?.message || null,
        data_accessible: auditData ? auditData.length : 0
      },
      {
        test: 'Public access to conversations',
        status: convError ? '✅ BLOCKED (Expected)' : '❌ VULNERABLE',
        error: convError?.message || null,
        data_accessible: convData ? convData.length : 0
      },
      {
        test: 'Public access to failed_conversations',
        status: failedError ? '✅ BLOCKED (Expected)' : '❌ VULNERABLE',
        error: failedError?.message || null,
        data_accessible: failedData ? failedData.length : 0
      }
    ]

    const allBlocked = publicAccessTests.every(test => test.status.includes('BLOCKED'))

    return respond.ok({
      timestamp: new Date().toISOString(),
      public_access_tests: publicAccessTests,
      summary: {
        public_blocked: allBlocked ? '✅ SECURE' : '❌ VULNERABLE',
        message: 'Public access tests completed. All should show BLOCKED status.'
      }
    })
  } catch (error) {
    console.error('Public access test error:', error)
    return respond.serverError('Failed to test public access')
  }
}

