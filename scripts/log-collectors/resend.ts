#!/usr/bin/env tsx

const LOG_INGEST_URL = process.env.LOG_INGEST_URL || 'http://localhost:3000/api/logs/ingest'
const LOG_SECRET = process.env.LOGS_INGESTION_SECRET || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY

if (!RESEND_API_KEY) {
  console.log('ℹ️  RESEND_API_KEY not set, skipping Resend log collection')
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
    console.error('Failed to send Resend log:', error)
  }
}

let lastChecked = Date.now() - 60000 // Start from 1 minute ago

async function fetchResendEvents() {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`
      }
    })

    if (!response.ok) {
      return
    }

    const data = await response.json()
    const emails = data.data || []

    for (const email of emails) {
      const createdAt = new Date(email.created_at).getTime()
      if (createdAt > lastChecked) {
        let level = 'info'
        let message = `Email sent to ${email.to}`

        if (email.last_event === 'bounced' || email.last_event === 'failed') {
          level = 'error'
          message = `Email ${email.last_event}: ${email.to}`
        } else if (email.last_event === 'delivered') {
          level = 'info'
          message = `Email delivered: ${email.to}`
        }

        await sendLog({
          service: 'resend',
          level,
          message,
          timestamp: email.created_at,
          meta: {
            emailId: email.id,
            to: email.to,
            from: email.from,
            subject: email.subject,
            status: email.last_event
          }
        })
      }
    }

    lastChecked = Date.now()
  } catch (error) {
    console.error('Error fetching Resend events:', error)
  }
}

console.log('📧 Resend log collector started')

// Poll every 10 seconds
setInterval(fetchResendEvents, 10000)
fetchResendEvents()

process.on('SIGINT', () => {
  console.log('\n📧 Resend collector stopped')
  process.exit(0)
})

