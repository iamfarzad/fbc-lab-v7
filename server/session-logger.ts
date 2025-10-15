import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

export type JsonlEvent = {
  ts: string
  event: string
  connectionId?: string
  data?: any
}

export class SessionLogger {
  private readonly dir: string
  private readonly filePath: string
  private stream: fs.WriteStream | null = null
  private opened = false

  constructor(private readonly connectionId: string, baseDir?: string) {
    // Use /tmp in production (Docker), local logs/live in dev
    const moduleDir = path.dirname(fileURLToPath(import.meta.url))
    const defaultBase = process.env.NODE_ENV === 'production' 
      ? '/tmp/live-logs'
      : path.resolve(moduleDir, '..', 'logs', 'live')
    this.dir = baseDir ? path.resolve(baseDir) : defaultBase
    this.filePath = path.join(this.dir, `${connectionId}.jsonl`)
  }

  open() {
    if (this.opened) return
    fs.mkdirSync(this.dir, { recursive: true })
    this.stream = fs.createWriteStream(this.filePath, { flags: 'a' })
    this.opened = true
  }

  log(event: string, data?: any) {
    try {
      if (!this.opened) this.open()
      const record: JsonlEvent = {
        ts: new Date().toISOString(),
        event,
        connectionId: this.connectionId,
        data: data ?? undefined,
      }
      this.stream?.write(JSON.stringify(record) + '\n')
    } catch (err) {
      // Ensure logging never crashes the server
       
      console.warn(`[${this.connectionId}] JSONL log failed:`, err)
    }
  }

  close() {
    try {
      this.stream?.end()
      this.stream = null
      this.opened = false
    } catch {
      // ignore
    }
  }
}
