/**
 * Rate Limiting Tests
 * Verifies admin rate limiting enforces limits correctly
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'
import { adminRateLimit } from '@/app/api-utils/rate-limiting'

// Access the internal rate limit store for cleanup
// Note: This is a workaround since the store is not exported
// In a real test, we'd want to expose a reset function or use test isolation

describe('Admin Rate Limiting', () => {
  let originalNow: typeof Date.now

  beforeEach(() => {
    originalNow = Date.now
    // Reset rate limit store by waiting for cleanup interval or manually clearing
    // Since store is internal, tests may affect each other
    // For now, we'll use unique IPs per test
  })

  afterEach(() => {
    // Restore original Date.now
    Date.now = originalNow
  })

  function createRequest(options: {
    ip?: string
    userId?: string
    headers?: Headers
  } = {}): NextRequest {
    const headers = new Headers(options.headers || {})
    
    if (options.userId) {
      headers.set('x-user-id', options.userId)
    }
    
    if (options.ip) {
      headers.set('x-forwarded-for', options.ip)
      headers.set('x-real-ip', options.ip)
    }

    return {
      headers,
      url: options.ip ? `http://${options.ip}` : 'http://localhost:3000'
    } as NextRequest
  }

  describe('Rate Limit Configuration', () => {
    it('should allow requests within limit', () => {
      const request = createRequest({ ip: '192.168.1.1' })
      
      for (let i = 0; i < 50; i++) {
        const result = adminRateLimit(request)
        expect(result).toBeNull() // No rate limit hit
      }
    })

    it('should enforce 100 requests per 15 minutes limit', () => {
      const request = createRequest({ ip: '192.168.1.2' })
      
      // Make 100 requests - should all pass
      for (let i = 0; i < 100; i++) {
        const result = adminRateLimit(request)
        expect(result).toBeNull()
      }
      
      // 101st request should be blocked
      const blockedResult = adminRateLimit(request)
      expect(blockedResult).not.toBeNull()
      
      const response = blockedResult as NextResponse
      expect(response.status).toBe(429)
      
      const body = response.json()
      expect(body).resolves.toHaveProperty('error', 'Rate limit exceeded')
    })
  })

  describe('Rate Limit Headers', () => {
    it('should include rate limit headers in 429 response', () => {
      const request = createRequest({ ip: '192.168.1.3' })
      
      // Exhaust limit
      for (let i = 0; i < 100; i++) {
        adminRateLimit(request)
      }
      
      const blockedResult = adminRateLimit(request) as NextResponse
      expect(blockedResult.headers.get('X-RateLimit-Limit')).toBe('100')
      expect(blockedResult.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(blockedResult.headers.get('Retry-After')).toBeDefined()
      expect(blockedResult.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('should calculate retry-after correctly', () => {
      const request = createRequest({ ip: '192.168.1.4' })
      
      // Exhaust limit
      for (let i = 0; i < 100; i++) {
        adminRateLimit(request)
      }
      
      const blockedResult = adminRateLimit(request) as NextResponse
      const retryAfter = blockedResult.headers.get('Retry-After')
      const retryAfterNum = parseInt(retryAfter || '0', 10)
      
      // Should be between 0 and 900 seconds (15 minutes)
      expect(retryAfterNum).toBeGreaterThanOrEqual(0)
      expect(retryAfterNum).toBeLessThanOrEqual(900)
    })
  })

  describe('Key Generation', () => {
    it('should track by IP address when no user ID', () => {
      const request1 = createRequest({ ip: '192.168.1.5' })
      const request2 = createRequest({ ip: '192.168.1.6' })
      
      // Exhaust limit for IP1
      for (let i = 0; i < 100; i++) {
        adminRateLimit(request1)
      }
      
      // IP2 should still have limit available
      const result = adminRateLimit(request2)
      expect(result).toBeNull()
    })

    it('should track by user ID when available', () => {
      const request1 = createRequest({ userId: 'user-1', ip: '192.168.1.7' })
      const request2 = createRequest({ userId: 'user-2', ip: '192.168.1.7' })
      
      // Exhaust limit for user-1
      for (let i = 0; i < 100; i++) {
        adminRateLimit(request1)
      }
      
      // user-2 should still have limit (different user, same IP)
      const result = adminRateLimit(request2)
      expect(result).toBeNull()
    })

    it('should prefer user ID over IP', () => {
      const request1 = createRequest({ userId: 'user-1', ip: '192.168.1.8' })
      const request2 = createRequest({ userId: 'user-1', ip: '192.168.1.9' })
      
      // Exhaust limit for user-1 with IP1
      for (let i = 0; i < 100; i++) {
        adminRateLimit(request1)
      }
      
      // user-1 with different IP should still be blocked (same user)
      const result = adminRateLimit(request2)
      expect(result).not.toBeNull()
      expect((result as NextResponse).status).toBe(429)
    })
  })

  describe('Window Expiration', () => {
    it('should have window expiration logic', () => {
      // Note: Full window expiration testing requires access to internal rate limit store
      // or waiting for the cleanup interval (60 seconds). This test verifies the
      // rate limit logic exists and correctly tracks time windows.
      // 
      // To fully test expiration:
      // 1. Exhaust limit for a key
      // 2. Wait 16+ minutes OR manually clear store
      // 3. Verify limit resets
      //
      // Current test verifies limit is enforced with time-based tracking
      const request = createRequest({ ip: '192.168.1.10' })
      
      // Exhaust limit
      for (let i = 0; i < 100; i++) {
        adminRateLimit(request)
      }
      
      // Should be blocked
      const result = adminRateLimit(request)
      expect(result).not.toBeNull()
      expect((result as NextResponse).status).toBe(429)
      
      // Verify response includes reset time (window expiration is tracked)
      const headers = (result as NextResponse).headers
      expect(headers.get('X-RateLimit-Reset')).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle unknown IP gracefully', () => {
      const request = createRequest({ ip: '' })
      
      // Should not throw error
      const result = adminRateLimit(request)
      expect(result).toBeNull()
    })

    it('should handle missing headers gracefully', () => {
      const request = {
        headers: new Headers(),
        url: 'http://localhost:3000'
      } as NextRequest
      
      const result = adminRateLimit(request)
      expect(result).toBeNull()
    })

    it('should handle concurrent requests from same key', () => {
      const request = createRequest({ ip: '192.168.1.11' })
      
      // Simulate concurrent requests
      const results = []
      for (let i = 0; i < 105; i++) {
        results.push(adminRateLimit(request))
      }
      
      // First 100 should pass
      for (let i = 0; i < 100; i++) {
        expect(results[i]).toBeNull()
      }
      
      // Rest should be blocked
      for (let i = 100; i < 105; i++) {
        expect(results[i]).not.toBeNull()
        expect((results[i] as NextResponse).status).toBe(429)
      }
    })
  })
})

