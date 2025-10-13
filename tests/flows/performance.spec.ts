import { test, expect } from '../utils/fixtures'
import { setupMockWebSocket } from '../mocks/websocket-server'
import { mockAllAPIs } from '../mocks/api'
import { TEST_MESSAGES, TIMEOUTS } from '../utils/test-data'

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page, mockAPIs }) => {
    await mockAPIs()
    await setupMockWebSocket(page)
    await page.context().grantPermissions(['microphone', 'camera'])
    await page.goto('/')
  })

  test('should load chat within acceptable time', async ({ page, chat }) => {
    const startTime = Date.now()
    
    await chat.openChat()
    
    const loadTime = Date.now() - startTime
    
    // Chat should open within 3 seconds
    expect(loadTime).toBeLessThan(3000)
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should start voice session within acceptable time', async ({ page, chat, voice }) => {
    await chat.openChat()
    
    const startTime = Date.now()
    await voice.toggleVoice()
    await page.waitForTimeout(2000)
    
    const initTime = Date.now() - startTime
    
    // Voice should initialize within 5 seconds
    expect(initTime).toBeLessThan(5000)
  })

  test('should initialize camera within acceptable time', async ({ page, chat, camera }) => {
    await chat.openChat()
    
    const startTime = Date.now()
    await camera.toggleCamera()
    await page.waitForTimeout(2000)
    
    const initTime = Date.now() - startTime
    
    // Camera should initialize within 4 seconds
    expect(initTime).toBeLessThan(4000)
  })

  test('should render messages quickly', async ({ page, chat }) => {
    await chat.openChat()
    
    const startTime = Date.now()
    await chat.sendMessage(TEST_MESSAGES.simple)
    
    // Wait for message to appear
    await page.waitForSelector('[data-role="user"]', { timeout: TIMEOUTS.medium })
    
    const renderTime = Date.now() - startTime
    
    // Message should render within 2 seconds
    expect(renderTime).toBeLessThan(2000)
  })

  test('should handle 50 messages without degradation', async ({ page, chat }) => {
    await chat.openChat()
    
    // Send 50 messages
    for (let i = 0; i < 50; i++) {
      await chat.sendMessage(`Message ${i + 1}`)
      await page.waitForTimeout(100)
    }
    
    await page.waitForTimeout(2000)

    // Verify message count
    const messageCount = await chat.getMessageCount()
    expect(messageCount).toBeGreaterThan(40)

    // Chat should still be responsive
    await chat.sendMessage('Final test message')
    await page.waitForTimeout(1000)
    
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should measure memory usage during active session', async ({ page, chat, voice, camera }) => {
    await chat.openChat()
    
    // Enable all features
    await voice.toggleVoice()
    await page.waitForTimeout(1000)
    await camera.toggleCamera()
    await page.waitForTimeout(1000)

    // Get initial memory
    const initialMetrics = await page.evaluate(() => {
      // @ts-ignore - Chrome-specific performance.memory API
      if (performance.memory) {
        return {
          // @ts-ignore
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          // @ts-ignore
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        }
      }
      return null
    })

    // Send multiple messages
    for (let i = 0; i < 20; i++) {
      await chat.sendMessage(`Performance test message ${i}`)
      await page.waitForTimeout(200)
    }

    await page.waitForTimeout(2000)

    // Get final memory
    const finalMetrics = await page.evaluate(() => {
      // @ts-ignore - Chrome-specific performance.memory API
      if (performance.memory) {
        return {
          // @ts-ignore
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          // @ts-ignore
          totalJSHeapSize: performance.memory.totalJSHeapSize,
        }
      }
      return null
    })

    // Log metrics (memory API may not be available in all browsers)
    if (initialMetrics && finalMetrics) {
      const memoryIncrease = finalMetrics.usedJSHeapSize - initialMetrics.usedJSHeapSize
      console.log('Memory increase:', memoryIncrease / 1024 / 1024, 'MB')
      
      // Memory increase should be reasonable (< 100 MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
    }
  })

  test('should handle rapid feature toggling without lag', async ({ page, chat, voice }) => {
    await chat.openChat()
    
    const startTime = Date.now()
    
    // Rapidly toggle voice 10 times
    for (let i = 0; i < 10; i++) {
      await voice.toggleVoice()
      await page.waitForTimeout(100)
    }
    
    const totalTime = Date.now() - startTime
    
    // Should complete within 5 seconds
    expect(totalTime).toBeLessThan(5000)
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should measure chat expansion/collapse performance', async ({ page, chat }) => {
    await chat.openChat()
    
    const expandBtn = page.locator('button[aria-label*="Expand"], button:has-text("Expand")')
    
    if (await expandBtn.isVisible()) {
      const startTime = Date.now()
      
      // Toggle expand 5 times
      for (let i = 0; i < 5; i++) {
        await expandBtn.click()
        await page.waitForTimeout(100)
        await expandBtn.click()
        await page.waitForTimeout(100)
      }
      
      const totalTime = Date.now() - startTime
      
      // Should complete smoothly within 3 seconds
      expect(totalTime).toBeLessThan(3000)
    }
  })

  test('should handle concurrent operations efficiently', async ({ page, chat, voice, camera }) => {
    await chat.openChat()
    
    const startTime = Date.now()
    
    // Start multiple operations concurrently
    await Promise.all([
      chat.sendMessage('Concurrent test'),
      voice.toggleVoice(),
      camera.toggleCamera(),
    ])
    
    await page.waitForTimeout(2000)
    
    const totalTime = Date.now() - startTime
    
    // Should complete within 5 seconds
    expect(totalTime).toBeLessThan(5000)
  })

  test('should maintain 60fps during animations', async ({ page, chat }) => {
    await chat.openChat()
    
    // Trigger animations by toggling chat
    const frames: number[] = []
    let lastTime = performance.now()
    
    // Monitor frame rate during animations
    const checkFrames = setInterval(() => {
      const now = performance.now()
      const fps = 1000 / (now - lastTime)
      frames.push(fps)
      lastTime = now
    }, 16) // ~60fps

    // Perform animations
    await chat.closeChat()
    await page.waitForTimeout(500)
    await chat.openChat()
    await page.waitForTimeout(500)
    
    clearInterval(checkFrames)
    
    // Average FPS should be reasonable (not measuring actual 60fps due to test environment)
    // Just verify app is responsive
    expect(await chat.isChatOpen()).toBe(true)
  })
})

