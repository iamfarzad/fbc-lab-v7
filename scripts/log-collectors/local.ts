#!/usr/bin/env tsx
import { watch } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'

const LOG_INGEST_URL = process.env.LOG_INGEST_URL || 'http://localhost:3000/api/logs/ingest'
const LOG_SECRET = process.env.LOGS_INGESTION_SECRET || ''

const LOG_FILES = [
  { path: 'logs/combined.log', service: 'nextjs' },
  { path: 'logs/error.log', service: 'nextjs-error' }
]

interface FileState {
  position: number
  path: string
  service: string
}

const fileStates = new Map<string, FileState>()

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
    console.error('Failed to send log:', error)
  }
}

async function readNewLines(filePath: string, service: string) {
  try {
    const state = fileStates.get(filePath) || { position: 0, path: filePath, service }
    
    const content = await readFile(filePath, 'utf-8')
    const newContent = content.slice(state.position)
    
    if (newContent.length === 0) return

    const lines = newContent.split('\n').filter(line => line.trim())
    
    for (const line of lines) {
      // Try to parse as JSON (Winston format)
      try {
        const parsed = JSON.parse(line)
        await sendLog({
          service,
          level: parsed.level || 'info',
          message: parsed.message || line,
          timestamp: parsed.timestamp || new Date().toISOString(),
          meta: parsed
        })
      } catch {
        // Plain text line
        await sendLog({
          service,
          level: 'info',
          message: line,
          timestamp: new Date().toISOString()
        })
      }
    }

    state.position = content.length
    fileStates.set(filePath, state)
  } catch (error) {
    // File might not exist yet
    if ((error as any).code !== 'ENOENT') {
      console.error(`Error reading ${filePath}:`, error)
    }
  }
}

async function startWatching() {
  console.log('📁 Local log file watcher started')
  
  // Initialize file positions
  for (const file of LOG_FILES) {
    try {
      const content = await readFile(file.path, 'utf-8')
      fileStates.set(file.path, {
        position: content.length,
        path: file.path,
        service: file.service
      })
      console.log(`  Watching ${file.path} (${file.service})`)
    } catch (error) {
      // File doesn't exist yet, start from beginning
      fileStates.set(file.path, {
        position: 0,
        path: file.path,
        service: file.service
      })
      console.log(`  Waiting for ${file.path} (${file.service})`)
    }
  }

  // Watch each file
  for (const file of LOG_FILES) {
    watch(file.path, async (eventType) => {
      if (eventType === 'change') {
        await readNewLines(file.path, file.service)
      }
    })
  }

  // Also poll every 2 seconds as backup
  setInterval(async () => {
    for (const file of LOG_FILES) {
      await readNewLines(file.path, file.service)
    }
  }, 2000)
}

startWatching().catch(console.error)

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n📁 Local watcher stopped')
  process.exit(0)
})

