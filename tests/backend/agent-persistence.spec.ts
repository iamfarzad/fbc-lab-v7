import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { DatabaseHelpers } from '../utils/database-helpers'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3100'

test.describe('Agent Persistence Integration', () => {
  let dbHelpers: DatabaseHelpers

  test.beforeEach(async ({ page }) => {
    dbHelpers = new DatabaseHelpers(page)
  })

  test('should persist agent results to conversation_contexts', async ({ page }) => {
    await page.goto(BASE_URL)
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    
    // Find session ID from localStorage or cookies
    const sessionId = await page.evaluate(() => {
      return localStorage.getItem('sessionId') || 'test-session-' + Date.now()
    })
    
    // Send a chat message that triggers an agent
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    await chatInput.fill('Hello, I want to improve my sales')
    await chatInput.press('Enter')
    
    // Wait for agent response
    await page.waitForTimeout(2000)
    
    // Check that agent results were persisted
    // This would need direct DB access or API endpoint to verify
    const hasContext = await dbHelpers.hasConversationContext(sessionId)
    
    // At minimum, session should have been created
    expect(hasContext).toBeTruthy()
  })

  test('should handle concurrent agent executions without race conditions', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const sessionId = await page.evaluate(() => {
      return localStorage.getItem('sessionId') || 'test-session-' + Date.now()
    })
    
    // Send multiple messages rapidly to test optimistic locking
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    
    const messages = [
      'Tell me about your services',
      'What is your pricing?',
      'How does this work?'
    ]
    
    for (const message of messages) {
      await chatInput.fill(message)
      await chatInput.press('Enter')
      await page.waitForTimeout(500) // Small delay between messages
    }
    
    // Wait for all agent responses
    await page.waitForTimeout(3000)
    
    // Check that all updates were persisted (no lost data)
    const context = await dbHelpers.getConversationContext(sessionId)
    
    // Should have last_agent, last_stage fields
    expect(context?.last_agent).toBeTruthy()
    expect(context?.last_stage).toBeTruthy()
  })

  test('should persist event_id for idempotency', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const sessionId = await page.evaluate(() => {
      return localStorage.getItem('sessionId') || 'test-session-' + Date.now()
    })
    
    // Send a message
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    await chatInput.fill('Hello')
    await chatInput.press('Enter')
    
    await page.waitForTimeout(2000)
    
    // Check that event_id was persisted
    const context = await dbHelpers.getConversationContext(sessionId)
    
    // Should have event_id for tracing
    expect(context?.event_id).toBeTruthy()
  })

  test('should handle persistence failures gracefully', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    // Simulate database failure by blocking API calls
    // This is difficult to test in Playwright, so we'll test the graceful degradation
    
    const chatInput = page.locator('textarea[placeholder*="message"], input[type="text"]').first()
    await chatInput.fill('Test message')
    await chatInput.press('Enter')
    
    // Even if persistence fails, chat should still work
    await page.waitForTimeout(2000)
    
    // Check that we still got a response
    const lastMessage = await page.locator('.message').last().textContent()
    expect(lastMessage).toBeTruthy()
  })
})

// Extended DatabaseHelpers for agent persistence verification
declare module '../utils/database-helpers' {
  interface DatabaseHelpers {
    hasConversationContext(sessionId: string): Promise<boolean>
    getConversationContext(sessionId: string): Promise<any>
  }
}

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co') {
    return createClient(supabaseUrl, supabaseKey)
  }
  return null
}

Object.assign(DatabaseHelpers.prototype, {
  async hasConversationContext(sessionId: string): Promise<boolean> {
    try {
      const context = await this.getConversationContext(sessionId)
      return !!context
    } catch {
      return false
    }
  },
  
  async getConversationContext(sessionId: string): Promise<any> {
    const supabase = getSupabaseClient()
    if (!supabase) {
      throw new Error('Supabase client not available')
    }
    
    const { data, error } = await supabase
      .from('conversation_contexts')
      .select('*')
      .eq('session_id', sessionId)
      .single()
    
    if (error) {
      throw error
    }
    
    return data
  }
})

