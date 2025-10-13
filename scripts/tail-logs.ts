#!/usr/bin/env tsx
import EventSource from 'eventsource'
import chalk from 'chalk'

const args = process.argv.slice(2)

// Parse command line arguments
const servicesArg = args.find(a => a.startsWith('--services='))
const levelArg = args.find(a => a.startsWith('--level='))
const helpArg = args.includes('--help') || args.includes('-h')

if (helpArg) {
  console.log(`
${chalk.bold('F.B/c Log Aggregator')}

Usage: pnpm logs [options]

Options:
  --services=<list>    Filter by services (comma-separated)
                       Available: browser, websocket, nextjs, vercel, gemini, resend, supabase
                       Example: --services=websocket,gemini,supabase
  
  --level=<list>       Filter by log level (comma-separated)
                       Valid: debug,info,warn,error
                       Example: --level=error,warn
  
  -h, --help          Show this help message

Examples:
  pnpm logs                                           # Show all logs
  pnpm logs --services=websocket                      # WebSocket logs only
  pnpm logs --services=browser                        # Frontend console logs only
  pnpm logs --level=error                             # Errors only
  pnpm logs --services=websocket,browser --level=error,warn
`)
  process.exit(0)
}

const services = servicesArg?.split('=')[1]
const level = levelArg?.split('=')[1]

const params = new URLSearchParams()
if (services) params.append('services', services)
if (level) params.append('level', level)

const url = `http://localhost:3000/api/logs/stream?${params.toString()}`

console.log(chalk.bold.cyan('\n🔍 F.B/c Log Aggregator\n'))
console.log(chalk.gray(`Connecting to ${url}...\n`))

if (services) {
  console.log(chalk.blue(`📋 Filtering services: ${services}`))
}
if (level) {
  console.log(chalk.yellow(`📊 Filtering levels: ${level}`))
}

console.log(chalk.gray('─'.repeat(80)))
console.log('')

const es = new EventSource(url)

es.onopen = () => {
  console.log(chalk.green('✓ Connected\n'))
}

es.onmessage = (event) => {
  try {
    const log = JSON.parse(event.data)
    
    // Skip connection messages
    if (log.type === 'connected') {
      return
    }

    // Color by level
    const levelColors = {
      error: chalk.red.bold,
      warn: chalk.yellow.bold,
      info: chalk.blue,
      debug: chalk.gray
    }
    const levelColor = levelColors[log.level as keyof typeof levelColors] || chalk.white

    // Format timestamp
    const timestamp = new Date(log.timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    // Service badge
    const serviceBadge = chalk.cyan.bold(`[${log.service.padEnd(10)}]`)
    
    // Level badge
    const levelBadge = levelColor(log.level.toUpperCase().padEnd(5))

    // Message
    const message = log.message

    // Meta data (if present)
    let metaStr = ''
    if (log.meta && Object.keys(log.meta).length > 0) {
      // Filter out redundant fields
      const { service, level, message, timestamp, ...relevantMeta } = log.meta
      if (Object.keys(relevantMeta).length > 0) {
        metaStr = '\n  ' + chalk.dim(JSON.stringify(relevantMeta, null, 2).split('\n').join('\n  '))
      }
    }

    console.log(
      chalk.gray(timestamp),
      serviceBadge,
      levelBadge,
      message + metaStr
    )
  } catch (error) {
    console.error(chalk.red('Error parsing log:'), error)
  }
}

es.onerror = (error) => {
  console.error(chalk.red('\n✗ Connection lost, retrying...\n'))
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Closing log stream...'))
  es.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  es.close()
  process.exit(0)
})

