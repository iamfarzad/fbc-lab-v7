import { mkdirSync, appendFileSync } from 'fs'
import * as path from 'path'

/**
 * Append JSONL records to a file. In production (e.g., Vercel), the file system
 * is read-only except for /tmp, so we route logs there. Locally, we write to
 * ./logs/<category> by default. You can override with LOG_BASE_DIR.
 */
export function logJsonl(category: string, event: string, data?: any) {
  try {
    const vercel = typeof process !== 'undefined' && process.env.VERCEL === '1'
    const baseRoot = process.env.LOG_BASE_DIR || (vercel ? '/tmp' : process.cwd())
    const baseDir = path.resolve(baseRoot, 'logs', category)
    mkdirSync(baseDir, { recursive: true })

    const date = new Date()
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const file = path.join(baseDir, `${category}-${yyyy}${mm}${dd}.jsonl`)
    const record = {
      ts: date.toISOString(),
      category,
      event,
      data: data ?? undefined,
    }
    appendFileSync(file, JSON.stringify(record) + '\n', { encoding: 'utf8' })
  } catch (err) {
    // Never crash the route on logging failures
    console.warn(`[jsonl-logger] Failed to write ${category}:${event}:`, err)
  }
}
