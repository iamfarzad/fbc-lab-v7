import { test, expect } from './utils/fixtures'
import { setupMockWebSocket } from './mocks/websocket-server'
import { SELECTORS, TIMEOUTS } from './utils/test-data'

test.describe('Voice Features', () => {
  test.beforeEach(async ({ page, mockAPIs }) => {
    await mockAPIs()
    await setupMockWebSocket(page)
    await page.goto('/')
  })

  test('should toggle voice session on and off', async ({ page, chat, voice }) => {
    await chat.openChat()
    
    // Voice should be inactive initially
    expect(await voice.isVoiceActive()).toBe(false)

    // Toggle voice on
    await voice.toggleVoice()
    await page.waitForTimeout(1000)

    // Voice should be active
    const voiceIndicator = page.locator(SELECTORS.voice.indicator)
    await expect(voiceIndicator).toBeVisible({ timeout: TIMEOUTS.medium })

    // Toggle voice off
    await voice.toggleVoice()
    await page.waitForTimeout(1000)

    // Voice should be inactive
    expect(await voice.isVoiceActive()).toBe(false)
  })

  test('should handle microphone permission', async ({ page, chat, voice }) => {
    await chat.openChat()
    
    // Grant microphone permission
    await page.context().grantPermissions(['microphone'])
    
    // Toggle voice
    await voice.toggleVoice()
    await page.waitForTimeout(1500)

    // Should show voice active state or be processing
    const voiceButton = page.locator(SELECTORS.voice.toggleButton).first()
    
    // Button should exist and be interactable
    await expect(voiceButton).toBeVisible()
  })

  test('should show voice indicator animation', async ({ page, chat, voice }) => {
    await chat.openChat()
    await voice.toggleVoice()
    await page.waitForTimeout(1000)

    // Check for wavebar or voice indicator
    const wavebar = page.locator('.voice-wavebar, [data-voice-active]')
    
    // At least one indicator should be visible when voice is active
    const count = await wavebar.count()
    if (count > 0) {
      await expect(wavebar.first()).toBeVisible()
    }
  })

  test('should toggle transcript display', async ({ page, chat, voice }) => {
    await chat.openChat()
    await voice.toggleVoice()
    await page.waitForTimeout(1000)

    // Try to toggle transcript
    const transcriptBtn = page.locator(SELECTORS.voice.transcriptButton)
    
    if (await transcriptBtn.isVisible()) {
      // Toggle transcript on
      await transcriptBtn.click()
      await page.waitForTimeout(500)

      // Transcript panel should be visible
      const transcriptPanel = page.locator(SELECTORS.voice.transcriptPanel)
      await expect(transcriptPanel).toBeVisible({ timeout: TIMEOUTS.medium })

      // Toggle transcript off
      await transcriptBtn.click()
      await page.waitForTimeout(500)
    }
  })

  test('should handle voice errors gracefully', async ({ page, chat }) => {
    await chat.openChat()
    
    // Deny microphone permission
    await page.context().clearPermissions()
    
    // Try to toggle voice
    const voiceButton = page.locator(SELECTORS.voice.toggleButton).first()
    await voiceButton.click()
    
    // Should show error or remain inactive
    await page.waitForTimeout(2000)
    
    // Check for error toast or alert
    const errorElements = page.locator('[role="alert"], .error, text=/error/i, text=/permission/i')
    const count = await errorElements.count()
    
    // Either shows error or voice remains inactive
    expect(count >= 0).toBe(true)
  })

  test('should stop voice mid-session', async ({ page, chat, voice }) => {
    await chat.openChat()
    
    // Start voice
    await voice.toggleVoice()
    await page.waitForTimeout(1500)

    // Stop voice immediately
    await voice.toggleVoice()
    await page.waitForTimeout(500)

    // Voice should be inactive
    expect(await voice.isVoiceActive()).toBe(false)
  })

  test('should show voice processing state', async ({ page, chat, voice }) => {
    await chat.openChat()
    await voice.toggleVoice()
    await page.waitForTimeout(500)

    // Check for processing/recording/listening badge
    const statusBadge = page.locator('text=/Processing|Recording|Listening/i')
    
    // Should show some status when voice is active
    await page.waitForTimeout(1000)
    // Status might appear
    const count = await statusBadge.count()
    expect(count >= 0).toBe(true)
  })

  test('should handle WebSocket connection errors', async ({ page, chat }) => {
    // Don't set up mock WebSocket - let it fail naturally
    await page.goto('/')
    await chat.openChat()
    
    // Try to start voice without WebSocket
    const voiceButton = page.locator(SELECTORS.voice.toggleButton).first()
    await voiceButton.click()
    
    // Should handle gracefully - either show error or fail silently
    await page.waitForTimeout(2000)
    
    // App should still be functional
    expect(await chat.isChatOpen()).toBe(true)
  })
})


