#!/usr/bin/env tsx
import { spawn } from 'child_process'

const LOG_INGEST_URL = process.env.LOG_INGEST_URL || 'http://localhost:3000/api/logs/ingest'
const LOG_SECRET = process.env.LOGS_INGESTION_SECRET || ''
const FLY_APP_NAME = process.env.FLY_APP_NAME

if (!FLY_APP_NAME) {
  console.error('❌ FLY_APP_NAME not set, skipping Fly.io log collection')
  process.exit(0)
}

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
    console.error('Failed to send Fly.io log:', error)
  }
}

function startFlyctlTail() {
  console.log(`🪰 Fly.io log collector started for app: ${FLY_APP_NAME}`)
  
  // Start flyctl logs in JSON format
  const flyctl = spawn('flyctl', ['logs', '--app', FLY_APP_NAME, '--format', 'json'], {
    stdio: ['ignore', 'pipe', 'pipe']
  })

  flyctl.stdout.on('data', async (data) => {
    const lines = data.toString().split('\n').filter((line: string) => line.trim())
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        
        // Determine log level from Fly.io log
        let level = 'info'
        if (parsed.level) {
          level = parsed.level.toLowerCase()
        } else if (line.toLowerCase().includes('error')) {
          level = 'error'
        } else if (line.toLowerCase().includes('warn')) {
          level = 'warn'
        }

        await sendLog({
          service: 'websocket',
          level,
          message: parsed.message || line,
          timestamp: parsed.timestamp || new Date().toISOString(),
          meta: {
            instance: parsed.instance,
            region: parsed.region,
            ...parsed
          }
        })
      } catch {
        // Not JSON, send as plain text
        await sendLog({
          service: 'websocket',
          level: 'info',
          message: line,
          timestamp: new Date().toISOString()
        })
      }
    }
  })

  flyctl.stderr.on('data', (data) => {
    console.error('Flyctl stderr:', data.toString())
  })

  flyctl.on('error', (error) => {
    console.error('Failed to start flyctl:', error)
    console.error('Make sure flyctl is installed and you are logged in')
  })

  flyctl.on('close', (code) => {
    console.log(`Flyctl process exited with code ${code}`)
    // Restart after 5 seconds
    setTimeout(startFlyctlTail, 5000)
  })
}

startFlyctlTail()

process.on('SIGINT', () => {
  console.log('\n🪰 Fly.io collector stopped')
  process.exit(0)
})

