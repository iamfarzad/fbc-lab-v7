import { respond } from '@/lib/api/response'

export async function POST(request: Request) {
  // TODO: Add proper authentication when Clerk is configured
  // const { userId } = auth()
  
  // In production, verify user has admin role here
  // if (!isAdmin(userId)) {
  //   return new NextResponse('Unauthorized', { status: 403 })
  // }

  try {
    const body = await request.json() as { monthlyBudget: number }
    const { monthlyBudget } = body

    // In production, you would save this to a database
    // For now, we'll just validate the input and return success
    if (typeof monthlyBudget !== 'number' || monthlyBudget < 0) {
      return respond.badRequest('Invalid budget amount')
    }

    // Here you would typically save to a database
    // await saveSettings({ monthlyBudget, userId })

    return respond.ok({ success: true })
  } catch (error) {
    console.error('Error saving Fly.io settings:', error)
    return respond.serverError('Internal Error')
  }
}
