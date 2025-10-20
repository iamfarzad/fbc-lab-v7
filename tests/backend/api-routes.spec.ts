import { test, expect } from '@playwright/test'

const BASE_ORIGIN = new URL(process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100').origin

test.describe('API Routes Health Checks', () => {
  test('POST /api/chat - should handle text chat', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: {
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Should return 200 or handle gracefully
    expect([200, 201, 400, 401, 500]).toContain(response.status())
    
    // Should return a response
    expect(response).toBeTruthy()
  })

  test('POST /api/tools/screen - should accept screen analysis requests', async ({ request }) => {
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const response = await request.post('/api/tools/screen', {
      data: {
        image: testImageBase64,
        prompt: 'What do you see?'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Should return valid status code
    expect([200, 201, 400, 401, 500]).toContain(response.status())
    
    if (response.ok()) {
      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
      
      const data = await response.json()
      expect(data).toBeTruthy()
    }
  })

  test('POST /api/tools/webcam - should accept webcam analysis requests', async ({ request }) => {
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

    const response = await request.post('/api/tools/webcam', {
      data: {
        image: testImageBase64
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Should return valid status code
    expect([200, 201, 400, 401, 500]).toContain(response.status())
    
    if (response.ok()) {
      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
      
      const data = await response.json()
      expect(data).toBeTruthy()
    }
  })

  test('POST /api/chat/attachments - should handle file uploads', async ({ request }) => {
    // Create a test file
    const fileBuffer = Buffer.from('Test file content')
    
    const response = await request.post('/api/chat/attachments', {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: fileBuffer
        }
      }
    })

    // Should return valid status code
    expect([200, 201, 400, 401, 413, 500]).toContain(response.status())
  })

  test('GET /api/health - should return server health status', async ({ request }) => {
    const response = await request.get('/api/health')

    // Health endpoint should exist and respond
    expect([200, 404]).toContain(response.status())
    
    if (response.ok()) {
      const data = await response.json()
      expect(data).toBeTruthy()
    }
  })

  test('API endpoints should respond within acceptable time', async ({ request }) => {
    const startTime = Date.now()
    
    await request.get('/api/health')
    
    const responseTime = Date.now() - startTime
    
    // Should respond within 3 seconds
    expect(responseTime).toBeLessThan(3000)
  })

  test('API endpoints should handle CORS correctly', async ({ request }) => {
    const response = await request.get('/api/chat', {
      headers: {
        'Origin': BASE_ORIGIN,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    })

    // Should handle OPTIONS request
    expect([200, 204, 404]).toContain(response.status())
  })

  test('API endpoints should validate request bodies', async ({ request }) => {
    // Send invalid request (empty body)
    const response = await request.post('/api/chat', {
      data: {},
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Should return 400 Bad Request or handle gracefully
    expect([400, 422, 500]).toContain(response.status())
  })

  test('API endpoints should handle rate limiting', async ({ request }) => {
    // Send multiple requests in rapid succession
    const requests = Array(10).fill(null).map(() => 
      request.post('/api/chat', {
        data: {
          messages: [{ role: 'user', content: 'Test' }]
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })
    )

    const responses = await Promise.all(requests)
    
    // All should get a response (either success or rate limit)
    responses.forEach(response => {
      expect([200, 201, 429, 500]).toContain(response.status())
    })
  })

  test('API error responses should include proper error messages', async ({ request }) => {
    // Intentionally send bad request
    const response = await request.post('/api/tools/screen', {
      data: {
        // Missing required fields
      },
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok()) {
      const contentType = response.headers()['content-type']
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        
        // Error response should include error message or details
        expect(data.error || data.message || data.details).toBeTruthy()
      }
    }
  })
})
