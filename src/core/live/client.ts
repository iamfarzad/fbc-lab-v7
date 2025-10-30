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
  private pendingStartOpts: { languageCode?: string; voiceName?: string; sessionId?: string } | null = null
  private devLogEnabled = (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_CLIENT_LIVE_LOG === '1' || (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_CLIENT_LIVE_LOG !== '0')))
  private lastLogTime = 0

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
    // Clean up failed/closed sockets before reconnecting
    if (this.socket) {
      const readyState = this.socket.readyState
      if (readyState === WebSocket.CLOSED || readyState === WebSocket.CLOSING) {
        // Socket is closed/closing, clean it up
        this.socket = null
      } else if (readyState === WebSocket.OPEN) {
        // Socket is already open, skip
        console.log('🔌 [LiveClient] Socket already exists and is open, skipping connect');
        return;
      } else if (readyState === WebSocket.CONNECTING) {
        // Socket is connecting - wait a bit, but if it's been too long, clean it up
        // This handles cases where connection is stuck
        console.log('🔌 [LiveClient] Socket already exists and is connecting, skipping connect');
        return;
      }
    }
    const url = WEBSOCKET_CONFIG.URL
    console.log('🔌 [LiveClient] Connecting to:', url);
    const ws = new WebSocket(url)
    this.socket = ws

    ws.onopen = () => {
      console.log('🔌 [LiveClient] WebSocket opened successfully');
      this.emit('open')
    }
    ws.onclose = () => {
      this.emit('close')
      this.socket = null
    }
    ws.onerror = (error) => {
      console.error('🔌 [LiveClient] WebSocket error:', error);
      this.emit('error', 'WebSocket error')
      // Always clean up socket on error to allow reconnection
      // The socket will be in CLOSED or CLOSING state after error
      setTimeout(() => {
        if (this.socket && (this.socket.readyState === WebSocket.CLOSED || this.socket.readyState === WebSocket.CLOSING)) {
          this.socket = null
        }
      }, 100)
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
        // Send queued start message if it exists
        if (this.pendingStartOpts) {
          const opts = this.pendingStartOpts
          this.pendingStartOpts = null
          this.send({ type: 'start', payload: opts })
        }
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
      case 'stage_update':
        this.emit('stage_update', msg.payload)
        break
      case 'error':
        this.emit('error', msg.payload.message)
        break
    }
  }

  start(opts?: { languageCode?: string; voiceName?: string; sessionId?: string }) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    
    // Always queue the start message until we receive 'connected' from server
    if (!this.connectionId) {
      console.log('🔌 [LiveClient] Queueing start message until server sends connected event');
      this.pendingStartOpts = opts || {}
      return
    }
    
    // If already connected, send immediately
    this.send({ type: 'start', payload: opts || {} })
  }

  stop() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    // Client should not emit TURN_COMPLETE (server -> client event)
    this.send({ type: 'stop' })
  }

  sendText(text: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'REALTIME_INPUT', payload: { chunks: [{ text }] } })
  }

  sendAudioBase64PCM16(base64: string, mimeType = 'audio/pcm;rate=24000') {
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
    try { this.socket?.close() } catch { /* ignore close errors */ }
    this.socket = null
  }

  private send(message: Record<string, unknown>) {
    try { this.socket?.send(JSON.stringify(message)) } catch { /* ignore send errors */ }
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
    } catch { /* ignore dev log errors */ }
  }
}

// Backward-compat no-op export (previous prototype-based connect)
export async function connectLive(): Promise<LiveClientWS> {
  const client = new LiveClientWS()
  client.connect()
  return client
}

// Browser-global singleton to survive HMR/fast refresh in dev and avoid
// creating multiple WebSocket connections. Always prefer this when not
// explicitly injecting a client instance.
declare global {
  interface Window { __fbc_liveClient?: LiveClientWS }
}

export function getLiveClientSingleton(): LiveClientWS {
  // Only create one instance per-window. For SSR, fall back to a new instance.
  if (typeof window !== 'undefined') {
    if (!window.__fbc_liveClient) {
      window.__fbc_liveClient = new LiveClientWS()
    }
    return window.__fbc_liveClient
  }
  // Non-browser environments shouldn't leak a global; return a fresh instance
  return new LiveClientWS()
}
