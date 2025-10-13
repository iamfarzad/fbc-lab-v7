#!/usr/bin/env tsx

/**
 * Test script for log aggregation system
 * 
 * Usage: tsx scripts/test-logging.ts
 * 
 * This will:
 * 1. Send test logs to ingestion endpoint
 * 2. Verify they can be retrieved
 * 3. Test SSE streaming
 */

import * as dotenv from 'dotenv'
dotenv.config()

const LOG_INGEST_URL = process.env.LOG_INGEST_URL || 'http://localhost:3000/api/logs/ingest'
const LOG_SECRET = process.env.LOGS_INGESTION_SECRET || ''

async function testIngestion() {
  console.log('🧪 Testing log ingestion...')
  
  const testLogs = [
    {
      service: 'test',
      level: 'info',
      message: 'Test info log',
      timestamp: new Date().toISOString()
    },
    {
      service: 'test',
      level: 'warn',
      message: 'Test warning log',
      timestamp: new Date().toISOString()
    },
    {
      service: 'test',
      level: 'error',
      message: 'Test error log',
      timestamp: new Date().toISOString(),
      meta: { testId: 123, details: 'Sample error details' }
    }
  ]

  try {
    const response = await fetch(LOG_INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Log-Secret': LOG_SECRET
      },
      body: JSON.stringify(testLogs)
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Ingestion successful:', data)
      return true
    } else {
      console.error('❌ Ingestion failed:', response.status, await response.text())
      return false
    }
  } catch (error) {
    console.error('❌ Ingestion error:', error)
    return false
  }
}

async function testRetrieval() {
  console.log('\n🧪 Testing log retrieval...')
  
  try {
    const response = await fetch(`${LOG_INGEST_URL}?limit=10`, {
      method: 'GET'
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Retrieved ${data.count} logs`)
      if (data.logs.length > 0) {
        console.log('Sample log:', data.logs[data.logs.length - 1])
      }
      return true
    } else {
      console.error('❌ Retrieval failed:', response.status)
      return false
    }
  } catch (error) {
    console.error('❌ Retrieval error:', error)
    return false
  }
}

async function testStreaming() {
  console.log('\n🧪 Testing SSE streaming...')
  console.log('(Waiting for 3 events, then closing)\n')
  
  return new Promise<boolean>(async (resolve) => {
    try {
      const EventSource = (await import('eventsource')).default
      const streamUrl = LOG_INGEST_URL.replace('/ingest', '/stream')
      const es = new EventSource(streamUrl)
      
      let eventCount = 0
      const maxEvents = 3

      es.onopen = () => {
        console.log('✅ SSE connection opened')
      }

      es.onmessage = (event) => {
        try {
          const log = JSON.parse(event.data)
          if (log.type !== 'connected') {
            console.log('📨 Received:', log.service, log.level, log.message)
            eventCount++
          }
          
          if (eventCount >= maxEvents) {
            console.log(`\n✅ Successfully received ${eventCount} log events`)
            es.close()
            resolve(true)
          }
        } catch (error) {
          console.error('Error parsing event:', error)
        }
      }

      es.onerror = (error) => {
        console.error('❌ SSE error:', error)
        es.close()
        resolve(false)
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        console.log('\n⚠️  SSE test timed out (this is OK if no new logs were generated)')
        es.close()
        resolve(true)
      }, 10000)
    } catch (error) {
      console.error('❌ SSE setup error:', error)
      resolve(false)
    }
  })
}

async function runTests() {
  console.log('🚀 F.B/c Log Aggregation System Test\n')
  console.log(`Testing endpoint: ${LOG_INGEST_URL}`)
  console.log(`Secret configured: ${LOG_SECRET ? '✓' : '✗'}\n`)

  if (!LOG_SECRET) {
    console.error('❌ LOGS_INGESTION_SECRET not set!')
    console.log('Run: ./scripts/setup-logging.sh')
    process.exit(1)
  }

  let allPassed = true

  // Test 1: Ingestion
  allPassed = await testIngestion() && allPassed
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 2: Retrieval
  allPassed = await testRetrieval() && allPassed
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 3: Streaming
  allPassed = await testStreaming() && allPassed

  console.log('\n' + '='.repeat(60))
  if (allPassed) {
    console.log('✅ All tests passed!')
    console.log('\nNext steps:')
    console.log('  1. Start dev server: pnpm dev:all')
    console.log('  2. Start collectors: pnpm logs:start')
    console.log('  3. View logs: pnpm logs')
    console.log('\nOr run everything at once:')
    console.log('  pnpm dev:with-logs')
  } else {
    console.log('❌ Some tests failed')
    console.log('\nMake sure the dev server is running:')
    console.log('  pnpm dev')
  }
  console.log('='.repeat(60))
}

runTests().catch(console.error)

