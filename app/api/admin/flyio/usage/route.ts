import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'

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
    // In production, you would fetch real data from Fly.io API
    // const flyioToken = process.env.FLYIO_API_TOKEN
    // const response = await fetch('https://api.machines.dev/v1/apps/your-app/usage', {
    //   headers: { Authorization: `Bearer ${flyioToken}` }
    // })
    
    // For now, we'll return mock data
    return respond.ok({
      currentMonthCost: 12.45,
      forecastedMonthCost: 38.20,
      monthlyBudget: 50,
      isBudgetAlertEnabled: true,
      budgetAlertThreshold: 80,
      regions: ['iad', 'ewr', 'lhr'],
      dailyCosts: [
        { date: '2024-01-01', cost: 0.42 },
        { date: '2024-01-02', cost: 0.51 },
        { date: '2024-01-03', cost: 0.38 },
        { date: '2024-01-04', cost: 0.45 },
        { date: '2024-01-05', cost: 0.39 },
      ]
    })
  } catch (error) {
    console.error('Error fetching Fly.io usage:', error)
    return respond.serverError('Internal Error')
  }
}
