#!/usr/bin/env tsx
/**
 * Manual Conversational Flow Test Script
 * Run with: pnpm tsx scripts/test-conversational-flow.ts
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const LOGS_DIR = join(process.cwd(), 'logs')

interface TestResult {
  step: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

async function testStep(step: string, testFn: () => Promise<void>): Promise<void> {
  try {
    await testFn()
    results.push({ step, passed: true, message: '✓ Passed' })
    console.log(`✓ ${step}`)
  } catch (error: any) {
    results.push({ 
      step, 
      passed: false, 
      message: error.message,
      details: error.stack
    })
    console.error(`✗ ${step}: ${error.message}`)
  }
}

async function main() {
  console.log('🧪 Conversational Flow E2E Test Suite\n')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Logs Dir: ${LOGS_DIR}\n`)

  // Test 1: Server Health
  await testStep('Server Health Check', async () => {
    const response = await fetch(`${BASE_URL}/api/chat/unified?action=status`)
    if (!response.ok) {
      throw new Error(`Server not responding: ${response.status}`)
    }
    const data = await response.json()
    if (data.status !== 'operational') {
      throw new Error(`Server not operational: ${data.status}`)
    }
  })

  // Test 2: Basic Chat
  const sessionId = `test-${Date.now()}`
  await testStep('Basic Chat Message', async () => {
    const response = await fetch(`${BASE_URL}/api/chat/unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': `test-${Date.now()}`,
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        messages: [{
          id: 'msg-1',
          role: 'user',
          content: 'Hello, test message',
          timestamp: new Date().toISOString()
        }],
        context: { sessionId },
        stream: false
      })
    })

    if (!response.ok) {
      throw new Error(`Chat failed: ${response.status}`)
    }

    const data = await response.json()
    if (!data.message || !data.message.content) {
      throw new Error('No message content in response')
    }

    console.log(`   Response: "${data.message.content.substring(0, 100)}..."`)
  })

  // Test 3: Discovery Pattern
  await testStep('Discovery Agent Pattern', async () => {
    const response = await fetch(`${BASE_URL}/api/chat/unified`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': `test-${Date.now()}`,
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        messages: [{
          id: 'msg-discovery',
          role: 'user',
          content: 'Hello, I need help',
          timestamp: new Date().toISOString()
        }],
        context: {
          sessionId,
          conversationFlow: null
        },
        stream: false
      })
    })

    const data = await response.json()
    const content = data.message?.content?.toLowerCase() || ''
    
    const hasDiscoveryLanguage = 
      content.includes('business') ||
      content.includes('goal') ||
      content.includes('objective') ||
      content.includes('strategic')

    if (!hasDiscoveryLanguage) {
      throw new Error('Discovery agent pattern not detected')
    }

    console.log(`   Contains discovery language: ✓`)
  })

  // Test 4: Log File Verification
  await testStep('Log File Generation', async () => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const logFile = join(LOGS_DIR, 'chat', `chat-${today}.jsonl`)
    
    if (!existsSync(logFile)) {
      // Check if logs directory exists
      const chatDir = join(LOGS_DIR, 'chat')
      if (!existsSync(chatDir)) {
        throw new Error(`Logs directory not found: ${chatDir}`)
      }
      throw new Error(`Log file not found: ${logFile}`)
    }

    const content = readFileSync(logFile, 'utf-8')
    const lines = content.trim().split('\n').filter(l => l.trim())
    
    if (lines.length === 0) {
      throw new Error('Log file is empty')
    }

    // Parse last few entries
    const recentEntries = lines.slice(-5).map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    }).filter(Boolean)

    if (recentEntries.length === 0) {
      throw new Error('No valid JSON entries in log file')
    }

    console.log(`   Found ${lines.length} log entries`)
    console.log(`   Recent entries: ${recentEntries.length}`)
  })

  // Test 5: Check Log Structure
  await testStep('Log Entry Structure', async () => {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const logFile = join(LOGS_DIR, 'chat', `chat-${today}.jsonl`)
    
    if (!existsSync(logFile)) {
      throw new Error('Log file not found for structure check')
    }

    const content = readFileSync(logFile, 'utf-8')
    const lines = content.trim().split('\n').filter(l => l.trim())
    
    if (lines.length === 0) {
      throw new Error('No log entries to check')
    }

    // Check last entry structure
    const lastEntry = JSON.parse(lines[lines.length - 1])
    
    const requiredFields = ['ts', 'category', 'event', 'data']
    for (const field of requiredFields) {
      if (!(field in lastEntry)) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    if (lastEntry.category !== 'chat') {
      throw new Error(`Unexpected category: ${lastEntry.category}`)
    }

    console.log(`   Log structure valid: ✓`)
    console.log(`   Last event: ${lastEntry.event}`)
  })

  // Test 6: Voice Log Check
  await testStep('Voice Log Files', async () => {
    const clientLiveDir = join(LOGS_DIR, 'client-live')
    if (!existsSync(clientLiveDir)) {
      throw new Error(`Voice logs directory not found: ${clientLiveDir}`)
    }

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const voiceLogFile = join(clientLiveDir, `client-live-${today}.jsonl`)
    
    // Voice logs may not exist if no voice activity today
    if (existsSync(voiceLogFile)) {
      const content = readFileSync(voiceLogFile, 'utf-8')
      const lines = content.trim().split('\n').filter(l => l.trim())
      console.log(`   Voice log entries: ${lines.length}`)
    } else {
      console.log(`   No voice activity today (expected if not tested)`)
    }
  })

  // Test 7: Multimodal Logs Check
  await testStep('Multimodal Log Files', async () => {
    const modalities = ['webcam', 'screen']
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
    
    for (const modality of modalities) {
      const modalityDir = join(LOGS_DIR, modality)
      if (!existsSync(modalityDir)) {
        console.log(`   ${modality} directory not found (may not be created yet)`)
        continue
      }

      const logFile = join(modalityDir, `${modality}-${today}.jsonl`)
      if (existsSync(logFile)) {
        const content = readFileSync(logFile, 'utf-8')
        const lines = content.trim().split('\n').filter(l => l.trim())
        console.log(`   ${modality} entries: ${lines.length}`)
      }
    }
  })

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results Summary\n')
  
  const passed = results.filter(r => r.passed).length
  const failed = results.filter(r => !r.passed).length
  
  console.log(`Total Tests: ${results.length}`)
  console.log(`✓ Passed: ${passed}`)
  console.log(`✗ Failed: ${failed}\n`)

  if (failed > 0) {
    console.log('Failed Tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ✗ ${r.step}: ${r.message}`)
    })
  }

  console.log('\n' + '='.repeat(50))
  console.log('\n💡 Next Steps:')
  console.log('1. Review failed tests above')
  console.log('2. Check server logs for errors')
  console.log('3. Verify environment variables are set')
  console.log('4. Ensure server is running: pnpm dev:all')
  console.log(`5. Check log files in: ${LOGS_DIR}`)
  console.log(`\nSession ID for testing: ${sessionId}`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

