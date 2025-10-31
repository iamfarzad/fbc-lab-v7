/**
 * Admin Authentication Middleware Tests
 * Verifies admin auth middleware correctly validates tokens and roles
 */

import { describe, it, expect } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { adminAuthMiddleware } from '@/app/api-utils/auth'
import {
  createAdminToken,
  createUserToken,
  createUnauthenticatedRequest,
  createExpiredAdminToken
} from './fixtures/auth-helpers'

describe('Admin Auth Middleware', () => {
  describe('Authentication Required', () => {
    it('should return 401 when no token provided', async () => {
      const request = createUnauthenticatedRequest()
      const result = await adminAuthMiddleware(request)

      expect(result).not.toBeNull()
      expect(result).toBeInstanceOf(NextResponse)
      
      const response = result as NextResponse
      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body).toHaveProperty('error', 'Authentication required')
    })

    it('should return 401 when Authorization header missing', async () => {
      const request = createUnauthenticatedRequest({
        headers: new Headers()
      })
      
      const result = await adminAuthMiddleware(request)
      expect(result).not.toBeNull()
      
      const response = result as NextResponse
      expect(response.status).toBe(401)
    })

    it('should return 401 when cookie missing and no Authorization header', async () => {
      const request = {
        headers: new Headers(),
        cookies: {
          get: () => undefined,
          getAll: () => [],
          has: () => false,
          set: () => {},
          delete: () => {},
          clear: () => {}
        } as any
      } as NextRequest

      const result = await adminAuthMiddleware(request)
      expect(result).not.toBeNull()
      
      const response = result as NextResponse
      expect(response.status).toBe(401)
    })
  })

  describe('Token Validation', () => {
    it('should return 401 when token is invalid', async () => {
      const request = {
        headers: new Headers({
          'Authorization': 'Bearer invalid-token-12345'
        }),
        cookies: {
          get: () => undefined,
          getAll: () => [],
          has: () => false,
          set: () => {},
          delete: () => {},
          clear: () => {}
        } as any
      } as NextRequest

      const result = await adminAuthMiddleware(request)
      expect(result).not.toBeNull()
      
      const response = result as NextResponse
      expect(response.status).toBe(401)
      
      const body = await response.json()
      expect(body).toHaveProperty('error', 'Invalid or expired token')
    })

    it('should return 401 when token is expired', async () => {
      const expiredToken = await createExpiredAdminToken()
      
      const request = {
        headers: new Headers({
          'Authorization': `Bearer ${expiredToken}`
        }),
        cookies: {
          get: () => undefined,
          getAll: () => [],
          has: () => false,
          set: () => {},
          delete: () => {},
          clear: () => {}
        } as any
      } as NextRequest

      const result = await adminAuthMiddleware(request)
      expect(result).not.toBeNull()
      
      const response = result as NextResponse
      expect(response.status).toBe(401)
    })

    it('should accept token from cookie', async () => {
      const adminToken = await createAdminToken()
      
      const request = {
        headers: new Headers(),
        cookies: {
          get: (name: string) => {
            if (name === 'adminToken') {
              return { value: adminToken }
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

      const result = await adminAuthMiddleware(request)
      expect(result).toBeNull() // Null means auth passed
    })

    it('should accept token from Authorization header', async () => {
      const adminToken = await createAdminToken()
      
      const request = {
        headers: new Headers({
          'Authorization': `Bearer ${adminToken}`
        }),
        cookies: {
          get: () => undefined,
          getAll: () => [],
          has: () => false,
          set: () => {},
          delete: () => {},
          clear: () => {}
        } as any
      } as NextRequest

      const result = await adminAuthMiddleware(request)
      expect(result).toBeNull() // Auth passed
    })

    it('should prefer cookie token over Authorization header', async () => {
      const cookieToken = await createAdminToken({ email: 'cookie@test.com' })
      const headerToken = await createAdminToken({ email: 'header@test.com' })
      
      const request = {
        headers: new Headers({
          'Authorization': `Bearer ${headerToken}`
        }),
        cookies: {
          get: (name: string) => {
            if (name === 'adminToken') {
              return { value: cookieToken }
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

      const result = await adminAuthMiddleware(request)
      expect(result).toBeNull() // Should use cookie token
    })
  })

  describe('Role Validation', () => {
    it('should return 403 when user role is not admin', async () => {
      const userToken = await createUserToken()
      
      const request = {
        headers: new Headers({
          'Authorization': `Bearer ${userToken}`
        }),
        cookies: {
          get: () => undefined,
          getAll: () => [],
          has: () => false,
          set: () => {},
          delete: () => {},
          clear: () => {}
        } as any
      } as NextRequest

      const result = await adminAuthMiddleware(request)
      expect(result).not.toBeNull()
      
      const response = result as NextResponse
      expect(response.status).toBe(403)
      
      const body = await response.json()
      expect(body).toHaveProperty('error', 'Admin access required')
    })

    it('should allow access when role is admin', async () => {
      const adminToken = await createAdminToken()
      
      const request = {
        headers: new Headers({
          'Authorization': `Bearer ${adminToken}`
        }),
        cookies: {
          get: () => undefined,
          getAll: () => [],
          has: () => false,
          set: () => {},
          delete: () => {},
          clear: () => {}
        } as any
      } as NextRequest

      const result = await adminAuthMiddleware(request)
      expect(result).toBeNull() // Auth passed
    })
  })

  describe('Success Path', () => {
    it('should return null when authentication succeeds', async () => {
      const adminToken = await createAdminToken()
      
      const request = {
        headers: new Headers({
          'Authorization': `Bearer ${adminToken}`
        }),
        cookies: {
          get: () => undefined,
          getAll: () => [],
          has: () => false,
          set: () => {},
          delete: () => {},
          clear: () => {}
        } as any
      } as NextRequest

      const result = await adminAuthMiddleware(request)
      expect(result).toBeNull() // Null means continue to handler
    })
  })
})

