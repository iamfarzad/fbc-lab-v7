import { NextResponse } from 'next/server'

export function GET() {
  // TODO: Add proper authentication when Clerk is configured
  // const { userId } = auth()
  
  // In production, verify user has admin role here
  // if (!isAdmin(userId)) {
  //   return new NextResponse('Unauthorized', { status: 403 })
  // }

  try {
    // In production, you would fetch real data from Fly.io API
    // For now, we'll return mock data
    return NextResponse.json({
      currentMonthCost: 12.45,
      forecastedMonthCost: 38.20,
      monthlyBudget: 50,
      isBudgetAlertEnabled: false,
      budgetAlertThreshold: 80,
      regions: ["iad", "ewr", "lhr"]
    })
  } catch (error) {
    console.error('Error fetching Fly.io usage:', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

