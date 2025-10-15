import { test, expect } from '../utils/fixtures'
import { setupMockWebSocket } from '../mocks/websocket-server'
import { TEST_MESSAGES, TIMEOUTS } from '../utils/test-data'

test.describe('Multimodal Flow', () => {
  test.beforeEach(async ({ page, mockAPIs }) => {
    await mockAPIs()
    await setupMockWebSocket(page)
    await page.context().grantPermissions(['microphone', 'camera'])
    await page.goto('/')
  })

  test('should enable all modalities in sequence', async ({ page, chat, voice, camera, screenShare }) => {
    // Step 1: Open chat
    await chat.openChat()
    expect(await chat.isChatOpen()).toBe(true)

    // Step 2: Send text message
    await chat.sendMessage(TEST_MESSAGES.simple)
    await page.waitForTimeout(1000)

    // Step 3: Enable voice
    await voice.toggleVoice()
    await page.waitForTimeout(1500)

    // Verify voice is active or processing
    const voiceButton = page.locator('[aria-label*="voice" i]').first()
    await expect(voiceButton).toBeVisible()

    // Step 4: Enable camera
    await camera.toggleCamera()
    await page.waitForTimeout(1500)

    // Verify camera button exists
    const cameraButton = page.locator('[aria-label*="camera" i]').first()
    await expect(cameraButton).toBeVisible()

    // Step 5: Enable screen share
    await screenShare.toggleScreenShare()
    await page.waitForTimeout(1000)

    // All modality buttons should be visible
    await expect(voiceButton).toBeVisible()
    await expect(cameraButton).toBeVisible()
  })

  test('should send message while voice is active', async ({ page, chat, voice }) => {
    await chat.openChat()
    
    // Enable voice
    await voice.toggleVoice()
    await page.waitForTimeout(1500)

    // Send text message while voice is active
    await chat.sendMessage('Message during voice session')
    await page.waitForTimeout(1000)

    // Message should be sent
    const userMessage = page.locator('[data-role="user"]').last()
    await expect(userMessage).toBeVisible({ timeout: TIMEOUTS.medium })
  })

  test('should disable modalities in sequence', async ({ page, chat, voice, camera }) => {
    await chat.openChat()

    // Enable voice and camera
    await voice.toggleVoice()
    await page.waitForTimeout(1000)
    await camera.toggleCamera()
    await page.waitForTimeout(1000)

    // Disable voice
    await voice.toggleVoice()
    await page.waitForTimeout(500)

    // Disable camera
    await camera.toggleCamera()
    await page.waitForTimeout(500)

    // Both should be inactive
    expect(await voice.isVoiceActive()).toBe(false)
    expect(await camera.isCameraActive()).toBe(false)
  })

  test('should handle simultaneous modalities', async ({ page, chat, voice, camera }) => {
    await chat.openChat()

    // Enable voice and camera simultaneously
    await Promise.all([
      voice.toggleVoice(),
      camera.toggleCamera(),
    ])
    
    await page.waitForTimeout(2000)

    // Both buttons should exist
    const voiceButton = page.locator('[aria-label*="voice" i]').first()
    const cameraButton = page.locator('[aria-label*="camera" i]').first()
    
    await expect(voiceButton).toBeVisible()
    await expect(cameraButton).toBeVisible()
  })

  test('should maintain chat functionality with all modalities active', async ({ page, chat, voice, camera }) => {
    await chat.openChat()

    // Enable all modalities
    await voice.toggleVoice()
    await page.waitForTimeout(1000)
    await camera.toggleCamera()
    await page.waitForTimeout(1000)

    // Send multiple messages
    await chat.sendMessage('First message')
    await page.waitForTimeout(1000)
    await chat.sendMessage('Second message')
    await page.waitForTimeout(1000)

    // Verify messages appear
    const messages = page.locator('[data-role="user"]')
    expect(await messages.count()).toBeGreaterThan(0)
  })

  test('should handle modality transitions without errors', async ({ page, chat, voice }) => {
    await chat.openChat()

    // Rapidly toggle modalities
    for (let i = 0; i < 3; i++) {
      await voice.toggleVoice()
      await page.waitForTimeout(500)
      await voice.toggleVoice()
      await page.waitForTimeout(500)
    }

    // Chat should still be functional
    expect(await chat.isChatOpen()).toBe(true)
    
    // Should be able to send messages
    await chat.sendMessage('Test after rapid toggles')
    await page.waitForTimeout(1000)
  })

  test('should preserve chat state during modality changes', async ({ page, chat, voice }) => {
    await chat.openChat()
    
    // Send messages
    await chat.sendMessage('First message')
    await page.waitForTimeout(1000)
    
    const initialCount = await chat.getMessageCount()

    // Enable voice
    await voice.toggleVoice()
    await page.waitForTimeout(1000)

    // Message count should be preserved
    const countAfterVoice = await chat.getMessageCount()
    expect(countAfterVoice).toBeGreaterThanOrEqual(initialCount)
  })

  test('should handle closing chat with active modalities', async ({ page, chat, voice, camera }) => {
    await chat.openChat()

    // Enable modalities
    await voice.toggleVoice()
    await page.waitForTimeout(1000)
    await camera.toggleCamera()
    await page.waitForTimeout(1000)

    // Close chat
    await chat.closeChat()
    await page.waitForTimeout(1000)

    // Reopen chat
    await chat.openChat()

    // Modalities should be inactive
    expect(await voice.isVoiceActive()).toBe(false)
    expect(await camera.isCameraActive()).toBe(false)
  })
})


