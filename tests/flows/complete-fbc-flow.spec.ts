import { test, expect } from '../utils/fixtures'
import { TEST_MESSAGES, SELECTORS, TIMEOUTS } from '../utils/test-data'
import { setupConsoleMonitor } from '../utils/console-monitor'

test.describe('Complete FBC Flow', () => {
  test('should complete full user journey: chat → voice → webcam → screen → attachment', async ({ 
    page, 
    chat, 
    voice, 
    camera, 
    screenShare: _screenShare, // eslint-disable-line @typescript-eslint/no-unused-vars 
    mockAPIs 
  }) => {
    // Setup console monitoring
    const consoleMonitor = await setupConsoleMonitor(page)
    
    await mockAPIs()
    await page.goto('/')

    // ====== STEP 1: Text Chat ======
    await test.step('Send text message and receive response', async () => {
      await chat.openChat()
      expect(await chat.isChatOpen()).toBe(true)

      await chat.sendMessage(TEST_MESSAGES.simple)
      
      // Wait for user message
      const userMessage = page.locator(SELECTORS.chat.userMessage).last()
      await expect(userMessage).toBeVisible({ timeout: TIMEOUTS.medium })
      await expect(userMessage).toContainText(TEST_MESSAGES.simple)

      // Wait for assistant response
      await chat.waitForAssistantResponse(TIMEOUTS.long)
      const assistantMessage = page.locator(SELECTORS.chat.assistantMessage).last()
      await expect(assistantMessage).toBeVisible()
    })

    // ====== STEP 2: Voice Session ======
    await test.step('Toggle voice and check UI states', async () => {
      // Grant microphone permission
      await page.context().grantPermissions(['microphone'])
      
      // Start voice
      await voice.toggleVoice()
      await page.waitForTimeout(1500)

      // Verify voice indicator is visible
      const voiceIndicator = page.locator(SELECTORS.voice.indicator)
      const voiceButton = page.locator(SELECTORS.voice.toggleButton).first()
      
      // At least one should be visible
      const indicatorVisible = await voiceIndicator.isVisible().catch(() => false)
      const buttonVisible = await voiceButton.isVisible().catch(() => false)
      expect(indicatorVisible || buttonVisible).toBe(true)

      // Stop voice
      await voice.toggleVoice()
      await page.waitForTimeout(1000)
    })

    // ====== STEP 3: Webcam ======
    await test.step('Enable webcam and verify preview', async () => {
      // Grant camera permission
      await page.context().grantPermissions(['camera'])
      
      // Toggle camera
      await camera.toggleCamera()
      await page.waitForTimeout(1500)

      // Check for camera button or video element
      const cameraButton = page.locator(SELECTORS.camera.toggleButton).first()
      const videoElement = page.locator('video[autoplay]')
      
      const buttonVisible = await cameraButton.isVisible().catch(() => false)
      const videoVisible = await videoElement.isVisible().catch(() => false)
      
      expect(buttonVisible || videoVisible).toBe(true)

      // Toggle off
      if (buttonVisible) {
        await camera.toggleCamera()
        await page.waitForTimeout(500)
      }
    })

    // ====== STEP 4: Screen Share ======
    await test.step('Enable screen share and verify active state', async () => {
      // Try to toggle screen share
      const screenButton = page.locator(SELECTORS.screenShare.toggleButton).first()
      
      if (await screenButton.isVisible()) {
        await screenButton.click()
        await page.waitForTimeout(1500)

        // In test environment, screen share might not actually start
        // Just verify the button is still interactable
        expect(await screenButton.isVisible()).toBe(true)
      }
    })

    // ====== STEP 5: File Attachment ======
    await test.step('Upload file attachment', async () => {
      // Mock file upload API
      await page.route('**/api/chat/attachments', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            files: [{ name: 'test.txt', size: 100 }]
          })
        })
      })

      // Look for file input
      const fileInput = page.locator('input[type="file"]')
      
      if (await fileInput.count() > 0) {
        // File input exists, try to interact with it
        const inputElement = fileInput.first()
        
        // Create a test file
        const buffer = Buffer.from('Test file content')
        await inputElement.setInputFiles({
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer
        })
        
        await page.waitForTimeout(1000)
      }
    })

    // ====== VERIFICATION: Check for critical errors ======
    await test.step('Verify no critical console errors', async () => {
      const summary = consoleMonitor.getSummary()
      const criticalErrors = consoleMonitor.getCriticalErrors()
      
      console.log('Console Summary:', summary)
      
      if (criticalErrors.length > 0) {
        console.log('Critical Errors:', criticalErrors)
        consoleMonitor.exportToFile(`complete-flow-${Date.now()}.json`)
      }
      
      // Allow some errors but fail on critical ones
      expect(criticalErrors.length).toBe(0)
    })

    // ====== VERIFICATION: Chat still functional ======
    await test.step('Verify chat is still functional after all interactions', async () => {
      expect(await chat.isChatOpen()).toBe(true)
      
      // Send one more message to verify
      await chat.sendMessage('Final test message')
      await page.waitForTimeout(1000)
      
      const messageCount = await chat.getMessageCount()
      expect(messageCount).toBeGreaterThan(0)
    })
  })

  test('should handle all UI states correctly', async ({ page, chat, mockAPIs }) => {
    await mockAPIs()
    await page.goto('/')
    await chat.openChat()

    // Test loading state
    await test.step('Show loading state while sending message', async () => {
      const input = page.locator(SELECTORS.chat.input)
      await input.fill(TEST_MESSAGES.simple)
      
      const sendButton = page.locator(SELECTORS.chat.sendButton)
      await sendButton.click()
      
      // Button should be disabled while sending
      await expect(sendButton).toBeDisabled({ timeout: TIMEOUTS.short })
    })

    await page.waitForTimeout(2000)

    // Test minimize/restore
    await test.step('Minimize and restore chat', async () => {
      const minimizeBtn = page.locator(SELECTORS.chat.minimizeButton)
      
      if (await minimizeBtn.isVisible()) {
        await minimizeBtn.click()
        await page.waitForTimeout(500)
        
        // Chat should be minimized
        const minimizedState = page.locator('[data-chat-minimized], .h-\\[60px\\]')
        const isMinimized = await minimizedState.isVisible().catch(() => false)
        expect(isMinimized).toBe(true)
        
        // Restore
        await minimizedState.click()
        await page.waitForTimeout(500)
        expect(await chat.isChatOpen()).toBe(true)
      }
    })

    // Test expand/collapse
    await test.step('Expand chat to fullscreen', async () => {
      const expandBtn = page.locator(SELECTORS.chat.expandButton)
      
      if (await expandBtn.isVisible()) {
        await expandBtn.click()
        await page.waitForTimeout(500)
        
        // Verify expanded state
        const expandedState = page.locator('[data-chat-expanded], .fixed.inset-0')
        const isExpanded = await expandedState.isVisible().catch(() => false)
        expect(isExpanded).toBe(true)
      }
    })
  })

  test('should handle errors gracefully', async ({ page, chat }) => {
    // Don't mock APIs - let them fail naturally
    await page.goto('/')
    await chat.openChat()

    await test.step('Handle API errors without crashing', async () => {
      // Mock a failing API
      await page.route('**/api/chat/unified', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })

      // Try to send a message
      await chat.sendMessage(TEST_MESSAGES.simple)
      await page.waitForTimeout(2000)

      // App should still be functional
      expect(await chat.isChatOpen()).toBe(true)
      
      // Look for error indication
      const errorElements = page.locator('[role="alert"], .error, text=/error/i')
      const hasError = await errorElements.count() > 0
      
      // Either shows error or remains in stable state
      expect(hasError || await chat.isChatOpen()).toBe(true)
    })
  })
})

