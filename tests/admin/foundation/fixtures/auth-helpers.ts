import { createToken, JWTPayload } from '@/src/core/auth'
import { NextRequest } from 'next/server'

/**
 * Creates a mock admin token for testing
 */
export async function createAdminToken(options?: {
  userId?: string
  email?: string
  exp?: number
}): Promise<string> {
  const payload: Omit<JWTPayload, 'exp'> = {
    userId: options?.userId || 'test-admin-id',
    email: options?.email || 'admin@test.com',
    role: 'admin'
  }
  
  const token = await createToken(payload)
  
  // If custom expiration provided, manually adjust token
  if (options?.exp) {
    const base64Payload = token.split(':')[1] // Remove 'fbctoken:' prefix
    const decoded = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'))
    decoded.exp = options.exp
    const adjustedPayload = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url')
    return `fbctoken:${adjustedPayload}`
  }
  
  return token
}

/**
 * Creates a mock user (non-admin) token for testing
 */
export async function createUserToken(options?: {
  userId?: string
  email?: string
}): Promise<string> {
  const payload: Omit<JWTPayload, 'exp'> = {
    userId: options?.userId || 'test-user-id',
    email: options?.email || 'user@test.com',
    role: 'user'
  }
  
  return createToken(payload)
}

/**
 * Creates a mock NextRequest with admin authentication
 */
export async function createAuthenticatedAdminRequest(
  request: Partial<NextRequest> = {}
): Promise<NextRequest> {
  const token = await createAdminToken()
  
  const headers = new Headers(request.headers || {})
  headers.set('Authorization', `Bearer ${token}`)
  headers.set('Cookie', `adminToken=${token}`)
  
  return {
    ...request,
    headers,
    cookies: {
      get: (name: string) => {
        if (name === 'adminToken') {
          return { value: token }
        }
        return undefined
      },
      getAll: () => [],
      has: (name: string) => name === 'adminToken',
      set: () => {},
      delete: () => {},
      clear: () => {}
    } as any
  } as NextRequest
}

/**
 * Creates a mock NextRequest with user (non-admin) authentication
 */
export async function createAuthenticatedUserRequest(
  request: Partial<NextRequest> = {}
): Promise<NextRequest> {
  const token = await createUserToken()
  
  const headers = new Headers(request.headers || {})
  headers.set('Authorization', `Bearer ${token}`)
  
  return {
    ...request,
    headers
  } as NextRequest
}

/**
 * Creates a mock NextRequest without authentication
 */
export function createUnauthenticatedRequest(
  request: Partial<NextRequest> = {}
): NextRequest {
  return {
    ...request,
    headers: new Headers(request.headers || {}),
    cookies: {
      get: () => undefined,
      getAll: () => [],
      has: () => false,
      set: () => {},
      delete: () => {},
      clear: () => {}
    } as any
  } as NextRequest
}

/**
 * Creates an expired admin token
 */
export async function createExpiredAdminToken(): Promise<string> {
  const expiredExp = Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
  return createAdminToken({ exp: expiredExp })
}

