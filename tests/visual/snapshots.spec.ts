import { test, expect } from '../utils/fixtures'
import { setupMockWebSocket } from '../mocks/websocket-server'

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page, mockAPIs }) => {
    await mockAPIs()
    await setupMockWebSocket(page)
    await page.goto('/')
  })

  test('should match chat widget closed state', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // Take snapshot of closed chat
    await expect(page).toHaveScreenshot('chat-closed.png', {
      maxDiffPixels: 100,
      fullPage: false,
    })
  })

  test('should match chat widget open state', async ({ page, chat }) => {
    await chat.openChat()
    await page.waitForTimeout(1000)

    // Take snapshot of open chat
    await expect(page).toHaveScreenshot('chat-open.png', {
      maxDiffPixels: 100,
      fullPage: false,
    })
  })

  test('should match chat minimized state', async ({ page, chat }) => {
    await chat.openChat()
    await chat.minimizeChat()
    await page.waitForTimeout(500)

    // Take snapshot of minimized chat
    await expect(page).toHaveScreenshot('chat-minimized.png', {
      maxDiffPixels: 100,
      fullPage: false,
    })
  })

  test('should match chat expanded state', async ({ page, chat }) => {
    await chat.openChat()
    
    const expandBtn = page.locator('button[aria-label*="Expand"], button:has-text("Expand")')
    if (await expandBtn.isVisible()) {
      await expandBtn.click()
      await page.waitForTimeout(1000)

      // Take snapshot of expanded chat
      await expect(page).toHaveScreenshot('chat-expanded.png', {
        maxDiffPixels: 200,
        fullPage: true,
      })
    }
  })

  test('should match voice active state', async ({ page, chat, voice }) => {
    await chat.openChat()
    await voice.toggleVoice()
    await page.waitForTimeout(1500)

    // Take snapshot with voice active
    await expect(page).toHaveScreenshot('voice-active.png', {
      maxDiffPixels: 150,
      fullPage: false,
    })
  })

  test('should match camera preview', async ({ page, chat, camera }) => {
    await page.context().grantPermissions(['camera'])
    await chat.openChat()
    await camera.toggleCamera()
    await page.waitForTimeout(2000)

    // Take snapshot with camera preview
    await expect(page).toHaveScreenshot('camera-preview.png', {
      maxDiffPixels: 200,
      fullPage: false,
    })
  })

  test('should match message rendering', async ({ page, chat }) => {
    await chat.openChat()
    await chat.sendMessage('Hello! This is a test message.')
    await page.waitForTimeout(2000)

    // Take snapshot with messages
    const chatDialog = page.locator('[role="dialog"]')
    await expect(chatDialog).toHaveScreenshot('messages-rendered.png', {
      maxDiffPixels: 150,
    })
  })

  test('should match error state', async ({ page, chat }) => {
    await chat.openChat()
    
    // Simulate error by breaking API
    await page.route('**/api/chat/unified', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server error' }),
      })
    })
    
    await chat.sendMessage('This should error')
    await page.waitForTimeout(2000)

    // Take snapshot of error state
    await expect(page).toHaveScreenshot('error-state.png', {
      maxDiffPixels: 150,
      fullPage: false,
    })
  })

  test('should match loading state', async ({ page, chat }) => {
    await chat.openChat()
    
    // Delay API response to capture loading state
    await page.route('**/api/chat/unified', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })
    
    const input = page.locator('textarea[placeholder*="Type"]')
    await input.fill('Test message')
    
    const sendButton = page.locator('button[aria-label*="Send"]')
    await sendButton.click()
    
    // Wait briefly to capture loading state
    await page.waitForTimeout(500)

    // Take snapshot of loading state
    await expect(page).toHaveScreenshot('loading-state.png', {
      maxDiffPixels: 150,
      fullPage: false,
    })
  })

  test('should match all modalities active', async ({ page, chat, voice, camera }) => {
    await page.context().grantPermissions(['microphone', 'camera'])
    await chat.openChat()
    
    await voice.toggleVoice()
    await page.waitForTimeout(1000)
    await camera.toggleCamera()
    await page.waitForTimeout(1500)

    // Take snapshot with all modalities
    await expect(page).toHaveScreenshot('all-modalities-active.png', {
      maxDiffPixels: 200,
      fullPage: false,
    })
  })
})


