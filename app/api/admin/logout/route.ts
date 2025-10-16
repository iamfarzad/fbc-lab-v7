import { respond } from '@/lib/api/response'

export function POST() {
  try {
    const response = respond.ok({ success: true, message: 'Logged out successfully' })

    response.cookies.set('adminToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Admin logout error:', error)
    return respond.serverError('Logout failed')
  }
}
