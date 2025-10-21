import { useEffect, useMemo, useRef, useState } from 'react'
import { LiveClientWS } from '@/core/live/client'

type LogEntry = { ts: number; level: 'info'|'warn'|'error'; msg: string; data?: any }

export function LiveConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const clientRef = useRef<LiveClientWS | null>(null)

  const add = (entry: LogEntry) => setLogs((prev) => [...prev.slice(-199), entry])

  const client = useMemo(() => new LiveClientWS(), [])

  useEffect(() => {
    clientRef.current = client
    client.connect()
    const off = [
      client.on('open', () => add({ ts: Date.now(), level: 'info', msg: 'ws open' })),
      client.on('close', () => add({ ts: Date.now(), level: 'warn', msg: 'ws close' })),
      client.on('error', (m) => add({ ts: Date.now(), level: 'error', msg: 'ws error', data: m })),
      client.on('connected', (id) => add({ ts: Date.now(), level: 'info', msg: 'connected', data: id })),
      client.on('session_started', (p) => add({ ts: Date.now(), level: 'info', msg: 'session_started', data: p })),
      client.on('session_closed', (r) => add({ ts: Date.now(), level: 'warn', msg: 'session_closed', data: r })),
      client.on('input_transcript', (t, f) => add({ ts: Date.now(), level: 'info', msg: f? 'input_final' : 'input_partial', data: t })),
      client.on('output_transcript', (t, f) => add({ ts: Date.now(), level: 'info', msg: f? 'output_final' : 'output_partial', data: t })),
      client.on('text', (c) => add({ ts: Date.now(), level: 'info', msg: 'text', data: c })),
      client.on('audio', (_, mime) => add({ ts: Date.now(), level: 'info', msg: 'audio', data: mime })),
      client.on('turn_complete', () => add({ ts: Date.now(), level: 'info', msg: 'turn_complete' })),
      client.on('setup_complete', () => add({ ts: Date.now(), level: 'info', msg: 'setup_complete' })),
      client.on('interrupted', () => add({ ts: Date.now(), level: 'warn', msg: 'interrupted' })),
      client.on('tool_call', (p) => add({ ts: Date.now(), level: 'info', msg: 'tool_call', data: p })),
      client.on('tool_result', (p) => add({ ts: Date.now(), level: 'info', msg: 'tool_result', data: p })),
    ]
    return () => { off.forEach((fn) => fn()); client.disconnect() }
  }, [client])

  const start = () => clientRef.current?.start()
  const stop = () => clientRef.current?.stop()

  return (
    <div className="border rounded-md p-3 text-xs font-mono">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={start} className="px-2 py-1 border rounded">start</button>
        <button onClick={stop} className="px-2 py-1 border rounded">stop</button>
      </div>
      <div className="max-h-64 overflow-auto space-y-1">
        {logs.map((l, i) => (
          <div key={i} className={l.level === 'error' ? 'text-red-600' : l.level === 'warn' ? 'text-amber-600' : 'text-foreground/80'}>
            {new Date(l.ts).toLocaleTimeString()} — {l.msg} {l.data !== undefined ? JSON.stringify(l.data) : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

