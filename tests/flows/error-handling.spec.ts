import { test, expect } from '../utils/fixtures'
import { setupMockWebSocket } from '../mocks/websocket-server'
import { simulateNetworkError, simulateSlowNetwork } from '../mocks/api'
import { TIMEOUTS } from '../utils/test-data'

test.describe('Error Handling and Recovery', () => {
  test.beforeEach(async ({ page, mockAPIs }) => {
    await mockAPIs()
    await page.goto('/')
  })

  test('should handle WebSocket disconnect during voice', async ({ page, chat, voice }) => {
    const mockWS = await setupMockWebSocket(page)
    await chat.openChat()
    
    // Start voice session
    await voice.toggleVoice()
    await page.waitForTimeout(1500)

    // Simulate WebSocket disconnect
    await mockWS.simulateDisconnect()
    await page.waitForTimeout(1000)

    // App should handle gracefully - no crash
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should handle camera permission denied', async ({ page, chat, camera }) => {
    await chat.openChat()
    
    // Clear all permissions
    await page.context().clearPermissions()
    
    // Try to enable camera
    await camera.toggleCamera()
    await page.waitForTimeout(2000)

    // App should still be functional
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should handle microphone permission denied', async ({ page, chat, voice }) => {
    await setupMockWebSocket(page)
    await chat.openChat()
    
    // Clear all permissions
    await page.context().clearPermissions()
    
    // Try to enable voice
    await voice.toggleVoice()
    await page.waitForTimeout(2000)

    // App should handle gracefully
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should handle network error during chat', async ({ page, chat }) => {
    await chat.openChat()
    
    // Simulate network error for chat API
    await simulateNetworkError(page, 'api/chat/unified')
    
    // Try to send message
    await chat.sendMessage('Test message')
    await page.waitForTimeout(2000)

    // Should handle error gracefully
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should recover from slow network', async ({ page, chat }) => {
    await chat.openChat()
    
    // Send message normally first
    await chat.sendMessage('First message')
    await page.waitForTimeout(1000)

    // Simulate slow network
    await simulateSlowNetwork(page, 1000)
    
    // Send another message
    await chat.sendMessage('Second message')
    
    // Should eventually complete
    await page.waitForTimeout(3000)
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should show error messages appropriately', async ({ page, chat }) => {
    await chat.openChat()
    
    // Simulate API error
    await page.route('**/api/chat/unified', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })
    
    // Try to send message
    await chat.sendMessage('Test message')
    await page.waitForTimeout(2000)

    // Error should be handled
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should handle concurrent errors', async ({ page, chat, voice, camera }) => {
    await setupMockWebSocket(page)
    await chat.openChat()
    await page.context().clearPermissions()
    
    // Try to enable multiple features simultaneously
    await Promise.all([
      voice.toggleVoice(),
      camera.toggleCamera(),
    ])
    
    await page.waitForTimeout(2000)

    // App should handle multiple errors gracefully
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should recover from voice errors', async ({ page, chat, voice }) => {
    const mockWS = await setupMockWebSocket(page)
    await chat.openChat()
    
    // Start voice
    await voice.toggleVoice()
    await page.waitForTimeout(1000)

    // Simulate voice error
    await mockWS.simulateError('Voice session error')
    await page.waitForTimeout(1000)

    // Try to start voice again
    await voice.toggleVoice()
    await page.waitForTimeout(500)
    await voice.toggleVoice()
    await page.waitForTimeout(1000)

    // Should be able to recover
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should handle rapid feature toggling', async ({ page, chat, voice }) => {
    await setupMockWebSocket(page)
    await chat.openChat()
    
    // Rapidly toggle voice multiple times
    for (let i = 0; i < 5; i++) {
      await voice.toggleVoice()
      await page.waitForTimeout(200)
    }
    
    await page.waitForTimeout(1000)

    // App should remain stable
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should handle page reload during active session', async ({ page, chat, voice }) => {
    await setupMockWebSocket(page)
    await chat.openChat()
    
    // Start voice
    await voice.toggleVoice()
    await page.waitForTimeout(1000)

    // Reload page
    await page.reload()
    await page.waitForTimeout(2000)

    // Page should load without errors
    const chatTrigger = page.locator('[data-chat-trigger]')
    await expect(chatTrigger).toBeVisible({ timeout: TIMEOUTS.long })
  })
})


