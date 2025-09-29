import { WebSocketServer, WebSocket } from 'ws'
import type { RawData } from 'ws'
import { GoogleGenAI } from '@google/genai'
import { v4 as uuidv4 } from 'uuid'
import { Buffer } from 'buffer'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config();

// Use PORT for Fly.io compatibility, fallback to 3001 for local development
const PORT = process.env.PORT || process.env.LIVE_SERVER_PORT || 3001;
console.log(`🔧 Environment check: PORT=${process.env.PORT}, LIVE_SERVER_PORT=${process.env.LIVE_SERVER_PORT}, Using: ${PORT}`);
const IS_MOCK = (process.env.FBC_USE_MOCKS === '1' || process.env.LIVE_MOCK === '1');

// Voice & Language Utilities
const VOICE_BY_LANG: Record<string, string> = {
  'en-US': 'Puck',
  'en-GB': 'Puck',
  'nb-NO': 'Puck',
  'sv-SE': 'Puck',
  'de-DE': 'Puck',
  'es-ES': 'Puck',
};

function isBcp47(s?: string) {
  return typeof s === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z]{2}|\-[A-Za-z]{4})?(-[A-Za-z]{2}|\-[0-9]{3})?$/.test(s);
}

// --- Server Setup ---
let wss: WebSocketServer
let sslOptions = {};
const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.FLY_APP_NAME;

if (isLocalDev) {
  try {
    sslOptions = {
      key: fs.readFileSync(path.join(__dirname, '..', 'localhost-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '..', 'localhost.pem')),
    };
    console.info('🔐 SSL certificates loaded for local development');
  } catch (error) {
    console.warn('⚠️  SSL certificates not found. Run: mkcert localhost');
    console.warn('Falling back to HTTP for local development');
  }
}

// Create server based on environment
const useTls = Boolean(process.env.LIVE_SERVER_TLS) && process.env.LIVE_SERVER_TLS !== 'false' && isLocalDev && Object.keys(sslOptions).length > 0
const healthServer = useTls
  ? https.createServer(sslOptions, (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      }
    })
  : http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
      } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('WebSocket Server Running - Connect via WebSocket')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      }
    });

const server = healthServer.listen(Number(PORT), '0.0.0.0', () => {
  const protocol = useTls ? 'HTTPS/WSS' : 'HTTP/WS';
  console.info(`🚀 WebSocket server listening on port ${PORT} (0.0.0.0:${PORT})`);
  console.info(`🔐 Using ${protocol} protocol`);
  console.info(`🌍 Environment: NODE_ENV=${process.env.NODE_ENV}, FLY_APP_NAME=${process.env.FLY_APP_NAME}`);
});

// Initialize WebSocket server bound to the HTTP(S) server
wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
  maxPayload: 10 * 1024 * 1024,
  verifyClient: (info: { origin: string; req: http.IncomingMessage; secure: boolean }) => {
    // Log connection attempts for debugging
    console.info(`🔌 WebSocket connection attempt from ${info.origin || 'unknown origin'}`)
    return true // Accept all connections for now
  },
  handleProtocols: (protocols: Set<string>) => {
    // Handle any subprotocols if needed
    return protocols.values().next().value || false
  }
})

// Keep connections alive
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.ping(); } catch {}
    }
  })
}, 25_000)
server.on('close', () => clearInterval(pingInterval))

// Error handlers
const nodeProcess = (globalThis as any).process as NodeJS.Process | undefined
nodeProcess?.on('uncaughtException', (err: unknown) => {
  console.error('UNCAUGHT_EXCEPTION:', err)
})
nodeProcess?.on('unhandledRejection', (reason: unknown) => {
  console.error('UNHANDLED_REJECTION:', reason)
})

// Store active Live API sessions
const activeSessions = new Map<string, { ws: WebSocket; session: any }>();
const sessionStarting = new Set<string>()

// Helper function for safe WebSocket sends
function safeSend(ws: WebSocket, data: any, isBinary = false) {
  if (ws.readyState !== WebSocket.OPEN) return
  if (ws.bufferedAmount > 1_000_000) return
  try {
    ws.send(data, { binary: isBinary })
  } catch (e) {
    console.error('safeSend error:', e)
  }
}

async function handleStart(connectionId: string, ws: WebSocket, payload: any) {
  console.info(`[${connectionId}] 🔊 handleStart called with payload:`, JSON.stringify(payload));

  // Prevent concurrent starts
  if (sessionStarting.has(connectionId)) {
    console.info(`[${connectionId}] 🔊 start() already in progress; skipping duplicate call.`)
    return
  }
  sessionStarting.add(connectionId)

  // Close existing session if any
  if (activeSessions.has(connectionId)) {
    console.info(`[${connectionId}] Session already exists. Closing old one.`);
    try { activeSessions.get(connectionId)?.session?.close?.(); } catch {}
  }

  if (IS_MOCK) {
    // Mock session: immediately report started without touching Gemini
    safeSend(ws, JSON.stringify({ type: 'session_started', payload: { connectionId, languageCode: payload?.languageCode || 'en-US', voiceName: payload?.voiceName || 'Puck', mock: true } }));
    activeSessions.set(connectionId, { ws, session: {} as any });
    sessionStarting.delete(connectionId)
    return
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error(`[${connectionId}] FATAL: GEMINI_API_KEY not configured.`);
    safeSend(ws, JSON.stringify({ type: 'error', payload: { message: 'GEMINI_API_KEY not configured on server.' } }));
    sessionStarting.delete(connectionId)
    return;
  }

  try {
    const requestedLang = isBcp47(payload?.languageCode) ? payload.languageCode : undefined
    const lang = requestedLang || 'en-US'
    const requestedVoice = typeof payload?.voiceName === 'string' ? payload.voiceName : undefined
    const voiceName = requestedVoice || VOICE_BY_LANG[lang] || 'Puck'

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Use a Live-supported model. Allow override via env.
    const model = process.env.GEMINI_LIVE_MODEL || 'gemini-2.5-flash-native-audio-preview-09-2025'

    console.info(`[${connectionId}] Connecting to Live API with model: ${model}`)

    let isOpen = false

    const session: any = await ai.live.connect({
      model,
      callbacks: {
        onopen: () => {
          isOpen = true
          console.info(`[${connectionId}] Live API session opened`)
        },
        onmessage: (message: any) => {
          // Handle text + audio parts from Live server messages
          if (message?.serverContent?.modelTurn?.parts) {
            for (const part of message.serverContent.modelTurn.parts) {
              if (part.text) {
                safeSend(ws, JSON.stringify({ type: 'text', payload: { content: part.text } }))
              }
              // For native audio models, audio may arrive as inlineData
              if (part.inlineData?.data) {
                const audioBase64 = part.inlineData.data
                safeSend(ws, JSON.stringify({
                  type: 'audio',
                  payload: { audioData: audioBase64, mimeType: 'audio/pcm;rate=24000' }
                }))
              }
            }
          }
        },
        onerror: (error: any) => {
          console.error(`[${connectionId}] Live API error:`, error)
          safeSend(ws, JSON.stringify({ type: 'error', payload: { message: 'Live API error' } }))
        },
        onclose: () => {
          isOpen = false
          console.info(`[${connectionId}] Live API session closed`)
          activeSessions.delete(connectionId)
          safeSend(ws, JSON.stringify({ type: 'session_closed', payload: { reason: 'live_api_closed' } }))
        }
      }
    })

    // Apply compatibility shim for session.start() method
    // Gemini Live API session is already active on connect(), but some code expects a start() method
    if (typeof session.start !== 'function') {
      session.start = async () => {
        // No-op. Session is already active on connect.
        if (!isOpen) {
          // Wait a microtask to allow onopen to flip in edge cases.
          await Promise.resolve()
        }
      }
    }

    // Convenience helpers
    session.isOpen = () => isOpen
    session.waitUntilOpen = async (retries = 50, delayMs = 50) => {
      for (let i = 0; i < retries; i++) {
        if (isOpen) return
        await new Promise((r) => setTimeout(r, delayMs))
      }
      if (!isOpen) throw new Error('Live session failed to open in time')
    }

    console.info(`[${connectionId}] Live API session established and ready`)

    activeSessions.set(connectionId, { ws, session });
    console.info(`[${connectionId}] Live API session established.`)

    // Send session started message to client
    safeSend(ws, JSON.stringify({ type: 'session_started', payload: { connectionId, languageCode: lang, voiceName } }));

  } catch (error) {
    console.error(`[${connectionId}] Failed to start Live API session:`, error);
    safeSend(ws, JSON.stringify({ type: 'error', payload: { message: error instanceof Error ? error.message : 'Failed to start session' } }));
  } finally {
    sessionStarting.delete(connectionId)
  }
}

async function handleUserMessage(connectionId: string, ws: WebSocket, payload: any) {
  if (IS_MOCK) {
    // Mock response
    if (payload?.audioData) {
      const mockText = 'Mock: I heard you. This is a placeholder response.'
      safeSend(ws, JSON.stringify({ type: 'text', payload: { content: mockText } }))
      safeSend(ws, JSON.stringify({ type: 'model_text', payload: { text: mockText } }))
    }
    return
  }

  if (payload.audioData && payload.mimeType) {
    const client = activeSessions.get(connectionId)
    if (!client) {
      console.warn(`[${connectionId}] No active session to send audio to`)
      return
    }

    try {
      // Convert base64 to buffer and send to Live API
      const audioBuffer = Buffer.from(payload.audioData, 'base64')
      await client.session.sendRealtimeInput({
        audio: audioBuffer
      })
      console.info(`[${connectionId}] Audio sent to Live API (${audioBuffer.length} bytes)`)
    } catch (e) {
      console.error(`[${connectionId}] Failed to send audio to Live API:`, e)
      safeSend(ws, JSON.stringify({ type: 'error', payload: { message: 'Failed to send audio to Live API' } }))
    }
    return
  }

  // Handle text messages if needed in the future
}

function handleClose(connectionId: string) {
  const client = activeSessions.get(connectionId);
  if (client) {
    try { client.session.close(); } catch {}
    activeSessions.delete(connectionId);
  }
  console.info(`[${connectionId}] Session removed.`);
}

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const connectionId = uuidv4();
  try { (req.socket as any)?.setNoDelay?.(true) } catch {}
  console.info(`[${connectionId}] Client connected.`);

  // Acknowledge connection
  safeSend(ws, JSON.stringify({ type: 'connected', payload: { connectionId } }))

  ws.on('message', async (message: RawData) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      console.info(`[${connectionId}] Received message type: ${parsedMessage.type}`);
      switch (parsedMessage.type) {
        case 'start':
          console.info(`[${connectionId}] Handling start message`);
          await handleStart(connectionId, ws, parsedMessage.payload);
          break;
        case 'user_audio':
          console.info(`[${connectionId}] Handling user_audio message`);
          await handleUserMessage(connectionId, ws, parsedMessage.payload);
          break;
        case 'TURN_COMPLETE': {
          console.info(`[${connectionId}] Handling TURN_COMPLETE message`);
          if (IS_MOCK) {
            safeSend(ws, JSON.stringify({ type: 'turn_complete' }))
            break
          }
          const client = activeSessions.get(connectionId)
          if (!client) {
            console.warn(`[${connectionId}] TURN_COMPLETE received but no active session`)
            console.warn(`[${connectionId}] Active sessions: ${Array.from(activeSessions.keys()).join(', ')}`)
            break
          }
          try {
            await client.session.sendClientContent({ turnComplete: true })
            console.info(`[${connectionId}] turnComplete sent to Live API`)
            safeSend(ws, JSON.stringify({ type: 'turn_complete' }))
          } catch (e) {
            console.error(`[${connectionId}] Failed to send turnComplete to Live API:`, e)
          }
          break
        }
        default:
          console.warn(`[${connectionId}] Unknown message type: ${parsedMessage.type}`)
      }
    } catch (error) {
      console.error(`[${connectionId}] Error processing message:`, error);
    }
  });

  ws.on('close', (code: number, reason: Buffer) => {
    console.info(`[${connectionId}] WebSocket closed. Code: ${code}, Reason: ${reason?.toString?.() || 'N/A'}`)
    handleClose(connectionId)
  });

  ws.on('error', (err) => {
    console.error(`[${connectionId}] WebSocket error:`, err)
    handleClose(connectionId)
  });
});

console.info('Server setup complete.');
