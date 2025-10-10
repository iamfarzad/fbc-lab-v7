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
import { fileURLToPath } from 'url'


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Use PORT for Fly.io compatibility, fallback to 3001 for local development
const PORT = process.env.PORT || process.env.LIVE_SERVER_PORT || 3001;
console.log(`🔧 Environment check: PORT=${process.env.PORT}, LIVE_SERVER_PORT=${process.env.LIVE_SERVER_PORT}, Using: ${PORT}`);
const IS_MOCK = (process.env.FBC_USE_MOCKS === '1' || process.env.LIVE_MOCK === '1');

// Voice & Language Utilities - Multilingual Support
const VOICE_BY_LANG: Record<string, string> = {
  'en-US': 'Fenrir',
  'en-GB': 'Fenrir',
  'nb-NO': 'Fenrir',  // Norwegian - Testing Fenrir for Nordic languages
  'nn-NO': 'Fenrir',  // Norwegian Nynorsk
  'sv-SE': 'Fenrir',  // Swedish
  'de-DE': 'Fenrir',
  'es-ES': 'Fenrir',
  'fr-FR': 'Fenrir',
  'it-IT': 'Fenrir',
};

// Main Chat Personality from unified API route
const CHAT_PERSONALITY = `You are F.B/c - Farzad Bayat's AI consulting copilot.

PRONUNCIATION GUIDE (for voice responses):
- Farzad: Pronounce as "far-ZAAD" (emphasis on second syllable)
  - "far" rhymes with "car"  
  - "ZAAD" like "zod" in "zodiac" but with longer "ah" sound
  - NOT "FAR-zad" (short a)
- When speaking his name, use this pronunciation for natural flow

VOICE & TONE:
- Sound like a sharp, friendly consultant (Farzad's "no fluff" style).
- Use plain English (or Norwegian if user speaks Norwegian), two sentences max per turn.
- End with an open question when you still need context.
- Keep responses natural and conversational for voice interaction.

MISSION FOCUS:
Use the conversation to uncover:
1. Business goals
2. Painful workflows
3. Data reality
4. Team readiness
5. Budget & timeline
6. Success metrics

CONVERSATION STRATEGY:
- Mirror the user's language and build on the latest turn.
- Ask exactly one focused question at a time.
- Keep answers tight for voice - expand only when asked.
- Voice transcripts should be handled exactly like text messages.
- Suggest multimodal actions when helpful ("Want to show me your screen?" etc.).

FORMATTING FOR VOICE:
- No headings, numbered lists, or structured reports unless explicitly asked.
- Speak naturally - avoid robotic or formal language.
- Reference information inline conversationally.

If the user asks for legal, medical, HR, or financial advice, politely decline and recommend a licensed professional.`;

const FUNCTION_DECLARATIONS: any[] = [
  {
    name: 'search_web',
    description: 'Search the web for current information and return grounded, cited findings.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to submit to the web search tool.' },
        urls: {
          type: 'array',
          description: 'Optional URLs to prioritize for context.',
          items: { type: 'string' }
        }
      },
      required: ['query']
    }
  },
  {
    name: 'capture_screen_snapshot',
    description: 'Retrieve the latest analyzed screen-share context for this session to describe what is on the user\'s screen.',
    parameters: {
      type: 'object',
      properties: {
        summaryOnly: {
          type: 'boolean',
          description: 'When true, omit raw image data and return only textual context.'
        }
      }
    }
  },
  {
    name: 'capture_webcam_snapshot',
    description: 'Retrieve the latest analyzed webcam context for this session to understand the user\'s environment.',
    parameters: {
      type: 'object',
      properties: {
        summaryOnly: {
          type: 'boolean',
          description: 'When true, omit raw image data and return only textual context.'
        }
      }
    }
  }
];

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

type ToolFunctionCall = {
  id?: string;
  name?: string;
  args?: unknown;
};

type ToolResponse = {
  id: string;
  name: string;
  response: { json: any };
};

type Snapshot = {
  analysis: string;
  capturedAt: number;
  imageData?: string;
};

type ActiveSessionRecord = {
  ws: WebSocket;
  session: any;
  clientSessionId?: string;
  languageCode?: string;
  voiceName?: string;
  latestContext: {
    screen?: Snapshot;
    webcam?: Snapshot;
  };
};

const CONTEXT_MAX_AGE_MS = 60_000;
const RUN_SERVER_TOOL_EXECUTION = process.env.LIVE_SERVER_DISABLE_TOOLS === '1' ? false : true;
const DEFAULT_SEARCH_MODEL = process.env.GEMINI_GROUNDING_MODEL || 'gemini-2.5-flash';

let searchGenAI: GoogleGenAI | null = null;

// Store active Live API sessions
const activeSessions = new Map<string, ActiveSessionRecord>();
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

type Citation = { uri: string; title?: string; description?: string; source?: 'url' | 'search' }

function ensureSearchClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured on server.')
  }
  if (!searchGenAI) {
    searchGenAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  }
  return searchGenAI
}

function extractCitations(candidate: unknown): Citation[] {
  const citations: Citation[] = []
  try {
    const asRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
    if (!asRecord(candidate)) return citations

    const groundingMetadata = asRecord(candidate.groundingMetadata)
      ? (candidate.groundingMetadata as Record<string, unknown>)
      : undefined

    const chunks = Array.isArray(groundingMetadata?.groundingChunks)
      ? groundingMetadata?.groundingChunks
      : []

    for (const chunk of chunks) {
      if (asRecord(chunk) && asRecord(chunk.web)) {
        const web = chunk.web as Record<string, unknown>
        const uri = typeof web.uri === 'string' ? web.uri : typeof web.url === 'string' ? web.url : ''
        if (!uri) continue
        citations.push({
          uri,
          title: typeof web.title === 'string' ? web.title : 'Search Result',
          description: typeof web.snippet === 'string'
            ? web.snippet
            : typeof web.description === 'string'
              ? web.description
              : '',
          source: 'search'
        })
      }
    }

    const urlContextMetadata = asRecord(candidate.urlContextMetadata)
      ? (candidate.urlContextMetadata as Record<string, unknown>)
      : undefined

    const urlMetadata = Array.isArray(urlContextMetadata?.urlMetadata)
      ? urlContextMetadata.urlMetadata
      : []

    for (const meta of urlMetadata) {
      if (!asRecord(meta)) continue
      const uri = typeof meta.retrievedUrl === 'string'
        ? meta.retrievedUrl
        : typeof meta.url === 'string'
          ? meta.url
          : typeof meta.uri === 'string'
            ? meta.uri
            : ''
      if (!uri) continue
      citations.push({
        uri,
        title: typeof meta.title === 'string' ? meta.title : 'URL Context',
        description: typeof meta.snippet === 'string'
          ? meta.snippet
          : typeof meta.description === 'string'
            ? meta.description
            : '',
        source: 'url'
      })
    }
  } catch (error) {
    console.warn('Citation extraction failed:', error)
  }
  return citations
}

async function runServerGroundedSearch(query: string, urls?: string[]): Promise<{ summary: string; citations: Citation[]; urlsUsed: string[] }> {
  const client = ensureSearchClient()
  const useUrls = Array.isArray(urls) && urls.length > 0
  const trimmedUrls = useUrls ? urls!.filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 20) : undefined

  const tools: any[] = [{ googleSearch: {} }]
  if (trimmedUrls?.length) {
    tools.unshift({ urlContext: {} })
  }

  const prompt = trimmedUrls?.length
    ? `${query}\n\nRelevant URLs for context:\n${trimmedUrls.join('\n')}`
    : query

  try {
    const response = await client.models.generateContent({
      model: DEFAULT_SEARCH_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { tools }
    } as any)

    let summary = ''
    try {
      if (typeof (response as any).text === 'function') {
        summary = (response as any).text()
      } else if (typeof (response as any).text === 'string') {
        summary = (response as any).text
      } else if ((response as any).candidates?.[0]?.content?.parts) {
        summary = (response as any).candidates[0].content.parts
          .map((part: any) => (typeof part?.text === 'string' ? part.text : ''))
          .filter(Boolean)
          .join('\n')
      }
    } catch {
      summary = ''
    }

    if (!summary) {
      summary = `I wasn't able to find detailed information about "${query}". Could you rephrase or provide more context?`
    }

    const candidate = (response as any).candidates?.[0] ?? {}
    const citations = extractCitations(candidate)
    const urlsUsed = citations
      .map(citation => citation.uri)
      .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0)

    return { summary, citations, urlsUsed }
  } catch (error) {
    console.error('❌ [Server Grounding] Search failed:', error)
    return {
      summary: `I couldn't reach the search service for "${query}". Please try again in a moment.`,
      citations: [],
      urlsUsed: []
    }
  }
}

function parseFunctionArgs(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>
  }
  return {}
}

function getSnapshot(record: ActiveSessionRecord | undefined, modality: 'screen' | 'webcam'): Snapshot | undefined {
  if (!record) return undefined
  const snapshot = modality === 'screen' ? record.latestContext.screen : record.latestContext.webcam
  if (!snapshot) return undefined
  if (!snapshot.analysis || typeof snapshot.capturedAt !== 'number') return undefined
  if (Date.now() - snapshot.capturedAt > CONTEXT_MAX_AGE_MS) return undefined
  return snapshot
}

async function executeServerToolCall(connectionId: string, toolCall: any): Promise<void> {
  const sessionRecord = activeSessions.get(connectionId)
  if (!sessionRecord) {
    console.warn(`[${connectionId}] Tool call received but no active session found.`)
    return
  }

  const functionCalls: ToolFunctionCall[] = Array.isArray(toolCall?.functionCalls) ? toolCall.functionCalls : []
  if (functionCalls.length === 0) {
    return
  }

  const responses: ToolResponse[] = []

  for (const call of functionCalls) {
    const name = typeof call?.name === 'string' ? call.name : 'unknown_tool'
    const id = typeof call?.id === 'string' ? call.id : uuidv4()
    const args = parseFunctionArgs(call?.args)

    try {
      if (name === 'search_web') {
        const query = typeof args.query === 'string' ? args.query.trim() : ''
        if (!query) {
          throw new Error('Missing query for web search.')
        }
        const urls = Array.isArray(args.urls)
          ? args.urls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
          : undefined
        const result = await runServerGroundedSearch(query, urls)
        responses.push({
          id,
          name,
          response: { json: { success: true, result } }
        })
      } else if (name === 'capture_screen_snapshot') {
        const snapshot = getSnapshot(sessionRecord, 'screen')
        if (!snapshot) {
          throw new Error('No recent screen share captured yet.')
        }
        const summaryOnly = Boolean(args.summaryOnly)
        responses.push({
          id,
          name,
          response: {
            json: {
              success: true,
              result: {
                analysis: snapshot.analysis,
                capturedAt: snapshot.capturedAt,
                imageAvailable: Boolean(snapshot.imageData),
                imageData: summaryOnly ? undefined : snapshot.imageData
              }
            }
          }
        })
      } else if (name === 'capture_webcam_snapshot') {
        const snapshot = getSnapshot(sessionRecord, 'webcam')
        if (!snapshot) {
          throw new Error('No recent webcam capture available yet.')
        }
        const summaryOnly = Boolean(args.summaryOnly)
        responses.push({
          id,
          name,
          response: {
            json: {
              success: true,
              result: {
                analysis: snapshot.analysis,
                capturedAt: snapshot.capturedAt,
                imageAvailable: Boolean(snapshot.imageData),
                imageData: summaryOnly ? undefined : snapshot.imageData
              }
            }
          }
        })
      } else {
        throw new Error(`Unsupported tool: ${name}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool execution failed.'
      responses.push({
        id,
        name,
        response: { json: { success: false, error: message } }
      })
    }
  }

  if (responses.length === 0) return

  if (IS_MOCK || typeof sessionRecord.session?.sendToolResponse !== 'function') {
    safeSend(sessionRecord.ws, JSON.stringify({
      type: 'tool_result',
      payload: { responses, source: 'server' }
    }))
    return
  }

  try {
    await sessionRecord.session.sendToolResponse({ functionResponses: responses })
  } catch (err) {
    console.error(`[${connectionId}] Failed to forward tool responses to Live API:`, err)
    safeSend(sessionRecord.ws, JSON.stringify({
      type: 'tool_result',
      payload: {
        error: err instanceof Error ? err.message : 'Tool response failed',
        source: 'server'
      }
    }))
    return
  }

  safeSend(sessionRecord.ws, JSON.stringify({
    type: 'tool_result',
    payload: { responses, source: 'server' }
  }))
}

async function handleStart(connectionId: string, ws: WebSocket, payload: any) {
  console.info(`[${connectionId}] 🔊 handleStart called with payload:`, JSON.stringify(payload));

  const clientSessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : undefined

  // Prevent concurrent starts
  if (sessionStarting.has(connectionId)) {
    console.info(`[${connectionId}] 🔊 start() already in progress; skipping duplicate call.`)
    return
  }
  sessionStarting.add(connectionId)

  // Close existing session if any
  if (activeSessions.has(connectionId)) {
    console.info(`[${connectionId}] Session already exists. Closing old one.`);
    try { activeSessions.get(connectionId)?.session?.close?.() } catch (error) {
      console.warn(`[${connectionId}] Failed to close previous session`, error)
    }
  }

  if (IS_MOCK) {
    // Mock session: immediately report started without touching Gemini
    const mockLang = isBcp47(payload?.languageCode) ? payload.languageCode : 'en-US';
    const mockVoice = typeof payload?.voiceName === 'string' ? payload.voiceName : VOICE_BY_LANG[mockLang] || 'Puck';
    safeSend(ws, JSON.stringify({ type: 'session_started', payload: { connectionId, languageCode: mockLang, voiceName: mockVoice, mock: true } }));
    activeSessions.set(connectionId, {
      ws,
      session: {} as any,
      clientSessionId,
      languageCode: mockLang,
      voiceName: mockVoice,
      latestContext: {},
    });
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
    const model = `models/${process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-live-001'}`

    console.info(`[${connectionId}] Connecting to Live API with model: ${model}`)

    let isOpen = false

    // Create config object with Main Chat Personality
    const liveConfig = {
      responseModalities: ['AUDIO'] as any,
      systemInstruction: CHAT_PERSONALITY,
      tools: [
        {
          functionDeclarations: FUNCTION_DECLARATIONS
        }
      ],
      // Enable transcription for both input and output
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName
          }
        }
      }
    }

    const session: any = await ai.live.connect({
      model,
      config: liveConfig,  // ← Pass config as separate parameter
      callbacks: {
        onopen: () => {
          isOpen = true
          console.info(`[${connectionId}] Live API session opened`)
        },
        onmessage: (message: any) => {
          try {
            console.log(`[${connectionId}] 🔊 Gemini Live API message:`, JSON.stringify(message, null, 2));
            const { serverContent } = message

            // Handle setup complete event
            if (message.setupComplete) {
              safeSend(ws, JSON.stringify({
                type: 'setup_complete',
                payload: { setupComplete: true }
              }))
              console.info(`[${connectionId}] Setup complete`)
            }

            // Handle tool calls (function calling)
            if (message.toolCall) {
              const sessionRecord = activeSessions.get(connectionId)
              const toolPayload = {
                ...message.toolCall,
                handledByServer: RUN_SERVER_TOOL_EXECUTION,
                handledBy: RUN_SERVER_TOOL_EXECUTION ? 'server' : 'client',
                sessionId: sessionRecord?.clientSessionId,
                connectionId
              }
              safeSend(ws, JSON.stringify({
                type: 'tool_call',
                payload: toolPayload
              }))
              console.info(
                `[${connectionId}] Tool call:`,
                message.toolCall.functionCalls?.map((fc: any) => fc.name).join(', ')
              )
              if (RUN_SERVER_TOOL_EXECUTION) {
                executeServerToolCall(connectionId, message.toolCall).catch((error) => {
                  console.error(`[${connectionId}] Failed to execute tool call:`, error)
                })
              }
            }

            if (message.toolCallCancellation) {
              safeSend(ws, JSON.stringify({
                type: 'tool_call_cancellation',
                payload: message.toolCallCancellation
              }))
            }

            if (!serverContent) return

            // Handle interrupted event (user interrupted AI)
            if (serverContent.interrupted) {
              safeSend(ws, JSON.stringify({
                type: 'interrupted',
                payload: { interrupted: true }
              }))
              console.info(`[${connectionId}] User interrupted AI`)
            }

            // Handle input transcription (user speech-to-text)
            if (serverContent.inputTranscription) {
              try {
                const text = serverContent.inputTranscription.text
                const isFinal = (serverContent.inputTranscription as any).isFinal ?? false
                
                safeSend(ws, JSON.stringify({
                  type: 'input_transcript',
                  payload: { text, isFinal }
                }))
                
                if (isFinal) {
                  console.info(`[${connectionId}] Input transcript: "${text}"`)
                }
              } catch (err) {
                console.error(`[${connectionId}] Input transcript handler failed:`, err)
              }
            }

            // Handle output transcription (AI speech-to-text / closed captions)
            if (serverContent.outputTranscription) {
              try {
                const text = serverContent.outputTranscription.text
                const isFinal = (serverContent.outputTranscription as any).isFinal ?? false
                
                safeSend(ws, JSON.stringify({
                  type: 'output_transcript',
                  payload: { text, isFinal }
                }))
              } catch (err) {
                console.error(`[${connectionId}] Output transcript handler failed:`, err)
              }
            }

            // Handle text + audio parts from Live server messages
            if (serverContent.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
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

            // Handle turn complete (AI finished speaking)
            if (serverContent.turnComplete) {
              safeSend(ws, JSON.stringify({
                type: 'turn_complete',
                payload: { turnComplete: true }
              }))
              console.info(`[${connectionId}] Turn complete`)
            }
          } catch (err) {
            console.error(`[${connectionId}] Message handler error (non-fatal):`, err)
            // Don't tear down connection on parse errors
          }
        },
        onerror: (error: any) => {
          console.error(`[${connectionId}] Live API error:`, error)
          safeSend(ws, JSON.stringify({ type: 'error', payload: { message: 'Live API error' } }))
        },
        onclose: (event: any) => {
          isOpen = false
          console.error(`[${connectionId}] Live API session closed unexpectedly!`, {
            code: event?.code,
            reason: event?.reason,
            wasClean: event?.wasClean,
            timestamp: new Date().toISOString()
          })
          activeSessions.delete(connectionId)
          safeSend(ws, JSON.stringify({ type: 'session_closed', payload: { reason: 'live_api_closed', code: event?.code } }))
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

    activeSessions.set(connectionId, {
      ws,
      session,
      clientSessionId,
      languageCode: lang,
      voiceName,
      latestContext: {},
    });
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
    const audioData = payload.audioData

    await client.session.sendRealtimeInput({
      media: {
        mimeType: payload.mimeType || 'audio/pcm;rate=16000',
        data: audioData
      }
    })
    console.info(`[${connectionId}] Audio sent to Live API (${audioData.length} chars base64)`)
  } catch (e) {
    console.error(`[${connectionId}] Failed to send audio to Live API:`, e)
    console.error(`[${connectionId}] Error details:`, e instanceof Error ? e.message : String(e))
    safeSend(ws, JSON.stringify({ type: 'error', payload: { message: 'Failed to send audio to Live API' } }))
  }
  return
}

// Handle text messages if needed in the future
}

function handleClose(connectionId: string) {
  const client = activeSessions.get(connectionId);
  if (client) {
    try { client.session.close() } catch (error) {
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

  ws.on('message', async (message: RawData) => {
    try {
      const rawString = decodeRawMessage(message)
      const parsedMessage = rawString ? JSON.parse(rawString) : { type: 'unknown' }
      const messageType = String(parsedMessage?.type || 'unknown');
      console.info(`[${connectionId}] Received message type: ${messageType}`);
      switch (parsedMessage.type) {
        case 'start':
          console.info(`[${connectionId}] Handling start message`);
          await handleStart(connectionId, ws, parsedMessage.payload);
          break;
        case 'user_audio':
          console.info(`[${connectionId}] Handling user_audio message`);
          await handleUserMessage(connectionId, ws, parsedMessage.payload);
          break;
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
          client.latestContext[modalityKey] = { analysis, capturedAt, imageData };

          if (!client.clientSessionId && typeof payload.sessionId === 'string') {
            client.clientSessionId = payload.sessionId;
          }

          // Send context to Gemini Live API as text message
          try {
            const contextMessage = `[Visual Context Update - ${modality}]: ${analysis}`;
            console.info(`[${connectionId}] Sending ${modality} context to Gemini Live API`);
            
            // Send as text input to provide context
            await client.session.send({
              clientContent: {
                turns: [{
                  role: 'user',
                  parts: [{ text: contextMessage }]
                }]
              }
            });
            
            console.info(`[${connectionId}] ${modality} context sent successfully`);
          } catch (err) {
            console.error(`[${connectionId}] Failed to send ${modality} context to Gemini:`, err);
          }

          break;
        }
        case 'TOOL_RESULT': {
          console.info(`[${connectionId}] Handling TOOL_RESULT message`);
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
            await client.session.sendToolResponse({ functionResponses: responses });
            safeSend(client.ws, JSON.stringify({ type: 'tool_result', payload: { responses } }));
          } catch (err) {
            console.error(`[${connectionId}] Failed to forward tool responses to Live API:`, err);
            safeSend(client.ws, JSON.stringify({ type: 'tool_result', payload: { error: err instanceof Error ? err.message : 'Tool response failed' } }));
          }
          break;
        }
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
    handleClose(connectionId)
  });

  ws.on('error', (err) => {
    console.error(`[${connectionId}] WebSocket error:`, err)
    handleClose(connectionId)
  });
});

console.info('Server setup complete.');
