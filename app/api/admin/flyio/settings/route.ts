import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'

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
    const body = await request.json() as { monthlyBudget?: number; budgetAlertThreshold?: number; isBudgetAlertEnabled?: boolean }
    const { monthlyBudget, budgetAlertThreshold } = body

    // Validate inputs
    if (monthlyBudget !== undefined && (typeof monthlyBudget !== 'number' || monthlyBudget < 0)) {
      return respond.badRequest('Invalid budget amount')
    }

    if (budgetAlertThreshold !== undefined && (typeof budgetAlertThreshold !== 'number' || budgetAlertThreshold < 0 || budgetAlertThreshold > 100)) {
      return respond.badRequest('Invalid budget alert threshold (must be 0-100)')
    }

    // In production, you would save this to a database
    // await saveFlyIOSettings({ monthlyBudget, budgetAlertThreshold, isBudgetAlertEnabled, userId })

    return respond.ok({ success: true })
  } catch (error) {
    console.error('Error saving Fly.io settings:', error)
    return respond.serverError('Internal Error')
  }
}
