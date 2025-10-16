import { respond } from '@/lib/api/response'

export async function POST() {
  try {
    return respond.ok({ success: true, message: 'Test endpoint working', timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Test endpoint error:', error)
    return respond.serverError('Test endpoint failed')
  }
}

export async function GET() {
  return respond.ok({ success: true, message: 'Test endpoint GET working', timestamp: new Date().toISOString() })
}
