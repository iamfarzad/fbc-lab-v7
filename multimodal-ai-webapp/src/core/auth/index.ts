export interface AuthResult {
  success: boolean
  userId?: string
  error?: string
}

export interface JWTPayload {
  userId: string
  email: string
  role?: string
  exp: number
  iat: number
}

export class AuthService {
  private jwtSecret: string

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-for-dev'
  }

  async verifyToken(token: string): Promise<AuthResult> {
    try {
      // In production, use proper JWT verification
      // For now, simple token validation
      if (!token || token.length < 10) {
        return { success: false, error: 'Invalid token format' }
      }

      // Mock verification - in production use jose or jsonwebtoken
      const payload: JWTPayload = {
        userId: `user-${  Math.random().toString(36).substring(7)}`,
        email: 'user@example.com',
        role: 'user',
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
        iat: Math.floor(Date.now() / 1000)
      }

      return { success: true, userId: payload.userId }

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token verification failed' 
      }
    }
  }

  async authenticateRequest(headers: Record<string, string | null>): Promise<AuthResult> {
    const authHeader = headers['authorization']
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Missing or invalid authorization header' }
    }

    const token = authHeader.slice(7) // Remove 'Bearer '
    return this.verifyToken(token)
  }

  generateAnonymousUserId(): string {
    return `anon-${Date.now()}-${Math.random().toString(36).substring(7)}`
  }

  isAnonymousUser(userId: string): boolean {
    return userId.startsWith('anon-')
  }
}

// Export singleton instance
export const authService = new AuthService()

// Admin authentication middleware
import { NextResponse } from 'next/server'

export async function adminAuthMiddleware(headers: Record<string, string | null>): Promise<NextResponse | null> {
  const authResult = await authService.authenticateRequest(headers)

  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error || 'Authentication failed' }, { status: 401 })
  }

  // If successful, return null to indicate that the request can proceed
  return null
}

// Token creation (for login)
export function createToken(payload: Omit<JWTPayload, 'exp' | 'iat'>): string {
  // In production, use proper JWT library
  // For now, return a mock token
  return `mock-token-${payload.userId}-${Date.now()}`
}

// Utility functions
export function sanitizeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 50)
}