import { mkdirSync, appendFileSync } from 'fs'
import * as path from 'path'

export function logJsonl(category: string, event: string, data?: any) {
  try {
    const baseDir = path.resolve(process.cwd(), 'logs', category)
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
    // eslint-disable-next-line no-console
    console.warn(`[jsonl-logger] Failed to write ${category}:${event}:`, err)
  }
}

