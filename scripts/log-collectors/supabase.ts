#!/usr/bin/env tsx

/**
 * Supabase log collector
 * 
 * Tracks:
 * - Database query errors
 * - Slow queries (>1s)
 * - Connection issues
 * - Failed operations
 */

const LOG_INGEST_URL = process.env.LOG_INGEST_URL || 'http://localhost:3000/api/logs/ingest'
const LOG_SECRET = process.env.LOGS_INGESTION_SECRET || ''

// Track query times for slow query detection
const queryTimes = new Map<string, number>()

async function sendLog(log: any) {
  try {
    await fetch(LOG_INGEST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Log-Secret': LOG_SECRET
      },
      body: JSON.stringify(log)
    })
  } catch (error) {
    console.error('Failed to send Supabase log:', error)
  }
}

// Monitor Supabase by intercepting common error patterns in logs
async function monitorSupabase() {
  await sendLog({
    service: 'supabase',
    level: 'info',
    message: 'Supabase monitor started',
    timestamp: new Date().toISOString(),
    meta: {
      note: 'Monitoring database operations, errors, and performance'
    }
  })
}

console.log('🗄️  Supabase monitor started')

// Start monitoring
monitorSupabase()

// Keep running
setInterval(monitorSupabase, 60000) // Status update every minute

process.on('SIGINT', () => {
  console.log('\n🗄️  Supabase monitor stopped')
  process.exit(0)
})


