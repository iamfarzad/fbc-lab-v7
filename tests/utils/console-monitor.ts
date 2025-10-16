import { Page, ConsoleMessage } from '@playwright/test'
import { writeFileSync } from 'fs'
import { join } from 'path'

interface ConsoleLog {
  type: string
  text: string
  location?: string
  timestamp: number
}

export class ConsoleMonitor {
  private logs: ConsoleLog[] = []
  private errors: ConsoleLog[] = []
  private warnings: ConsoleLog[] = []
  private whitelistedPatterns: RegExp[]

  constructor(private page: Page, whitelistedPatterns: string[] = []) {
    // Default whitelist - common expected warnings in dev
    this.whitelistedPatterns = [
      /Download the React DevTools/,
      /React Router Future Flag Warning/,
      /Warning: ReactDOM.render/,
      /Prop `.*` did not match/,
      /Hydration mismatch/,
      /Extra attributes from the server/,
      ...whitelistedPatterns.map(p => new RegExp(p))
    ]
  }

  async start() {
    this.page.on('console', (msg: ConsoleMessage) => {
      this.handleConsoleMessage(msg)
    })

    this.page.on('pageerror', (error: Error) => {
      this.errors.push({
        type: 'pageerror',
        text: error.message,
        location: error.stack,
        timestamp: Date.now()
      })
    })
  }

  private handleConsoleMessage(msg: ConsoleMessage) {
    const log: ConsoleLog = {
      type: msg.type(),
      text: msg.text(),
      location: msg.location().url,
      timestamp: Date.now()
    }

    this.logs.push(log)

    if (msg.type() === 'error') {
      if (!this.isWhitelisted(log.text)) {
        this.errors.push(log)
      }
    } else if (msg.type() === 'warning') {
      if (!this.isWhitelisted(log.text)) {
        this.warnings.push(log)
      }
    }
  }

  private isWhitelisted(text: string): boolean {
    return this.whitelistedPatterns.some(pattern => pattern.test(text))
  }

  getCriticalErrors(): ConsoleLog[] {
    // Filter for critical errors only
    return this.errors.filter(error => {
      const text = error.text.toLowerCase()
      return (
        text.includes('uncaught') ||
        text.includes('cannot read property') ||
        text.includes('is not a function') ||
        text.includes('network error') ||
        text.includes('failed to fetch')
      )
    })
  }

  getAllErrors(): ConsoleLog[] {
    return this.errors
  }

  getAllWarnings(): ConsoleLog[] {
    return this.warnings
  }

  getAllLogs(): ConsoleLog[] {
    return this.logs
  }

  hasCriticalErrors(): boolean {
    return this.getCriticalErrors().length > 0
  }

  exportToFile(filename: string) {
    const logDir = join(process.cwd(), 'test-results', 'console-logs')
    const logPath = join(logDir, filename)

    const report = {
      summary: {
        totalLogs: this.logs.length,
        errors: this.errors.length,
        criticalErrors: this.getCriticalErrors().length,
        warnings: this.warnings.length,
        timestamp: new Date().toISOString()
      },
      criticalErrors: this.getCriticalErrors(),
      allErrors: this.errors,
      warnings: this.warnings,
      allLogs: this.logs
    }

    try {
      writeFileSync(logPath, JSON.stringify(report, null, 2))
      console.log(`Console logs exported to: ${logPath}`)
    } catch (error) {
      console.error('Failed to export console logs:', error)
    }
  }

  reset() {
    this.logs = []
    this.errors = []
    this.warnings = []
  }

  getSummary() {
    return {
      totalLogs: this.logs.length,
      errors: this.errors.length,
      criticalErrors: this.getCriticalErrors().length,
      warnings: this.warnings.length
    }
  }
}

export async function setupConsoleMonitor(page: Page, whitelistedPatterns: string[] = []) {
  const monitor = new ConsoleMonitor(page, whitelistedPatterns)
  await monitor.start()
  return monitor
}

