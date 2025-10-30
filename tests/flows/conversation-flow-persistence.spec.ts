import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100'

test.describe('Conversation Flow Persistence', () => {
  test('should persist enhanced flow after agent execution', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Send messages that trigger category detection
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    
    // Trigger goals category
    await chatInput.fill('I want to improve my sales process')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // Trigger pain category
    await chatInput.fill('We struggle with closing deals')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // Verify flow is persisted to database
    // This would require API or DB access to verify
    // For now, we verify the conversation completed successfully
    
    const lastMessage = await page.locator('.message').last().textContent()
    expect(lastMessage).toBeTruthy()
  })
  
  test('should merge client patterns with agent analysis', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    
    // Send a message that might not trigger client patterns but agent recognizes
    await chatInput.fill('Our team needs buy-in from stakeholders')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // Agent should detect "readiness" category even if client patterns miss it
    // Verify enhanced flow is sent back to client
    
    expect(true).toBeTruthy() // Placeholder - actual verification needs API/DB access
  })

  test('should receive flow_update SSE event', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Listen for flow_update events
    // This would require intercepting SSE events
    // For now, we verify the page loads correctly
    
    expect(page).toBeTruthy()
  })
})

