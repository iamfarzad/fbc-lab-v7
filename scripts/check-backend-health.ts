#!/usr/bin/env tsx

import WebSocket from 'ws'
import { WEBSOCKET_CONFIG } from '../src/config/constants.js'

interface HealthCheckResult {
  service: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  message: string
  timestamp: string
  responseTime?: number
}

interface HealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  checks: HealthCheckResult[]
  timestamp: string
}

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

async function checkWebSocketLocal(): Promise<HealthCheckResult> {
  const url = WEBSOCKET_CONFIG.DEVELOPMENT_URL
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        service: 'WebSocket (Local)',
        status: 'unhealthy',
        message: `Connection timeout to ${url}`,
        timestamp: new Date().toISOString()
      })
    }, 5000)

    try {
      const ws = new WebSocket(url)

      ws.on('open', () => {
        const responseTime = Date.now() - startTime
        clearTimeout(timeout)
        ws.close()
        resolve({
          service: 'WebSocket (Local)',
          status: 'healthy',
          message: `Connected successfully to ${url}`,
          timestamp: new Date().toISOString(),
          responseTime
        })
      })

      ws.on('error', (error) => {
        clearTimeout(timeout)
        resolve({
          service: 'WebSocket (Local)',
          status: 'unhealthy',
          message: `Connection failed: ${error.message}`,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      clearTimeout(timeout)
      resolve({
        service: 'WebSocket (Local)',
        status: 'unhealthy',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      })
    }
  })
}

async function checkWebSocketProduction(): Promise<HealthCheckResult> {
  const url = WEBSOCKET_CONFIG.PRODUCTION_URL
  const startTime = Date.now()
  
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({
        service: 'WebSocket (Fly.io)',
        status: 'unhealthy',
        message: `Connection timeout to ${url}`,
        timestamp: new Date().toISOString()
      })
    }, 10000)

    try {
      const ws = new WebSocket(url)

      ws.on('open', () => {
        const responseTime = Date.now() - startTime
        clearTimeout(timeout)
        ws.close()
        resolve({
          service: 'WebSocket (Fly.io)',
          status: 'healthy',
          message: `Connected successfully to ${url}`,
          timestamp: new Date().toISOString(),
          responseTime
        })
      })

      ws.on('error', (error) => {
        clearTimeout(timeout)
        resolve({
          service: 'WebSocket (Fly.io)',
          status: 'unhealthy',
          message: `Connection failed: ${error.message}`,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      clearTimeout(timeout)
      resolve({
        service: 'WebSocket (Fly.io)',
        status: 'unhealthy',
        message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      })
    }
  })
}

async function checkNextJSLocal(): Promise<HealthCheckResult> {
  const url = 'http://localhost:3000'
  const startTime = Date.now()

  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    })
    const responseTime = Date.now() - startTime

    if (response.ok) {
      return {
        service: 'Next.js (Local)',
        status: 'healthy',
        message: `Server responding on ${url}`,
        timestamp: new Date().toISOString(),
        responseTime
      }
    } else {
      return {
        service: 'Next.js (Local)',
        status: 'unhealthy',
        message: `Server returned status ${response.status}`,
        timestamp: new Date().toISOString(),
        responseTime
      }
    }
  } catch (error) {
    return {
      service: 'Next.js (Local)',
      status: 'unhealthy',
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }
  }
}

async function checkEnvironmentVariables(): Promise<HealthCheckResult> {
  const requiredVars = [
    'GEMINI_API_KEY'
  ]

  const missingVars = requiredVars.filter(v => !process.env[v])

  if (missingVars.length === 0) {
    return {
      service: 'Environment Variables',
      status: 'healthy',
      message: 'All required environment variables are set',
      timestamp: new Date().toISOString()
    }
  } else {
    return {
      service: 'Environment Variables',
      status: 'unhealthy',
      message: `Missing variables: ${missingVars.join(', ')}`,
      timestamp: new Date().toISOString()
    }
  }
}

async function runHealthChecks(checkProduction = false): Promise<HealthReport> {
  log('\n🏥 Running Backend Health Checks...\n', colors.blue)

  const checks: HealthCheckResult[] = []

  // Check environment variables
  log('Checking environment variables...', colors.blue)
  const envCheck = await checkEnvironmentVariables()
  checks.push(envCheck)
  printCheckResult(envCheck)

  // Check Next.js local
  log('\nChecking Next.js local server...', colors.blue)
  const nextCheck = await checkNextJSLocal()
  checks.push(nextCheck)
  printCheckResult(nextCheck)

  // Check WebSocket local
  log('\nChecking WebSocket local server...', colors.blue)
  const wsLocalCheck = await checkWebSocketLocal()
  checks.push(wsLocalCheck)
  printCheckResult(wsLocalCheck)

  // Check production if requested
  if (checkProduction) {
    log('\nChecking WebSocket production (Fly.io)...', colors.blue)
    const wsProdCheck = await checkWebSocketProduction()
    checks.push(wsProdCheck)
    printCheckResult(wsProdCheck)
  }

  // Determine overall status
  const hasUnhealthy = checks.some(c => c.status === 'unhealthy')
  const hasUnknown = checks.some(c => c.status === 'unknown')
  
  let overall: 'healthy' | 'degraded' | 'unhealthy'
  if (hasUnhealthy) {
    overall = 'unhealthy'
  } else if (hasUnknown) {
    overall = 'degraded'
  } else {
    overall = 'healthy'
  }

  const report: HealthReport = {
    overall,
    checks,
    timestamp: new Date().toISOString()
  }

  // Print summary
  log('\n' + '='.repeat(60), colors.blue)
  log('HEALTH CHECK SUMMARY', colors.blue)
  log('='.repeat(60), colors.blue)
  log(`Overall Status: ${overall.toUpperCase()}`, getStatusColor(overall))
  log(`Total Checks: ${checks.length}`, colors.reset)
  log(`Healthy: ${checks.filter(c => c.status === 'healthy').length}`, colors.green)
  log(`Unhealthy: ${checks.filter(c => c.status === 'unhealthy').length}`, colors.red)
  log(`Unknown: ${checks.filter(c => c.status === 'unknown').length}`, colors.yellow)
  log('='.repeat(60) + '\n', colors.blue)

  return report
}

function printCheckResult(result: HealthCheckResult) {
  const statusColor = result.status === 'healthy' ? colors.green : 
                     result.status === 'unhealthy' ? colors.red : colors.yellow
  
  const icon = result.status === 'healthy' ? '✅' : 
               result.status === 'unhealthy' ? '❌' : '⚠️'
  
  log(`${icon} ${result.service}: ${result.message}`, statusColor)
  if (result.responseTime) {
    log(`   Response time: ${result.responseTime}ms`, colors.reset)
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy': return colors.green
    case 'unhealthy': return colors.red
    case 'degraded': return colors.yellow
    default: return colors.reset
  }
}

// Main execution
const checkProduction = process.argv.includes('--production')

runHealthChecks(checkProduction)
  .then((report) => {
    // Exit with code 1 if unhealthy
    if (report.overall === 'unhealthy') {
      process.exit(1)
    }
    process.exit(0)
  })
  .catch((error) => {
    log(`\n❌ Health check failed: ${error.message}`, colors.red)
    process.exit(1)
  })

