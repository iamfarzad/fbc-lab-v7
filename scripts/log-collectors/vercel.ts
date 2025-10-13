#!/usr/bin/env tsx

const LOG_INGEST_URL = process.env.LOG_INGEST_URL || 'http://localhost:3000/api/logs/ingest'
const LOG_SECRET = process.env.LOGS_INGESTION_SECRET || ''
const VERCEL_TOKEN = process.env.VERCEL_API_TOKEN
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID

if (!VERCEL_TOKEN || !VERCEL_PROJECT_ID) {
  console.log('ℹ️  VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set, skipping Vercel log collection')
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
    console.error('Failed to send Vercel log:', error)
  }
}

let lastTimestamp = Date.now()

async function fetchVercelLogs() {
  try {
    // Get latest deployment
    const deploymentsRes = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`
        }
      }
    )

    if (!deploymentsRes.ok) {
      console.error('Failed to fetch deployments:', await deploymentsRes.text())
      return
    }

    const deployments = await deploymentsRes.json()
    const latestDeployment = deployments.deployments?.[0]

    if (!latestDeployment) {
      return
    }

    // Fetch logs for the deployment
    const logsRes = await fetch(
      `https://api.vercel.com/v2/deployments/${latestDeployment.uid}/events?since=${lastTimestamp}`,
      {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`
        }
      }
    )

    if (!logsRes.ok) {
      return
    }

    const logs = await logsRes.text()
    const lines = logs.split('\n').filter(line => line.trim())

    for (const line of lines) {
      try {
        const log = JSON.parse(line)
        
        // Determine level
        let level = 'info'
        if (log.type === 'stderr' || log.payload?.level === 'error') {
          level = 'error'
        } else if (log.payload?.level === 'warn') {
          level = 'warn'
        }

        await sendLog({
          service: 'vercel',
          level,
          message: log.payload?.text || log.text || JSON.stringify(log),
          timestamp: new Date(log.createdAt || Date.now()).toISOString(),
          meta: {
            deploymentId: latestDeployment.uid,
            type: log.type,
            ...log
          }
        })
      } catch {
        // Skip invalid JSON
      }
    }

    lastTimestamp = Date.now()
  } catch (error) {
    console.error('Error fetching Vercel logs:', error)
  }
}

console.log('▲ Vercel log collector started')

// Poll every 5 seconds
setInterval(fetchVercelLogs, 5000)
fetchVercelLogs()

process.on('SIGINT', () => {
  console.log('\n▲ Vercel collector stopped')
  process.exit(0)
})

