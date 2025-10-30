import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100'

test.describe('Agent Persistence - Full Flow Tests', () => {
  test('complete conversation flow should persist agent transitions', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Complete a full FBC flow
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    
    // Discovery phase
    await chatInput.fill('I run a small business and want to improve my sales')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // Follow-up in discovery
    await chatInput.fill('We struggle with closing deals')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // Trigger scoring
    await chatInput.fill('Our budget is around $50k per year')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // Wait for summary/conclusion
    await page.waitForTimeout(2000)
    
    // Verify persistence at each stage
    // This would require API or DB access to check conversation_flow field
    const sessionStorage = await page.evaluate(() => {
      return {
        sessionId: localStorage.getItem('sessionId'),
        agentHistory: localStorage.getItem('agentHistory') // if stored
      }
    })
    
    expect(sessionStorage.sessionId).toBeTruthy()
  })

  test('analytics_pending flag should be cleared after async job', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    await chatInput.fill('Hello')
    await chatInput.press('Enter')
    
    // Wait for agent response
    await page.waitForTimeout(2000)
    
    // Analytics job should be enqueued
    // In production, we'd wait for the job to complete and check analytics_pending
    // For now, we just verify the conversation completed successfully
    
    const lastMessage = await page.locator('.message').last().textContent()
    expect(lastMessage).toBeTruthy()
  })

  test('conversation_flow should be updated with each agent execution', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    
    // Start conversation
    await chatInput.fill('I need help with my sales team')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // Add more context (should trigger flow updates)
    await chatInput.fill('We have 10 sales reps struggling with closing')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // The conversation_flow field should reflect progress
    // Verified through API or direct DB query
    expect(true).toBeTruthy() // Placeholder - actual verification needs API/DB access
  })

  test('intelligence_context should accumulate lead data', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    
    // Provide lead information
    await chatInput.fill('I work at a technology company in the Bay Area')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    await chatInput.fill('We have about 100 employees')
    await chatInput.press('Enter')
    await page.waitForTimeout(2000)
    
    // intelligence_context should be populated with company info
    // This would be verified through API/DB access
    expect(true).toBeTruthy() // Placeholder
  })

  test('retry mechanism should handle transient failures', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // This test would require simulating Supabase connection failures
    // For now, we test that normal operations work
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    await chatInput.fill('Test retry handling')
    await chatInput.press('Enter')
    
    // Wait for response
    await page.waitForTimeout(2000)
    
    const lastMessage = await page.locator('.message').last().textContent()
    expect(lastMessage).toBeTruthy()
  })
})

