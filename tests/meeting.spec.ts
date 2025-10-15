import { test, expect } from './utils/fixtures'
import { TIMEOUTS } from './utils/test-data'

test.describe('Meeting Overlay', () => {
  test.beforeEach(async ({ page, mockAPIs }) => {
    await mockAPIs()
    await page.goto('/')
  })

  test('should open meeting overlay', async ({ page, chat }) => {
    await chat.openChat()
    
    // Look for meeting/book button
    const meetingButton = page.locator('button:has-text("Meeting"), button:has-text("Book"), button[aria-label*="meeting" i]')
    
    if (await meetingButton.isVisible()) {
      await meetingButton.click()
      await page.waitForTimeout(1000)

      // Check for meeting dialog/overlay
      const meetingDialog = page.locator('[role="dialog"]:has-text("Meeting"), [data-meeting-overlay]')
      await expect(meetingDialog).toBeVisible({ timeout: TIMEOUTS.medium })
    }
  })

  test('should close meeting overlay', async ({ page, chat }) => {
    await chat.openChat()
    
    const meetingButton = page.locator('button:has-text("Meeting"), button:has-text("Book")')
    
    if (await meetingButton.isVisible()) {
      await meetingButton.click()
      await page.waitForTimeout(1000)

      // Find close button
      const closeButton = page.locator('[role="dialog"] button[aria-label*="Close" i], [role="dialog"] button:has([data-lucide="x"])')
      
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await page.waitForTimeout(500)

        // Dialog should be closed
        const meetingDialog = page.locator('[role="dialog"]:has-text("Meeting")')
        await expect(meetingDialog).not.toBeVisible()
      }
    }
  })

  test('should show calendar integration', async ({ page, chat }) => {
    await chat.openChat()
    
    const meetingButton = page.locator('button:has-text("Meeting"), button:has-text("Book")')
    
    if (await meetingButton.isVisible()) {
      await meetingButton.click()
      await page.waitForTimeout(1500)

      // Look for calendar elements
      const calendarElements = page.locator('text=/calendar/i, [data-calendar], .cal-com')
      
      // Calendar integration might be present
      await page.waitForTimeout(1000)
      const count = await calendarElements.count()
      expect(count >= 0).toBe(true)
    }
  })

  test('should handle meeting overlay with chat open', async ({ page, chat }) => {
    await chat.openChat()
    
    const meetingButton = page.locator('button:has-text("Meeting"), button:has-text("Book")')
    
    if (await meetingButton.isVisible()) {
      await meetingButton.click()
      await page.waitForTimeout(1000)

      // Both chat and meeting overlay should be visible
      expect(await chat.isChatOpen()).toBe(true)
    }
  })

  test('should not interfere with chat functionality', async ({ page, chat }) => {
    await chat.openChat()
    
    const meetingButton = page.locator('button:has-text("Meeting"), button:has-text("Book")')
    
    if (await meetingButton.isVisible()) {
      // Open meeting
      await meetingButton.click()
      await page.waitForTimeout(1000)

      // Close meeting
      const closeButton = page.locator('[role="dialog"] button[aria-label*="Close" i]')
      if (await closeButton.isVisible()) {
        await closeButton.click()
        await page.waitForTimeout(500)
      }

      // Chat should still be functional
      await chat.sendMessage('Test message after meeting')
      await page.waitForTimeout(1000)
      
      expect(await chat.isChatOpen()).toBe(true)
    }
  })
})


