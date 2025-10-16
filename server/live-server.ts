import { WebSocketServer, WebSocket } from 'ws'
import type { RawData } from 'ws'
import { GoogleGenAI, Modality } from '@google/genai'
import { v4 as uuidv4 } from 'uuid'
import { Buffer } from 'buffer'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { SessionLogger } from './session-logger'
import { GEMINI_MODELS } from '../src/config/constants.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local first (if exists), then fallback to .env
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

// Use PORT for Fly.io compatibility, fallback to 3001 for local development
const PORT = process.env.PORT || process.env.LIVE_SERVER_PORT || 3001;
console.log(`🔧 Environment check: PORT=${process.env.PORT}, LIVE_SERVER_PORT=${process.env.LIVE_SERVER_PORT}, Using: ${PORT}`);

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
  return typeof s === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z]{2}|-[A-Za-z]{4})?(-[A-Za-z]{2}|-[0-9]{3})?$/.test(s)
}

const decodeRawMessage = (raw: RawData): string => {
  if (typeof raw === 'string') return raw
  if (Buffer.isBuffer(raw)) return raw.toString('utf8')
  if (ArrayBuffer.isView(raw)) return Buffer.from(raw.buffer).toString('utf8')
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8')
  return ''
}

// --- Server Setup ---
let sslOptions = {};
const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.FLY_APP_NAME;

if (isLocalDev) {
  try {
    sslOptions = {
      key: fs.readFileSync(path.join(__dirname, 'localhost-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'localhost.pem')),
    };
    console.info('🔐 SSL certificates loaded for local development');
  } catch (error) {
    console.warn('⚠️  SSL certificates not found. Run: mkcert localhost', error);
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
const wss = new WebSocketServer({
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

// Keep connections alive with heartbeat pings
const pingInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.ping();
        // Also send a lightweight heartbeat message for additional reliability
        ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
      } catch (error) {
        console.warn('Failed to send ping to client:', error);
      }
    }
  })
}, 25_000) // 25 seconds - well within the 600s idle timeout
server.on('close', () => clearInterval(pingInterval))

// Error handlers
const nodeProcess = (globalThis as any).process as NodeJS.Process | undefined
nodeProcess?.on('uncaughtException', (err: unknown) => {
  console.error('UNCAUGHT_EXCEPTION:', err)
})
nodeProcess?.on('unhandledRejection', (reason: unknown) => {
  console.error('UNHANDLED_REJECTION:', reason)
})

// --- Live Config: System instruction and tool declarations ---
const CHAT_PERSONALITY = `
You are F.B/c, Farzad Bayat's sharp, friendly consulting assistant.
- Speak concisely (2 sentences max by default).
- Ask one focused question when you need more context.
- Keep a natural voice tone; avoid lists unless asked.
- You have VISUAL CAPABILITIES: You can see webcam and screen share video frames in real-time.
- When you receive video input, acknowledge what you see and provide relevant insights.
Pronunciation: "Farzad Bayat" ~ "Fahr–zahd Bye–yaht" (soft 'a' in Farzad).
`;

const FUNCTION_DECLARATIONS: any[] = [
  {
    name: 'search_web',
    description: 'Search the web for current information and return grounded, cited findings.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to submit.' },
        urls: { type: 'array', items: { type: 'string' }, description: 'Optional URLs to prioritize.' }
      },
      required: ['query']
    }
  },
  {
    name: 'capture_screen_snapshot',
    description: 'Retrieve the latest analyzed screen-share context for this session.',
    parameters: {
      type: 'object',
      properties: { summaryOnly: { type: 'boolean', description: 'Omit raw image data when true.' } }
    }
  },
  {
    name: 'capture_webcam_snapshot',
    description: 'Retrieve the latest analyzed webcam context for this session.',
    parameters: {
      type: 'object',
      properties: { summaryOnly: { type: 'boolean', description: 'Omit raw image data when true.' } }
    }
  }
];

// Visual trigger + throttle configuration (parameterized via env)
const VISUAL_TRIGGER_WORDS: string[] = (process.env.LIVE_SERVER_VISUAL_TRIGGERS || 'screen,showing,look at,see this,dashboard,workflow')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const VISUAL_INJECT_THROTTLE_MS = Math.max(
  0,
  Number.parseInt(process.env.LIVE_SERVER_VISUAL_INJECT_THROTTLE_MS || '8000', 10) || 8000
);

// Visual context snapshot & session record types
type Snapshot = {
  analysis: string;
  capturedAt: number;
  imageData?: string;
  lastInjected?: number;
};

type ActiveSessionRecord = {
  ws: WebSocket;
  session: any;
  latestContext: {
    screen?: Snapshot;
    webcam?: Snapshot;
  };
  injectionTimers?: {
    screen?: ReturnType<typeof setTimeout>;
    webcam?: ReturnType<typeof setTimeout>;
  };
  logger?: SessionLogger;
};

// Store active Live API sessions
const activeSessions = new Map<string, ActiveSessionRecord>();
// Feature flag + debounce controls for CONTEXT_UPDATE → Live injection
const INJECT_ON_CONTEXT_UPDATE = process.env.LIVE_SERVER_INJECT_ON_CONTEXT_UPDATE === '0' ? false : true;
const CONTEXT_INJECT_DEBOUNCE_MS = Math.max(
  0,
  Number.parseInt(process.env.LIVE_SERVER_CONTEXT_INJECT_DEBOUNCE_MS || '600', 10) || 600
);
const sessionStarting = new Set<string>()
// Avoid emitting spurious session_closed when restarting a Live session for the same WS
const closingForRestart = new Set<string>()

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
    try {
      closingForRestart.add(connectionId)
      activeSessions.get(connectionId)?.session?.close?.()
    } catch (error) {
      console.warn(`[${connectionId}] Failed to close previous session`, error)
    }
  }

  // Mock disabled: always use Live API

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

    // Use a Live-supported model. Allow override via env, fallback to config
    const model = `models/${process.env.GEMINI_LIVE_MODEL || GEMINI_MODELS.DEFAULT_VOICE}`

    console.info(`[${connectionId}] Connecting to Live API with model: ${model}`)

    let isOpen = false

    // Restored working Live configuration (from before c9ace40)
    const modalities: Modality[] = [Modality.AUDIO]
    // Only enable TEXT modality when explicitly opted-in (some audio-native models do not support TEXT)
    if (process.env.LIVE_SERVER_TEXT_MODALITY === '1' || process.env.LIVE_SERVER_TEXT_MODALITY === 'true') {
      modalities.push(Modality.TEXT as any)
    }
    const liveConfig: any = {
      responseModalities: modalities,
      systemInstruction: CHAT_PERSONALITY,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } }
      },
      // Enable transcriptions explicitly with language (Live API expects `language` key)
      inputAudioTranscription: { language: lang },
      outputAudioTranscription: { enable: true },
    }

    const session: any = await ai.live.connect({
      model,
      config: liveConfig,  // ← Pass config as separate parameter
      callbacks: {
        onopen: () => {
          isOpen = true
          console.info(`[${connectionId}] Live API session opened`)
          activeSessions.get(connectionId)?.logger?.log('live_open')
        },
        onmessage: async (message: any) => {
          try {
            // Setup complete
            if (message?.setupComplete) {
              safeSend(ws, JSON.stringify({ type: 'setup_complete', payload: { setupComplete: true } }));
              activeSessions.get(connectionId)?.logger?.log('setup_complete')
            }

            // Tool calls
            if (message?.toolCall) {
              safeSend(ws, JSON.stringify({ type: 'tool_call', payload: message.toolCall }));
              activeSessions.get(connectionId)?.logger?.log('tool_call', message.toolCall)
            }

            const serverContent = message?.serverContent;
            if (!serverContent) return;

            // Transcriptions
            if (serverContent.inputTranscription) {
              const text = serverContent.inputTranscription.text;
              const isFinal = (serverContent.inputTranscription as any).isFinal ?? false;
              // Compat: include both isFinal and final to support older clients
              safeSend(ws, JSON.stringify({ type: 'input_transcript', payload: { text, isFinal, final: isFinal } }));
              activeSessions.get(connectionId)?.logger?.log('input_transcript', { text, isFinal })

              // Heuristic: if the user explicitly references visual context, inject latest snapshot
              if (isFinal) {
                try {
                  const transcript = String(text || '').toLowerCase();
                  const visualTriggers = VISUAL_TRIGGER_WORDS;
                  if (visualTriggers.some(w => transcript.includes(w))) {
                    const clientRec = activeSessions.get(connectionId);
                    const snap = clientRec?.latestContext?.screen || clientRec?.latestContext?.webcam;
                    if (clientRec && snap) {
                      const now = Date.now();
                      if (typeof snap.lastInjected === 'number' && snap.lastInjected > now - VISUAL_INJECT_THROTTLE_MS) {
                        console.info(`[${connectionId}] Visual trigger detected but recent injection exists; skipping`);
                        clientRec.logger?.log('context_injection_skipped', { reason: 'recent_injection', throttleMs: VISUAL_INJECT_THROTTLE_MS })
                      } else {
                        const parts: any[] = [];
                        if (snap.imageData) {
                          const base64Data = snap.imageData.replace(/^data:image\/\w+;base64,/, '');
                          parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
                        }
                        parts.push({ text: `Visual context: ${snap.analysis.substring(0, 200)}` });
                        // Prefer sendClientContent if available; fallback to send with clientContent wrapper
                        if (typeof clientRec.session.sendClientContent === 'function') {
                          await clientRec.session.sendClientContent({
                            turns: [{ role: 'user', parts }],
                            turnComplete: false,
                          });
                        } else {
                          throw new Error('Live session cannot accept client content (no method)');
                        }
                        snap.lastInjected = now;
                        console.info(`[${connectionId}] ✅ Injected visual context due to transcript trigger`);
                        clientRec.logger?.log('context_injected', { modality: clientRec.latestContext?.screen ? 'screen' : 'webcam', hadImage: Boolean(snap.imageData), analysisSnippet: snap.analysis?.slice(0, 200) })
                      }
                    } else {
                      console.info(`[${connectionId}] Visual trigger detected but no latestContext available`);
                      clientRec?.logger?.log('context_injection_skipped', { reason: 'no_latest_context' })
                    }
                  }
                } catch (err) {
                  console.error(`[${connectionId}] Visual trigger injection failed:`, err);
                  activeSessions.get(connectionId)?.logger?.log('error', { where: 'visual_trigger_injection', message: err instanceof Error ? err.message : String(err) })
                }
              }
            }
            if (serverContent.outputTranscription) {
              const text = serverContent.outputTranscription.text;
              const isFinal = (serverContent.outputTranscription as any).isFinal ?? false;
              // Compat: include both isFinal and final to support older clients
              safeSend(ws, JSON.stringify({ type: 'output_transcript', payload: { text, isFinal, final: isFinal } }));
              activeSessions.get(connectionId)?.logger?.log('output_transcript', { text, isFinal })
            }

            // Text + audio parts
            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.text) {
                  safeSend(ws, JSON.stringify({ type: 'text', payload: { content: part.text } }));
                  activeSessions.get(connectionId)?.logger?.log('model_text', { text: part.text })
                }
                if (part.inlineData?.data) {
                  const audioBase64 = part.inlineData.data;
                  safeSend(ws, JSON.stringify({ type: 'audio', payload: { audioData: audioBase64, mimeType: 'audio/pcm;rate=24000' } }));
                  activeSessions.get(connectionId)?.logger?.log('audio_chunk', { direction: 'server_to_client', bytes: (audioBase64?.length || 0) * 0.75, mimeType: 'audio/pcm;rate=24000' })
                }
              }
            }

            if (serverContent.turnComplete) {
              safeSend(ws, JSON.stringify({ type: 'turn_complete', payload: { turnComplete: true } }));
              activeSessions.get(connectionId)?.logger?.log('turn_complete')
            }
          } catch (err) {
            console.error(`[${connectionId}] Live message handler error:`, err)
            activeSessions.get(connectionId)?.logger?.log('error', { where: 'live_onmessage', message: err instanceof Error ? err.message : String(err) })
          }
        },
        onerror: (error: any) => {
          const message = error?.message || (error instanceof Error ? error.message : 'Live API error');
          const code = (error && (error.code || error.status)) || undefined;
          console.error(`[${connectionId}] Live API error:`, { message, code, raw: error });
          safeSend(ws, JSON.stringify({ type: 'error', payload: { message, code } }))
          activeSessions.get(connectionId)?.logger?.log('error', { where: 'live_api', message, code })
        },
        onclose: (event: any) => {
          isOpen = false
          console.error(`[${connectionId}] ⚠️ Live API session closed`, {
            code: event?.code,
            reason: event?.reason,
            wasClean: event?.wasClean,
            timestamp: new Date().toISOString(),
            hadError: Boolean(event?.error)
          })
          const rec = activeSessions.get(connectionId)
          rec?.logger?.log('session_closed', { source: 'live_api' })
          rec?.logger?.close()
          activeSessions.delete(connectionId)
          // If we're intentionally restarting a session, don't emit session_closed to the client
          if (closingForRestart.has(connectionId)) {
            closingForRestart.delete(connectionId)
          } else {
            safeSend(ws, JSON.stringify({ type: 'session_closed', payload: { reason: 'live_api_closed' } }))
          }
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

    {
      const prev = activeSessions.get(connectionId)
      activeSessions.set(connectionId, { ws, session, latestContext: prev?.latestContext || {}, injectionTimers: prev?.injectionTimers, logger: prev?.logger });
    }
    console.info(`[${connectionId}] Live API session established.`)

    // Send session started message to client
    safeSend(ws, JSON.stringify({ type: 'session_started', payload: { connectionId, languageCode: lang, voiceName } }));
    activeSessions.get(connectionId)?.logger?.log('session_started', { languageCode: lang, voiceName })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start session';
    console.error(`[${connectionId}] Failed to start Live API session:`, error);
    safeSend(ws, JSON.stringify({ type: 'error', payload: { message } }));
    activeSessions.get(connectionId)?.logger?.log('error', { where: 'handleStart', message })
  } finally {
    sessionStarting.delete(connectionId)
  }
}

async function handleUserMessage(connectionId: string, ws: WebSocket, payload: any) {
  // Always use Live API in this configuration

  if (payload.audioData && payload.mimeType) {
    const client = activeSessions.get(connectionId)
    if (!client) {
      console.warn(`[${connectionId}] No active session to send audio to`)
      return
    }

    const audioData: string = String(payload.audioData || '')
    const mimeType: string = String(payload.mimeType || 'audio/pcm;rate=16000')

    // Light base64 sanity check
    const padding = audioData.endsWith('==') ? 2 : audioData.endsWith('=') ? 1 : 0
    const approxBytes = Math.max(0, Math.floor((audioData.length * 3) / 4) - padding)
    if (approxBytes === 0) {
      console.warn(`[${connectionId}] ⚠️ Audio payload appears empty after base64 calc`)
    }

    try {
      client.logger?.log('audio_chunk', { direction: 'client_to_server', bytes: approxBytes, mimeType })
      
      // Debug: log available session methods
      console.log(`[${connectionId}] Session methods:`, {
        hasSendRealtimeInput: typeof client.session.sendRealtimeInput,
        hasSend: typeof client.session.send,
        sessionKeys: Object.keys(client.session),
      })
      
      if (typeof client.session.sendRealtimeInput === 'function') {
        await client.session.sendRealtimeInput({ media: { mimeType, data: audioData } })
        console.info(`[${connectionId}] ✅ Audio sent via sendRealtimeInput (${audioData.length} chars, ${mimeType})`)
      } else {
        console.error(`[${connectionId}] ❌ sendRealtimeInput method not available on session`) 
        safeSend(ws, JSON.stringify({ type: 'error', payload: { message: 'Live session cannot accept audio (no sendRealtimeInput method)' } }))
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      const stack = e?.stack || 'No stack trace'
      console.error(`[${connectionId}] ❌ Failed to send audio to Live API:`, { 
        error: msg, 
        stack,
        hasRealtimeMethod: typeof client.session.sendRealtimeInput === 'function',
        hasSendMethod: typeof client.session.send === 'function'
      })
      safeSend(ws, JSON.stringify({ type: 'error', payload: { message: `Failed to send audio to Live API: ${msg}` } }))
    }
    return
  }

  // Handle text messages if needed in the future
}

function handleClose(connectionId: string) {
  const client = activeSessions.get(connectionId);
  if (client) {
    try { client.session?.close?.() } catch (error) {
      console.warn(`[${connectionId}] Failed to close session`, error)
    }
    activeSessions.delete(connectionId);
  }
  console.info(`[${connectionId}] Session removed.`);
}

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const connectionId = uuidv4();
  try { (req.socket as any)?.setNoDelay?.(true) } catch (error) {
    console.warn(`[${connectionId}] Unable to disable socket delay`, error)
  }
  console.info(`[${connectionId}] Client connected.`);

  // Acknowledge connection
  safeSend(ws, JSON.stringify({ type: 'connected', payload: { connectionId } }))

  // Initialize session logger early for this connection
  try {
    const logger = new SessionLogger(connectionId)
    logger.log('connected')
    // Seed an active session record so we can keep the logger before start
    activeSessions.set(connectionId, { ws, session: undefined as any, latestContext: {}, logger })
  } catch (e) {
    console.warn(`[${connectionId}] Failed to initialize session logger:`, e)
  }

  ws.on('message', async (message: RawData) => {
    try {
      const rawString = decodeRawMessage(message)
      const parsedMessage = rawString ? JSON.parse(rawString) : { type: 'unknown' }
      const messageType = String(parsedMessage?.type || 'unknown');
      console.info(`[${connectionId}] Received message type: ${messageType}`);
      switch (parsedMessage.type) {
        case 'start':
          console.info(`[${connectionId}] Handling start message`);
          try { activeSessions.get(connectionId)?.logger?.log('client_start', { payload: { languageCode: parsedMessage?.payload?.languageCode, voiceName: parsedMessage?.payload?.voiceName, sessionId: parsedMessage?.payload?.sessionId } }) } catch {}
          await handleStart(connectionId, ws, parsedMessage.payload);
          break;
        case 'user_audio':
          console.info(`[${connectionId}] Handling user_audio message`);
          await handleUserMessage(connectionId, ws, parsedMessage.payload);
          break;
        case 'TOOL_RESULT': {
          const client = activeSessions.get(connectionId);
          if (!client) {
            console.warn(`[${connectionId}] TOOL_RESULT received but no active session`);
            break;
          }
          const responses = parsedMessage.payload?.responses;
          if (!Array.isArray(responses) || responses.length === 0) {
            console.warn(`[${connectionId}] TOOL_RESULT missing responses`);
            break;
          }
          try {
            client.logger?.log('tool_result_client', { responsesCount: responses.length })
            await client.session.sendToolResponse({ functionResponses: responses });
            safeSend(ws, JSON.stringify({ type: 'tool_result', payload: { responses } }));
            client.logger?.log('tool_result_forwarded', { responsesCount: responses.length })
          } catch (err) {
            console.error(`[${connectionId}] Failed to forward tool responses to Live API:`, err);
            safeSend(ws, JSON.stringify({ type: 'tool_result', payload: { error: err instanceof Error ? err.message : 'Tool response failed' } }));
            client.logger?.log('error', { where: 'tool_result_forward', message: err instanceof Error ? err.message : String(err) })
          }
          break;
        }
        case 'REALTIME_INPUT': {
          console.info(`[${connectionId}] Handling REALTIME_INPUT message`);
          const client = activeSessions.get(connectionId);
          if (!client) {
            console.warn(`[${connectionId}] REALTIME_INPUT received but no active session`);
            break;
          }

          const payload = parsedMessage.payload ?? {};
          const chunks = Array.isArray(payload?.chunks) ? payload.chunks : [];

          if (chunks.length === 0) {
            console.warn(`[${connectionId}] REALTIME_INPUT received but no chunks`);
            break;
          }

          try {
            // Send chunks directly to Live API using sendRealtimeInput
            if (typeof client.session.sendRealtimeInput === 'function') {
              await client.session.sendRealtimeInput({ media: chunks[0] }); // Send first chunk
              console.info(`[${connectionId}] ✅ Webcam frame sent to Live API via sendRealtimeInput`);
              client.logger?.log('realtime_input_sent', { chunks: chunks.length, mimeType: chunks[0]?.mimeType });
            } else {
              console.warn(`[${connectionId}] sendRealtimeInput not available on session`);
            }
          } catch (err) {
            console.error(`[${connectionId}] Failed to send realtime input:`, err);
            client.logger?.log('error', { where: 'realtime_input', message: err instanceof Error ? err.message : String(err) });
          }
          break;
        }
        case 'CONTEXT_UPDATE': {
          console.info(`[${connectionId}] Handling CONTEXT_UPDATE message`);
          const client = activeSessions.get(connectionId);
          if (!client) {
            console.warn(`[${connectionId}] CONTEXT_UPDATE received but no active session`);
            break;
          }

          const payload = parsedMessage.payload ?? {};
          const modality = typeof payload?.modality === 'string' ? payload.modality : '';
          if (modality !== 'screen' && modality !== 'webcam') {
            console.warn(`[${connectionId}] CONTEXT_UPDATE ignored due to invalid modality: ${modality}`);
            break;
          }

          const analysis = typeof payload.analysis === 'string' ? payload.analysis : '';
          if (!analysis) {
            console.warn(`[${connectionId}] CONTEXT_UPDATE missing analysis text`);
            break;
          }

          const capturedAt = typeof payload.capturedAt === 'number' ? payload.capturedAt : Date.now();
          const imageData = typeof payload.imageData === 'string' ? payload.imageData : undefined;

          client.latestContext = client.latestContext || {};
          const modalityKey = modality as 'screen' | 'webcam';
          const prev = client.latestContext[modalityKey];
          client.latestContext[modalityKey] = {
            analysis,
            capturedAt,
            imageData,
            lastInjected: prev?.lastInjected
          };
          client.logger?.log('context_update', { modality, analysis, capturedAt, hasImage: Boolean(imageData), imageBytes: typeof imageData === 'string' ? Math.floor(imageData.length * 0.75) : 0 })

          if (!INJECT_ON_CONTEXT_UPDATE) {
            console.info(`[${connectionId}] CONTEXT_UPDATE received; injection disabled by flag`);
            break;
          }

          // Debounce injection per-modality to avoid spamming the Live API
          client.injectionTimers = client.injectionTimers || {};
          const timers = client.injectionTimers;
          if (timers[modalityKey]) {
            clearTimeout(timers[modalityKey]);
          }

          timers[modalityKey] = setTimeout(async () => {
            try {
              const snap = client.latestContext[modalityKey];
              if (!snap) return;
              const now = Date.now();
              if (typeof snap.lastInjected === 'number' && snap.lastInjected > now - VISUAL_INJECT_THROTTLE_MS) {
                console.info(`[${connectionId}] ${modality} context injection skipped (recently injected)`);
                client.logger?.log('context_injection_skipped', { modality, reason: 'debounce_throttle', throttleMs: CONTEXT_INJECT_DEBOUNCE_MS })
                return;
              }

              const parts: any[] = [];
              if (snap.imageData) {
                const base64Data = snap.imageData.replace(/^data:image\/\w+;base64,/, '');
                parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
              }
              parts.push({ text: `[${modality} context]: ${snap.analysis}` });

              if (typeof client.session.sendClientContent === 'function') {
                await client.session.sendClientContent({
                  turns: [{ role: 'user', parts }],
                  turnComplete: false,
                });
              } else {
                throw new Error('Live session cannot accept client content (no sendClientContent method)');
              }
              snap.lastInjected = now;
              console.info(`[${connectionId}] ✅ ${modality} context injected to Live API`);
              client.logger?.log('context_injected', { modality, hadImage: Boolean(snap.imageData), analysisSnippet: snap.analysis?.slice(0, 500) })
            } catch (err) {
              console.error(`[${connectionId}] Failed debounced inject for ${modality}:`, err);
              client.logger?.log('error', { where: 'debounced_inject', modality, message: err instanceof Error ? err.message : String(err) })
            } finally {
              timers[modalityKey] = undefined;
            }
          }, CONTEXT_INJECT_DEBOUNCE_MS);

          break;
        }
        case 'TURN_COMPLETE': {
          console.info(`[${connectionId}] Handling TURN_COMPLETE message`);
          const client = activeSessions.get(connectionId)
          if (!client) {
            console.warn(`[${connectionId}] TURN_COMPLETE received but no active session`)
            console.warn(`[${connectionId}] Active sessions: ${Array.from(activeSessions.keys()).join(', ')}`)
            break
          }
          // Don't send turnComplete to Live API - it's auto-detected when user stops speaking
          // Just acknowledge to client
          safeSend(ws, JSON.stringify({ type: 'turn_complete' }))
          client.logger?.log('turn_complete_received')
          break
        }
        case 'heartbeat_ack': {
          // Client acknowledged heartbeat - connection is healthy
          console.info(`[${connectionId}] Heartbeat acknowledged by client`)
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
    const rec = activeSessions.get(connectionId)
    try { rec?.logger?.log('session_closed', { source: 'websocket', code, reason: reason?.toString?.() }) } catch {}
    try { rec?.logger?.close() } catch {}
    handleClose(connectionId)
  });

  ws.on('error', (err) => {
    console.error(`[${connectionId}] WebSocket error:`, err)
    try { activeSessions.get(connectionId)?.logger?.log('error', { where: 'websocket', message: err instanceof Error ? err.message : String(err) }) } catch {}
    handleClose(connectionId)
  });
});

console.info('Server setup complete.');
