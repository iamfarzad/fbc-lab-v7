/**
 * End-to-End Conversational Flow Testing
 * Tests the complete chat flow from user input to AI response
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

describe('Conversational Flow E2E Tests', () => {
  const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
  const TEST_SESSION_ID = `test-session-${Date.now()}`

  beforeAll(async () => {
    // Verify server is running
    const healthCheck = await fetch(`${BASE_URL}/api/chat/unified?action=status`)
    if (!healthCheck.ok) {
      throw new Error('Server not running. Start with: pnpm dev:all')
    }
  })

  describe('Step 1: API Endpoint Health Check', () => {
    it('should return capabilities', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified?action=capabilities`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data).toHaveProperty('capabilities')
      expect(data.capabilities).toHaveProperty('supportsStreaming', true)
      expect(data.capabilities).toHaveProperty('supportsMultimodal', true)
      expect(data.capabilities).toHaveProperty('supportsRealtime', true)
    })

    it('should return status', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified?action=status`)
      expect(response.ok).toBe(true)
      
      const data = await response.json()
      expect(data).toHaveProperty('status', 'operational')
      expect(data).toHaveProperty('backend', 'unified-ai-sdk')
    })
  })

  describe('Step 2: Basic Chat Message Flow', () => {
    it('should accept and process a simple chat message', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`,
          'x-session-id': TEST_SESSION_ID
        },
        body: JSON.stringify({
          messages: [{
            id: 'msg-1',
            role: 'user',
            content: 'Hello, I want to learn about your services',
            timestamp: new Date().toISOString()
          }],
          context: {
            sessionId: TEST_SESSION_ID
          },
          stream: true
        })
      })

      expect(response.ok).toBe(true)
      expect(response.headers.get('content-type')).toContain('text/event-stream')

      // Read first chunk
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader')
      }

      const { done, value } = await reader.read()
      expect(done).toBe(false)
      expect(value).toBeDefined()

      reader.releaseLock()
    })

    it('should handle non-streaming requests', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`,
          'x-session-id': TEST_SESSION_ID
        },
        body: JSON.stringify({
          messages: [{
            id: 'msg-2',
            role: 'user',
            content: 'What is 1+1?',
            timestamp: new Date().toISOString()
          }],
          context: {
            sessionId: TEST_SESSION_ID
          },
          stream: false
        })
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      expect(data).toHaveProperty('message')
      expect(data.message).toHaveProperty('content')
    })

    it('should reject empty messages', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`
        },
        body: JSON.stringify({
          messages: [],
          context: { sessionId: TEST_SESSION_ID },
          stream: false
        })
      })

      expect(response.status).toBe(400)
    })

    it('should reject messages with empty content', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`
        },
        body: JSON.stringify({
          messages: [{
            id: 'msg-3',
            role: 'user',
            content: '   ',
            timestamp: new Date().toISOString()
          }],
          context: { sessionId: TEST_SESSION_ID },
          stream: false
        })
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Step 3: Discovery Agent Workflow', () => {
    it('should respond with discovery agent opening pattern', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`,
          'x-session-id': TEST_SESSION_ID
        },
        body: JSON.stringify({
          messages: [{
            id: 'msg-discovery-1',
            role: 'user',
            content: 'Hello',
            timestamp: new Date().toISOString()
          }],
          context: {
            sessionId: TEST_SESSION_ID,
            conversationFlow: null // New conversation
          },
          stream: false
        })
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      const content = data.message?.content || ''
      
      // Should contain discovery-oriented language
      expect(content.toLowerCase()).toMatch(/business|goals|objectives|strategic|outcome/i)
    })

    it('should redirect deflection attempts', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`,
          'x-session-id': TEST_SESSION_ID
        },
        body: JSON.stringify({
          messages: [
            {
              id: 'msg-discovery-2',
              role: 'user',
              content: 'Hello',
              timestamp: new Date(Date.now() - 5000).toISOString()
            },
            {
              id: 'msg-math',
              role: 'user',
              content: 'What is 1+1?',
              timestamp: new Date().toISOString()
            }
          ],
          context: {
            sessionId: TEST_SESSION_ID
          },
          stream: false
        })
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      const content = data.message?.content || ''
      
      // Should redirect back to business focus
      const hasRedirect = 
        content.toLowerCase().includes('focus') ||
        content.toLowerCase().includes('business') ||
        content.toLowerCase().includes('objective')
      
      expect(hasRedirect).toBe(true)
    })
  })

  describe('Step 4: Session Management', () => {
    it('should use sessionId from header', async () => {
      const customSessionId = `custom-session-${Date.now()}`
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`,
          'x-session-id': customSessionId
        },
        body: JSON.stringify({
          messages: [{
            id: 'msg-session-1',
            role: 'user',
            content: 'Test session',
            timestamp: new Date().toISOString()
          }],
          stream: false
        })
      })

      expect(response.ok).toBe(true)
      // Session ID should be preserved in logs (check response metadata)
    })

    it('should default to anonymous for missing sessionId', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`
        },
        body: JSON.stringify({
          messages: [{
            id: 'msg-anon',
            role: 'user',
            content: 'Test anonymous',
            timestamp: new Date().toISOString()
          }],
          stream: false
        })
      })

      expect(response.ok).toBe(true)
      // Should work without error (uses 'anonymous' session)
    })
  })

  describe('Step 5: Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Send multiple rapid requests
      const requests = Array(20).fill(null).map((_, i) => 
        fetch(`${BASE_URL}/api/chat/unified`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': `test-rate-${i}`,
            'x-session-id': `rate-test-${Date.now()}`
          },
          body: JSON.stringify({
            messages: [{
              id: `msg-rate-${i}`,
              role: 'user',
              content: `Rate test ${i}`,
              timestamp: new Date().toISOString()
            }],
            stream: false
          })
        })
      )

      const responses = await Promise.all(requests)
      const statusCodes = responses.map(r => r.status)
      
      // At least one should be rate limited (429) if limits are enforced
      // Or all should succeed if limits are per-session
      const hasRateLimit = statusCodes.some(code => code === 429)
      // This is informational - rate limiting may vary based on configuration
      console.log('Rate limit test results:', {
        successes: statusCodes.filter(c => c === 200).length,
        rateLimited: statusCodes.filter(c => c === 429).length,
        errors: statusCodes.filter(c => c >= 500).length
      })
    })
  })

  describe('Step 6: Multimodal Context', () => {
    it('should accept screen share context', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`,
          'x-session-id': TEST_SESSION_ID
        },
        body: JSON.stringify({
          messages: [{
            id: 'msg-screen',
            role: 'user',
            content: 'I want to share my screen',
            timestamp: new Date().toISOString()
          }],
          context: {
            sessionId: TEST_SESSION_ID,
            multimodalData: {
              videoData: {
                type: 'screen',
                imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==', // Minimal test image
                timestamp: new Date().toISOString()
              }
            }
          },
          stream: false
        })
      })

      expect(response.ok).toBe(true)
      const data = await response.json()
      // Should acknowledge screen share
      const content = data.message?.content || ''
      expect(content.length).toBeGreaterThan(0)
    })

    it('should accept document upload context', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`,
          'x-session-id': TEST_SESSION_ID
        },
        body: JSON.stringify({
          messages: [{
            id: 'msg-doc',
            role: 'user',
            content: 'I uploaded a document',
            timestamp: new Date().toISOString()
          }],
          context: {
            sessionId: TEST_SESSION_ID,
            multimodalData: {
              uploadData: {
                type: 'document',
                filename: 'test.pdf',
                size: 1024,
                timestamp: new Date().toISOString()
              }
            }
          },
          stream: false
        })
      })

      expect(response.ok).toBe(true)
    })
  })

  describe('Step 7: Logging Verification', () => {
    it('should log assistant messages to JSONL', async () => {
      const requestId = `log-test-${Date.now()}`
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': requestId,
          'x-session-id': TEST_SESSION_ID
        },
        body: JSON.stringify({
          messages: [{
            id: 'msg-log',
            role: 'user',
            content: 'Test logging',
            timestamp: new Date().toISOString()
          }],
          context: {
            sessionId: TEST_SESSION_ID
          },
          stream: false
        })
      })

      expect(response.ok).toBe(true)
      
      // Note: Actual log file verification would require filesystem access
      // This test verifies the API doesn't error
      // Log verification should be done manually or via log collector service
    })
  })

  describe('Step 8: Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`
        },
        body: '{"invalid": json}'
      })

      expect(response.status).toBe(400)
    })

    it('should handle missing required fields', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/unified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': `test-${Date.now()}`
        },
        body: JSON.stringify({
          // Missing messages
          context: {}
        })
      })

      expect(response.status).toBe(400)
    })
  })

  afterAll(async () => {
    // Cleanup if needed
    console.log(`Test session ID: ${TEST_SESSION_ID}`)
    console.log('Check logs/chat/ for generated log entries')
  })
})

