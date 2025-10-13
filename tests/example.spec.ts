import { test, expect } from './utils/fixtures'

test.describe('Example Test - Verify Setup', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    
    // Verify page loads
    await expect(page).toHaveTitle(/F\.B\/c AI|FBC Lab/)
    
    // Verify chat button exists
    const chatButton = page.locator('[data-chat-trigger]')
    await expect(chatButton).toBeVisible({ timeout: 10000 })
  })

  test('should open chat widget', async ({ page, chat }) => {
    await page.goto('/')
    
    // Open chat
    await chat.openChat()
    
    // Verify chat is open
    expect(await chat.isChatOpen()).toBe(true)
  })
})

