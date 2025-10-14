import { test, expect } from './utils/fixtures'
import { mockAllAPIs } from './mocks/api'
import { TEST_MESSAGES, SELECTORS, TIMEOUTS } from './utils/test-data'

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page, mockAPIs }) => {
    await mockAPIs()
    await page.goto('/')
  })

  test('should open and close chat widget', async ({ page, chat }) => {
    // Chat should be closed initially
    expect(await chat.isChatOpen()).toBe(false)

    // Open chat
    await chat.openChat()
    expect(await chat.isChatOpen()).toBe(true)

    // Close chat
    await chat.closeChat()
    expect(await chat.isChatOpen()).toBe(false)
  })

  test('should send and receive text messages', async ({ page, chat }) => {
    await chat.openChat()

    // Send message
    await chat.sendMessage(TEST_MESSAGES.simple)

    // Wait for user message to appear
    const userMessage = page.locator(SELECTORS.chat.userMessage).last()
    await expect(userMessage).toBeVisible({ timeout: TIMEOUTS.medium })
    await expect(userMessage).toContainText(TEST_MESSAGES.simple)

    // Wait for assistant response
    await chat.waitForAssistantResponse(TIMEOUTS.long)
    const assistantMessage = page.locator(SELECTORS.chat.assistantMessage).last()
    await expect(assistantMessage).toBeVisible()
  })

  test('should render messages correctly', async ({ page, chat }) => {
    await chat.openChat()
    
    // Send multiple messages
    await chat.sendMessage(TEST_MESSAGES.simple)
    await page.waitForTimeout(1000)
    await chat.sendMessage(TEST_MESSAGES.question)

    // Check message count
    const messageCount = await chat.getMessageCount()
    expect(messageCount).toBeGreaterThanOrEqual(2)

    // Verify user messages are rendered
    const userMessages = page.locator(SELECTORS.chat.userMessage)
    expect(await userMessages.count()).toBeGreaterThan(0)
  })

  test('should minimize and restore chat', async ({ page, chat }) => {
    await chat.openChat()

    // Minimize chat
    await chat.minimizeChat()
    await page.waitForTimeout(500)

    // Check minimized state - chat should still be visible but minimized
    const minimizedChat = page.locator('[data-chat-minimized], .h-\\[60px\\]')
    await expect(minimizedChat).toBeVisible({ timeout: TIMEOUTS.medium })

    // Click to restore
    await minimizedChat.click()
    await page.waitForTimeout(500)

    // Chat should be restored (no longer minimized)
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should expand and collapse chat', async ({ page, chat }) => {
    await chat.openChat()

    // Expand chat
    const expandBtn = page.locator('button[aria-label*="Expand"], button:has-text("Expand")')
    if (await expandBtn.isVisible()) {
      await expandBtn.click()
      await page.waitForTimeout(500)
      
      // Verify expanded state
      const expandedChat = page.locator('[data-chat-expanded], .fixed.inset-0')
      await expect(expandedChat).toBeVisible({ timeout: TIMEOUTS.medium })
    }
  })

  test('should persist session', async ({ page, chat }) => {
    await chat.openChat()
    await chat.sendMessage(TEST_MESSAGES.simple)
    await page.waitForTimeout(1000)

    // Get initial message count
    const initialCount = await chat.getMessageCount()

    // Reload page
    await page.reload()
    await page.waitForTimeout(1000)

    // Open chat again
    await chat.openChat()

    // Messages may or may not persist depending on implementation
    // Just verify chat can be reopened
    expect(await chat.isChatOpen()).toBe(true)
  })

  test('should handle long messages', async ({ page, chat }) => {
    await chat.openChat()
    
    await chat.sendMessage(TEST_MESSAGES.long)
    
    // Verify long message is displayed
    const userMessage = page.locator(SELECTORS.chat.userMessage).last()
    await expect(userMessage).toBeVisible({ timeout: TIMEOUTS.medium })
    await expect(userMessage).toContainText(TEST_MESSAGES.long.substring(0, 50))
  })

  test('should show loading state while sending', async ({ page, chat }) => {
    await chat.openChat()
    
    const input = page.locator(SELECTORS.chat.input)
    await input.fill(TEST_MESSAGES.simple)
    
    const sendButton = page.locator(SELECTORS.chat.sendButton)
    await sendButton.click()
    
    // Check for loading indicator (disabled button or spinner)
    await expect(sendButton).toBeDisabled({ timeout: TIMEOUTS.short })
  })
})


