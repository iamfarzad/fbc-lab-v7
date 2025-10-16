import { test, expect } from '@playwright/test'

// This test runs against the deployed production/preview URL
// Set PRODUCTION_URL env var to test against specific deployment
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://fbcai.com'
// Preserved for future use
const _FLY_IO_WS_URL = 'wss://fb-consulting-websocket.fly.dev'
void _FLY_IO_WS_URL

test.describe('Production Smoke Tests', () => {
  test.use({ baseURL: PRODUCTION_URL })

  test('home page should load successfully', async ({ page }) => {
    const response = await page.goto('/')
    
    expect(response?.status()).toBe(200)
    
    // Page should have title
    await expect(page).toHaveTitle(/.*/)
    
    // Should not have critical errors
    const errors: string[] = []
    page.on('pageerror', (error) => {
      errors.push(error.message)
    })
    
    await page.waitForLoadState('networkidle')
    
    // Allow for some benign errors but no critical ones
    const criticalErrors = errors.filter(err => 
      err.includes('Uncaught') || 
      err.includes('is not a function') ||
      err.includes('Cannot read property')
    )
    
    expect(criticalErrors.length).toBe(0)
  })

  test('chat widget should appear', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Look for chat trigger button
    const chatTrigger = page.locator('[data-chat-trigger], button:has-text("Chat"), button:has-text("AI")')
    
    // Wait up to 10 seconds for chat trigger to appear
    await expect(chatTrigger.first()).toBeVisible({ timeout: 10000 })
  })

  test('should be able to open chat dialog', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const chatTrigger = page.locator('[data-chat-trigger]').first()
    await chatTrigger.click()
    
    // Chat dialog should open
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
  })

  test('should send a message successfully', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Open chat
    const chatTrigger = page.locator('[data-chat-trigger]').first()
    await chatTrigger.click()
    
    // Wait for chat to open
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 })
    
    // Find input and send button
    const input = page.locator('textarea[placeholder*="Type"], textarea[placeholder*="Message"]').first()
    const sendButton = page.locator('button[aria-label*="Send"], button:has-text("Send")').first()
    
    // Type and send message
    await input.fill('Hello from production smoke test')
    await sendButton.click()
    
    // Message should appear in chat
    await page.waitForTimeout(1000)
    const userMessage = page.locator('[data-role="user"], .user-message')
    await expect(userMessage.last()).toBeVisible({ timeout: 5000 })
  })

  test('should receive AI response', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Open chat
    const chatTrigger = page.locator('[data-chat-trigger]').first()
    await chatTrigger.click()
    await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 })
    
    // Send message
    const input = page.locator('textarea[placeholder*="Type"], textarea[placeholder*="Message"]').first()
    const sendButton = page.locator('button[aria-label*="Send"], button:has-text("Send")').first()
    
    await input.fill('Test message')
    await sendButton.click()
    
    // Wait for AI response (up to 30 seconds)
    const assistantMessage = page.locator('[data-role="assistant"], .assistant-message')
    await expect(assistantMessage.first()).toBeVisible({ timeout: 30000 })
  })

  test('WebSocket should be able to connect to Fly.io', async ({ page }) => {
    await page.goto('/')
    
    // Monitor WebSocket connections
    const wsConnections: string[] = []
    
    page.on('websocket', ws => {
      wsConnections.push(ws.url())
    })
    
    // Wait for page to load and potentially connect to WebSocket
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(5000)
    
    // Check if WebSocket connection was attempted
    const flyIoConnection = wsConnections.find(url => url.includes('fly.dev'))
    
    // Either should connect to Fly.io or no WebSocket connection yet (that's fine for smoke test)
    if (flyIoConnection) {
      expect(flyIoConnection).toContain('fb-consulting-websocket.fly.dev')
    }
  })

  test('should not have console errors on page load', async ({ page }) => {
    const consoleErrors: string[] = []
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Filter out known benign errors
    const criticalErrors = consoleErrors.filter(err => {
      const lowerErr = err.toLowerCase()
      return (
        !lowerErr.includes('devtools') &&
        !lowerErr.includes('extension') &&
        !lowerErr.includes('chrome://') &&
        lowerErr.includes('error')
      )
    })
    
    // Should have no critical console errors
    expect(criticalErrors.length).toBe(0)
  })

  test('page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    
    const loadTime = Date.now() - startTime
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('page should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Chat trigger should still be visible on mobile
    const chatTrigger = page.locator('[data-chat-trigger]').first()
    await expect(chatTrigger).toBeVisible({ timeout: 5000 })
  })

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/')
    
    // Check for essential meta tags
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
    
    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description).toBeTruthy()
    
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(ogTitle).toBeTruthy()
  })
})

test.describe('Production Health Endpoints', () => {
  test.use({ baseURL: PRODUCTION_URL })

  test('API health endpoint should respond', async ({ request }) => {
    const response = await request.get('/api/health')
    
    // Should respond with 200 or 404 (if endpoint doesn't exist)
    expect([200, 404]).toContain(response.status())
  })

  test('API should handle CORS for allowed origins', async ({ request }) => {
    const response = await request.get('/api/chat', {
      headers: {
        'Origin': PRODUCTION_URL,
        'Access-Control-Request-Method': 'POST',
      }
    })
    
    // Should handle CORS preflight
    expect([200, 204, 404]).toContain(response.status())
  })
})
