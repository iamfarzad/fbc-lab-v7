import { NextRequest, NextResponse } from 'next/server'
import { createToken } from '@/src/core/auth'

export async function POST(request: NextRequest) {
  try {
    const { password } = (await request.json()) as { password?: string }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const ownerEmail = 'farzad@farzadbayat.com'
    const token = await createToken({
      userId: ownerEmail,
      email: ownerEmail,
      role: 'admin'
    })

    const response = NextResponse.json({
      success: true,
      user: {
        email: ownerEmail,
        role: 'admin'
      }
    })

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
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
