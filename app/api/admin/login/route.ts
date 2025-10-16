import { NextRequest } from 'next/server'
import { respond } from '@/lib/api/response'
import { createToken } from '@/src/core/auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: string }

    if (!password) {
      return respond.badRequest('Password is required')
    }

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    if (password !== adminPassword) {
      return respond.unauthorized('Invalid credentials')
    }

    const ownerEmail = 'farzad@farzadbayat.com'
    const token = await createToken({
      userId: ownerEmail,
      email: ownerEmail,
      role: 'admin'
    })

    const response = respond.ok({ success: true, user: { email: ownerEmail, role: 'admin' } })

    response.cookies.set('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60,
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Admin login error:', error)
    return respond.serverError('Login failed')
  }
}
