import { WEBSOCKET_CONFIG } from '@/config/constants'
import type { LiveServerEvent, LiveClientEventMap } from '@/core/live/types'
type ToolResponse = { functionResponses?: unknown[] }

/**
 * LiveClientWS — Evented client for the server-managed Live WebSocket.
 * No API key in browser; connects to WEBSOCKET_CONFIG.URL and speaks
 * the unified message protocol used in server/live-server.ts.
 */
export class LiveClientWS {
  private socket: WebSocket | null = null
  private listeners = new Map<keyof LiveClientEventMap, Set<(...args: unknown[]) => void>>()
  // reserved for future state queries (intentionally unused)
  // private isReady = false
  private connectionId: string | null = null
  private devLogEnabled = (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_CLIENT_LIVE_LOG === '1' || (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_CLIENT_LIVE_LOG !== '0')))
  private lastLogTime = 0
  private pendingStartMessage: { type: 'start'; payload: any } | null = null

  on<K extends keyof LiveClientEventMap>(event: K, cb: LiveClientEventMap[K]) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    const listeners = this.listeners.get(event)
    if (listeners) listeners.add(cb as (...args: unknown[]) => void)
    return () => this.off(event, cb)
  }

  off<K extends keyof LiveClientEventMap>(event: K, cb: LiveClientEventMap[K]) {
    this.listeners.get(event)?.delete(cb as (...args: unknown[]) => void)
  }

  private emit<K extends keyof LiveClientEventMap>(event: K, ...args: Parameters<LiveClientEventMap[K]>) {
    this.listeners.get(event)?.forEach((fn) => {
      try { 
        (fn as (...args: unknown[]) => void)(...args) 
      } catch {
        // Silently ignore errors in event handlers
      }
    })
  }

  connect() {
    if (this.socket) {
      console.log('🔌 [LiveClient] Socket already exists, skipping connect');
      return;
    }
    const url = WEBSOCKET_CONFIG.URL
    console.log('🔌 [LiveClient] Connecting to:', url);
    const ws = new WebSocket(url)
    this.socket = ws

    ws.onopen = () => {
      console.log('🔌 [LiveClient] WebSocket opened successfully');
      this.emit('open')
      
      // Set up connected event listener immediately to catch server's connected event
      this.on('connected', () => {
        console.log('🔌 [LiveClient] Received connected event from server')
        // Send any pending start message after connection is established
        if (this.pendingStartMessage) {
          console.log('🔌 [LiveClient] Sending queued start message after handshake')
          this.send(this.pendingStartMessage)
          this.pendingStartMessage = null
        }
      })
    }
    ws.onclose = () => {
      this.emit('close')
      this.socket = null
    }
    ws.onerror = () => {
      this.emit('error', 'WebSocket error')
    }
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data) as LiveServerEvent
        this.routeEvent(msg)
      } catch {
        this.emit('error', 'Malformed server event')
      }
    }
  }

  private routeEvent(msg: LiveServerEvent) {
    this.devLog('event', { type: msg.type })
    switch (msg.type) {
      case 'connected':
        this.connectionId = msg.payload.connectionId
        this.emit('connected', this.connectionId)
        break
      case 'session_started':
        this.emit('session_started', msg.payload)
        break
      case 'session_closed':
        this.emit('session_closed', msg.payload?.reason)
        break
      case 'input_transcript':
        this.emit('input_transcript', msg.payload.text, Boolean(msg.payload.isFinal))
        break
      case 'output_transcript':
        this.emit('output_transcript', msg.payload.text, Boolean(msg.payload.isFinal))
        break
      case 'text':
        this.emit('text', msg.payload.content)
        break
      case 'audio':
        this.emit('audio', msg.payload.audioData, msg.payload.mimeType)
        break
      case 'turn_complete':
        this.emit('turn_complete')
        break
      case 'setup_complete':
        this.emit('setup_complete')
        break
      case 'interrupted':
        this.emit('interrupted')
        break
      case 'tool_call':
        this.emit('tool_call', msg.payload)
        break
      case 'tool_result':
        this.emit('tool_result', msg.payload)
        break
      case 'error':
        this.emit('error', msg.payload.message)
        break
    }
  }

  start(opts?: { languageCode?: string; voiceName?: string; sessionId?: string }) {
    const startMessage = { type: 'start' as const, payload: opts || {} }

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.pendingStartMessage = startMessage
      console.log('🔌 [LiveClient] Socket not ready, queuing start message')
      return
    }

    // ✅ Wait until we get the "connected" handshake from the server
    if (!this.connectionId) {
      console.log('🔌 [LiveClient] Waiting for server "connected" event before sending start')
      this.on('connected', () => {
        this.send(startMessage)
        console.log('🔌 [LiveClient] Start message sent after handshake')
      })
      return
    }

    this.send(startMessage)
    console.log('🔌 [LiveClient] Start message sent immediately (connection already established)')
  }

  stop() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'TURN_COMPLETE' })
    this.send({ type: 'stop' })
  }

  sendText(text: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'REALTIME_INPUT', payload: { chunks: [{ text }] } })
  }

  sendAudioBase64PCM16(base64: string, mimeType = 'audio/pcm;rate=16000') {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'user_audio', payload: { audioData: base64, mimeType } })
  }

  sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'REALTIME_INPUT', payload: { chunks } })
  }

  sendContextUpdate(update: { sessionId?: string; modality: 'screen' | 'webcam'; analysis: string; imageData?: string; capturedAt?: number }) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'CONTEXT_UPDATE', payload: update })
  }

  sendToolResponse(responses: ToolResponse['functionResponses']) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    if (!responses || responses.length === 0) return
    this.send({ type: 'TOOL_RESULT', payload: { responses } })
  }

  ackHeartbeat() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'heartbeat_ack', timestamp: Date.now() })
  }

  disconnect() {
    try { this.socket?.close() } catch {}
    this.socket = null
  }

  private send(message: Record<string, unknown>) {
    try { this.socket?.send(JSON.stringify(message)) } catch {}
  }

  private devLog(event: string, data?: unknown) {
    if (!this.devLogEnabled) return
    try {
      // Throttle dev logging to prevent resource exhaustion
      const now = Date.now()
      if (this.lastLogTime && now - this.lastLogTime < 100) { // Max 10 logs per second
        return
      }
      this.lastLogTime = now
      
      const payload = { category: 'client-live', event, data, ts: now }
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
        navigator.sendBeacon('/api/dev/log', blob)
      } else if (typeof fetch !== 'undefined') {
        fetch('/api/dev/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {})
      }
    } catch {}
  }
}

// Backward-compat no-op export (previous prototype-based connect)
export async function connectLive(): Promise<LiveClientWS> {
  const client = new LiveClientWS()
  client.connect()
  return client
}
