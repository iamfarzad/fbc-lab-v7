import { WebSocketServer, WebSocket } from 'ws'
import type { RawData } from 'ws'
import { GoogleGenAI, LiveServerMessage, Modality, Session } from '@google/genai'
import { v4 as uuidv4 } from 'uuid'
import { Buffer } from 'buffer'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

    dotenv.config();

    // --- Interfaces and Constants ---
    interface SessionBudget {
    connectionId: string;
    messageCount: number;
    totalTokensUsed: number;
    totalCost: number;
    startTime: Date;
    lastMessageTime: Date;
    dailyTokenLimit: number;
    perRequestTokenLimit: number;
    isBlocked: boolean;
    }

    const COST_PER_1K_INPUT_TOKENS = 0.075 / 1000;
    const COST_PER_1K_OUTPUT_TOKENS = 0.30 / 1000;
    const DEFAULT_DAILY_TOKEN_LIMIT = 10000;
    const DEFAULT_PER_REQUEST_LIMIT = 500;
    const MAX_MESSAGES_PER_SESSION = 50;
    // Use PORT for Fly.io compatibility, fallback to 3001 for local development
    const PORT = process.env.PORT || process.env.LIVE_SERVER_PORT || 3001;
const IS_MOCK = (process.env.FBC_USE_MOCKS === '1' || process.env.LIVE_MOCK === '1');

    // --- Voice & Language Utilities ---
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
// Attach the WebSocket server directly to the HTTP/HTTPS server to avoid manual upgrade edge cases
// (manual handleUpgrade can lead to premature closes if not fully detached)
let wss: WebSocketServer
    // SSL Certificate paths - only use in development
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
        res.writeHead(404).end()
      }
    })
  : http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
      } else {
        res.writeHead(404).end()
      }
    });

const server = healthServer.listen(Number(PORT), '0.0.0.0', () => {
const protocol = useTls ? 'HTTPS/WSS' : 'HTTP/WS';
    console.info(`🚀 WebSocket server listening on port ${PORT}`);
    console.info(`🔐 Using ${protocol} protocol`);
    });

// Initialize WebSocket server bound to the HTTP(S) server
wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
  maxPayload: 10 * 1024 * 1024,
})

    // --- Stability: ping clients to keep connections alive ---
    const pingInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
        if (ws.readyState === ws.OPEN) {
          try { ws.ping(); } catch {}
        }
      })
    }, 25_000)
    server.on('close', () => clearInterval(pingInterval))

// Global process error handlers to prevent hard crashes that manifest as 1005/1006 client closes
const nodeProcess = (globalThis as any).process as NodeJS.Process | undefined
nodeProcess?.on('uncaughtException', (err: unknown) => {
  console.error('UNCAUGHT_EXCEPTION:', err)
})
nodeProcess?.on('unhandledRejection', (reason: unknown) => {
  console.error('UNHANDLED_REJECTION:', reason)
})

// --- In-Memory Stores ---
    const activeSessions = new Map<string, { ws: WebSocket; session: Session }>();
    // Throttle duplicate start requests per connection
    const lastStartAt = new Map<string, number>();
    // Track last time we received audio from the client per connection
    const lastClientAudioAt = new Map<string, number>();
    // Per-connection timer to ensure some audio reaches Gemini shortly after start
    const firstAudioTimers = new Map<string, NodeJS.Timeout>();
    // Prevent concurrent session starts for the same connection
    const sessionStarting = new Set<string>()
    const sessionBudgets = new Map<string, SessionBudget>();
    // Store Node Buffers for simpler concat usage (legacy batching)
    const bufferedAudioChunks = new Map<string, Buffer[]>();
    // Queue audio chunks when session is not yet ready (streaming mode)
    const pendingAudioChunks = new Map<string, { data: string; mimeType: string }[]>();
    // Queue TURN_COMPLETE when it arrives before Gemini session is ready
    const pendingTurnComplete = new Map<string, boolean>();
    // Prevent duplicate upstream turnComplete while one is in-flight
    const turnInflight = new Map<string, boolean>();

    // --- Core Logic ---

    // Backpressure-aware send helper
    function safeSend(ws: WebSocket, data: any, isBinary = false) {
      if (ws.readyState !== ws.OPEN) return
      if (ws.bufferedAmount > 1_000_000) return
      try {
        ws.send(data, { binary: isBinary })
      } catch (e) {
        console.error('safeSend error:', e)
      }
    }

    function initializeSessionBudget(connectionId: string): SessionBudget {
    const budget: SessionBudget = {
        connectionId, messageCount: 0, totalTokensUsed: 0, totalCost: 0,
        startTime: new Date(), lastMessageTime: new Date(),
        dailyTokenLimit: DEFAULT_DAILY_TOKEN_LIMIT,
        perRequestTokenLimit: DEFAULT_PER_REQUEST_LIMIT, isBlocked: false,
    };
    sessionBudgets.set(connectionId, budget);
    return budget;
    }

    function updateSessionBudget(connectionId: string, inputTokens: number, outputTokens: number) {
        const budget = sessionBudgets.get(connectionId);
        if (!budget) return;
        const totalTokens = inputTokens + outputTokens;
        const cost = (inputTokens * COST_PER_1K_INPUT_TOKENS) + (outputTokens * COST_PER_1K_OUTPUT_TOKENS);
        budget.messageCount++;
        budget.totalTokensUsed += totalTokens;
        budget.totalCost += cost;
        budget.lastMessageTime = new Date();
        console.info(`[${connectionId}] Budget update: ${budget.messageCount} messages, ${budget.totalTokensUsed} tokens, $${budget.totalCost.toFixed(6)} cost`);
    }

    function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
    }

    async function handleStart(connectionId: string, ws: WebSocket, payload: any) {
  // Simple idempotency window to avoid rapid restarts
  const now = Date.now()
  const prev = lastStartAt.get(connectionId) || 0
  if (now - prev < 1000) {
    console.info(`[${connectionId}] start() ignored due to 1s cooldown window`)
    return
  }
  lastStartAt.set(connectionId, now)

  if (activeSessions.has(connectionId)) {
    console.info(`[${connectionId}] Session already exists. Closing old one.`);
    try { activeSessions.get(connectionId)?.session?.close?.(); } catch {}
  }

  // Deduplicate concurrent starts
  if (sessionStarting.has(connectionId)) {
    console.info(`[${connectionId}] start() already in progress; skipping duplicate call.`)
    return
  }
  sessionStarting.add(connectionId)

  if (IS_MOCK) {
    // Mock session: immediately report started without touching Gemini
    safeSend(ws, JSON.stringify({ type: 'session_started', payload: { connectionId, languageCode: payload?.languageCode || 'en-US', voiceName: payload?.voiceName || 'Puck', mock: true } }));
    activeSessions.set(connectionId, { ws, session: {} as any });
    sessionStarting.delete(connectionId)
    return
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error(`[${connectionId}] FATAL: GEMINI_API_KEY not configured.`);
    ws.send(JSON.stringify({ type: 'error', payload: { message: 'GEMINI_API_KEY not configured on server.' } }));
    return;
  }

  try {
    const requestedLang = isBcp47(payload?.languageCode) ? payload.languageCode : undefined
    const lang = requestedLang || 'en-US'
    const requestedVoice = typeof payload?.voiceName === 'string' ? payload.voiceName : undefined
    const voiceName = requestedVoice || VOICE_BY_LANG[lang] || 'Puck'

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const liveModel = process.env.GEMINI_LIVE_MODEL || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash-preview-native-audio-dialog'
    const session = await ai.live.connect({
      model: liveModel,
      config: {
        responseModalities: [Modality.AUDIO, Modality.TEXT],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          languageCode: lang,
        },
        inputAudioTranscription: { },
        // Set fields directly to avoid deprecation path
        maxOutputTokens: DEFAULT_PER_REQUEST_LIMIT,
        // Note: audioConfig is not part of LiveConnectConfig types; input/output rates are inferred from payloads
        systemInstruction: {
          parts: [{
            text: `You are Puck, the F.B/c voice agent. Persona: witty, kind, high-energy consultant who keeps things fun without being cringe.

Guidelines:
- Always reply with both text and audio.
- Acknowledge what the user said in the first sentence.
- Keep it concise, crisp, and helpful. Prefer bullets for options or plans.
- When relevant, mention F.B/c context:
  - About F.B/c: a small, senior team helping teams ship AI that actually moves the business.
  - Services: discovery workshops, ROI/feasibility, rapid prototyping, production integration, team enablement.
  - Workshop: 1–2 day intensive to map high-ROI automations, align on KPIs, and leave with a plan + prototype scope.
  - Abilities: research, draft plans, estimate ROI, outline architectures, create prompts, docs, and next steps.
- If user asks “about, FBC, services, workshop, abilities” answer directly with specifics.
- Activity markers: when describing a step, embed tokens like [ACTIVITY_IN:User explains goals] and [ACTIVITY_OUT:Draft plan ready]. The UI renders these as chips.
- Tone knobs: playful but professional; use a single emoji sparingly when the user seems casual.
`
          }]
        },
      },
      callbacks: {
        onopen: () => {
          console.info(`[${connectionId}] Gemini session opened.`);
          ws.send(JSON.stringify({ type: 'session_started', payload: { connectionId, languageCode: lang, voiceName } }));
          // Guard: if no client audio arrives quickly, nudge the session with a brief silence to keep it open
          try { clearTimeout(firstAudioTimers.get(connectionId) as any) } catch {}
          const timer = setTimeout(async () => {
            try {
              const lastAt = lastClientAudioAt.get(connectionId) || 0
              // Only send a silence frame if truly nothing arrived since open
              if (Date.now() - lastAt > 300) {
                const silencePcm16 = Buffer.alloc(1600 * 2) // 100ms @16k mono PCM16
                const b64 = (Buffer as any).from(silencePcm16).toString('base64')
                await (session as any).sendRealtimeInput({
                  audio: { data: b64, mimeType: 'audio/pcm;rate=16000' },
                })
                console.info(`[${connectionId}] 🫧 Injected 100ms silence to keep Gemini session warm`)
              }
            } catch (e) {
              console.warn(`[${connectionId}] Silence keepalive failed:`, e)
            }
          }, 350)
          firstAudioTimers.set(connectionId, timer)
        },
        onmessage: (message: LiveServerMessage) => {
          try { handleGeminiMessage(connectionId, ws, message); }
          catch (e: any) {
            console.error(`[${connectionId}] handleGeminiMessage error`, e?.message || e)
          }
        },
        onerror: (e: any) => {
          // Provide richer diagnostics and forward to client for UI display
          const detail = {
            message: e?.message || 'unknown',
            code: e?.code,
            name: e?.name,
          }
          console.error(`[${connectionId}] Gemini session error:`, detail)
          safeSend(ws as any, JSON.stringify({ type: 'error', payload: { message: `Gemini Error: ${detail.message}`, detail } }));
        },
        onclose: () => {
          console.info(`[${connectionId}] Gemini session closed.`);
          // Do not tear down browser WS; just clear active session so next turn can start lazily
          activeSessions.delete(connectionId)
          try { clearTimeout(firstAudioTimers.get(connectionId) as any) } catch {}
          firstAudioTimers.delete(connectionId)
          // Inform client so it can pause sending audio until re-start
          safeSend(ws as any, JSON.stringify({ type: 'session_closed', payload: { reason: 'gemini_closed' } }))
        },
      },
    });

    activeSessions.set(connectionId, { ws, session });
    console.info(`[${connectionId}] Active session stored.`);
    // Flush any queued audio chunks first
    const queued = pendingAudioChunks.get(connectionId) || []
    if (queued.length > 0) {
      console.info(`[${connectionId}] 🚚 Flushing ${queued.length} queued audio chunks to Gemini`)
      for (const chunk of queued) {
        try {
          await (session as any).sendRealtimeInput({
            audio: { data: chunk.data, mimeType: chunk.mimeType },
          })
          // Mark that audio reached Gemini successfully
          lastClientAudioAt.set(connectionId, Date.now())
        } catch (e) {
          console.error(`[${connectionId}] ❌ Failed to send queued chunk:`, e)
        }
      }
      pendingAudioChunks.delete(connectionId)
    }
    if (pendingTurnComplete.get(connectionId)) {
      console.info(`[${connectionId}] 🔁 Processing queued TURN_COMPLETE after session start.`)
      pendingTurnComplete.delete(connectionId)
      try {
        await (session as any).sendRealtimeInput({ turnComplete: true })
        console.info(`[${connectionId}] ✅ Sent TURN_COMPLETE to Gemini`)
      } catch (e) {
        console.error(`[${connectionId}] ❌ Failed to send TURN_COMPLETE:`, e)
      }
    }

  } catch (error) {
    console.error(`[${connectionId}] Failed to start Gemini session:`, error);
    ws.send(JSON.stringify({ type: 'error', payload: { message: error instanceof Error ? error.message : 'Failed to start session' } }));
  } finally {
    sessionStarting.delete(connectionId)
  }
}

    function handleGeminiMessage(connectionId: string, ws: WebSocket, message: LiveServerMessage) {
        console.info(`[${connectionId}] 🎯 Received message from Gemini:`, JSON.stringify(message, null, 2));
  // --- transcripts extraction (partial/final + model text) ---
  const inputPartials: string[] = []
  const inputFinals: string[] = []
  const modelTexts: string[] = []

  // tolerate schema variations across SDK versions
  const cands: any[] = [
    message,
    (message as any)?.inputTranscription,
    (message as any)?.serverContent,
    (message as any)?.clientContent,
  ].filter(Boolean)

  for (const c of cands) {
    // partials
    if (typeof c?.partial === 'string') inputPartials.push(c.partial)
    if (Array.isArray(c?.partials)) {
      for (const p of c.partials) if (typeof p?.text === 'string') inputPartials.push(p.text)
    }
    // finals
    if (typeof c?.final === 'string') inputFinals.push(c.final)
    if (Array.isArray(c?.finals)) {
      for (const f of c.finals) if (typeof f?.text === 'string') inputFinals.push(f.text)
    }
    // model text
    if (typeof c?.text === 'string') modelTexts.push(c.text)
    if (Array.isArray(c?.texts)) {
      for (const t of c.texts) if (typeof t === 'string') modelTexts.push(t)
    }
  }

  // emit transcripts to client
  for (const s of inputPartials) {
    safeSend(ws, JSON.stringify({ type: 'input_transcript', payload: { text: s, final: false } }))
  }
  for (const s of inputFinals) {
    safeSend(ws, JSON.stringify({ type: 'input_transcript', payload: { text: s, final: true } }))
  }

        if (message.serverContent?.modelTurn?.parts) {
            console.info(`[${connectionId}] 📝 Processing ${message.serverContent.modelTurn.parts.length} parts from Gemini`);
            for (const part of message.serverContent.modelTurn.parts) {
                if (part.text) {
                    console.info(`[${connectionId}] 💬 Sending text response: ${part.text.substring(0, 100)}...`);
                    const outputTokens = estimateTokens(part.text);
                    updateSessionBudget(connectionId, 0, outputTokens);
        // Back-compat + new event name
        safeSend(ws, JSON.stringify({ type: 'text', payload: { content: part.text } }));
        safeSend(ws, JSON.stringify({ type: 'model_text', payload: { text: part.text } }));
        modelTexts.push(part.text)
                }
                if (part.inlineData?.data) {
                    console.info(`[${connectionId}] 🔊 Sending audio response: ${part.inlineData.data.length} bytes`);
                    const audioTokens = Math.ceil(part.inlineData.data.length / 1000);
                    updateSessionBudget(connectionId, 0, audioTokens);
        safeSend(ws, JSON.stringify({ 
                      type: 'audio', 
                      payload: { 
                        audioData: part.inlineData.data,
                        // Live API outputs 24kHz
                        mimeType: 'audio/pcm;rate=24000'
                      } 
        }));
                }
            }
        }
  // also emit any collected model texts that didn’t come via parts.text
  for (const t of modelTexts) {
    safeSend(ws, JSON.stringify({ type: 'model_text', payload: { text: t } }))
  }
        if (message.serverContent?.turnComplete) {
            console.info(`[${connectionId}] ✅ Turn complete - conversation ready for next input`);
    safeSend(ws, JSON.stringify({ type: 'turn_complete' }));
        }
    }

    async function handleUserMessage(connectionId: string, ws: WebSocket, payload: any) {
        if (IS_MOCK) {
            // Produce a tiny PCM16 100ms silence (16kHz) and a mock text for each audio chunk
            if (payload?.audioData) {
                const mockText = 'Mock: I heard you. This is a placeholder response.'
                safeSend(ws, JSON.stringify({ type: 'text', payload: { content: mockText } }))
                safeSend(ws, JSON.stringify({ type: 'model_text', payload: { text: mockText } }))
                try {
                    const silencePcm16 = Buffer.alloc(1600 * 2) // 100ms @16k mono
                    const b64 = (Buffer as any).from(silencePcm16).toString('base64')
                    safeSend(ws, JSON.stringify({ type: 'audio', payload: { audioData: b64, mimeType: 'audio/pcm;rate=16000' } }))
                } catch {}
            }
            return
        }
        if (payload.audioData && payload.mimeType) {
            // Accept common PCM rates used in the app; forward as-is to Gemini
            const allowed = payload.mimeType === 'audio/pcm;rate=16000' || payload.mimeType === 'audio/pcm;rate=24000'
            if (!allowed) {
                console.warn(`[${connectionId}] ⚠️  Rejected audio chunk due to unexpected mimeType: ${payload.mimeType}`)
                return
            }
            if (typeof payload.audioData !== 'string' || payload.audioData.length === 0) {
                console.warn(`[${connectionId}] ⚠️  Rejected audio chunk due to missing/invalid audioData`)
                return
            }
            let client = activeSessions.get(connectionId)
            const audioDataBuffer = Buffer.from(payload.audioData, 'base64');
            console.info(`[${connectionId}] Buffered audio chunk (${audioDataBuffer.length} bytes).`);
            lastClientAudioAt.set(connectionId, Date.now())
            // Never auto-start on raw chunk; require explicit client 'start' to avoid restart loops
            if (!client) {
              const q = pendingAudioChunks.get(connectionId) || []
              q.push({ data: payload.audioData, mimeType: payload.mimeType })
              pendingAudioChunks.set(connectionId, q)
              console.info(`[${connectionId}] ⏸️ Queued audio (no active session). Waiting for explicit start.`)
              return
            }
            try {
                await (client.session as any).sendRealtimeInput({
                  audio: { data: payload.audioData, mimeType: payload.mimeType },
                })
              lastClientAudioAt.set(connectionId, Date.now())
            } catch (e) {
                console.error(`[${connectionId}] ❌ Failed to forward audio chunk to Gemini:`, e)
                // Fallback: buffer for batch send (legacy)
                const sessionAudioBuffers = bufferedAudioChunks.get(connectionId) || []
                sessionAudioBuffers.push(audioDataBuffer)
                bufferedAudioChunks.set(connectionId, sessionAudioBuffers)
            }
            return;
        }
        // Handle text messages if needed in the future
    }

    async function sendBufferedAudioToGemini(connectionId: string) {
        const client = activeSessions.get(connectionId);
        const audioBuffers = bufferedAudioChunks.get(connectionId);
        if (!audioBuffers || audioBuffers.length === 0) {
            console.info(`[${connectionId}] No buffered audio to send.`);
            return;
        }
        if (!client) {
            console.info(`[${connectionId}] TURN_COMPLETE received but Gemini session not ready yet. Will send after session starts.`);
            pendingTurnComplete.set(connectionId, true);
            return;
        }
        const mergedAudio: Buffer = Buffer.concat(audioBuffers as Buffer[]);
        bufferedAudioChunks.delete(connectionId);
        const estimatedTokens = Math.ceil(mergedAudio.length / 1000);
        updateSessionBudget(connectionId, estimatedTokens, 0);

        console.info(`[${connectionId}] Sending FULL buffered audio to Gemini (${mergedAudio.length} bytes).`);
        const mergedBase64 = (Buffer as any).from(mergedAudio).toString('base64')
        console.info(`[${connectionId}] 🔍 Audio format: PCM, Base64 length: ${mergedBase64.length}`);
        
        try {
            const audioContent = {
                turns: [{
                    role: 'user',
                    parts: [{
                        inlineData: {
                            // Match client sample rate explicitly
                            mimeType: 'audio/pcm;rate=16000',
                            data: mergedBase64,
                        },
                    }],
                }],
                turnComplete: true,
            };
            
            console.info(`[${connectionId}] 📤 Sending content structure:`, JSON.stringify(audioContent, null, 2));
            await client.session.sendClientContent(audioContent);
            console.info(`[${connectionId}] ✅ Audio successfully sent to Gemini, waiting for response...`);
        } catch (error) {
            console.error(`[${connectionId}] ❌ Failed to send audio to Gemini:`, error);
            console.error(`[${connectionId}] ❌ Error details:`, JSON.stringify(error, null, 2));
        }
    }

    function handleClose(connectionId: string) {
        const client = activeSessions.get(connectionId);
        if (client) {
            try { client.session.close(); } catch {}
            // Do NOT force-close the browser WebSocket; keep it open to allow restart
            // if (client.ws.readyState === WebSocket.OPEN) client.ws.close();
            activeSessions.delete(connectionId);
        }
        sessionBudgets.delete(connectionId);
        bufferedAudioChunks.delete(connectionId);
        pendingTurnComplete.delete(connectionId);
        console.info(`[${connectionId}] Session removed.`);
    }

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
        const connectionId = uuidv4();
        // Set TCP no-delay to reduce latency for small frames
        try { (req.socket as any)?.setNoDelay?.(true) } catch {}
        // Ensure binary frames are treated as ArrayBuffer
        try { (ws as any).binaryType = 'arraybuffer' } catch {}
        initializeSessionBudget(connectionId);
        console.info(`[${connectionId}] Client connected. Budget initialized.`);

  // Immediately acknowledge connection so client can distinguish WS liveness from Gemini readiness
  safeSend(ws, JSON.stringify({ type: 'connected', payload: { connectionId } }))

        ws.on('message', async (message: RawData) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
                switch (parsedMessage.type) {
                    case 'start':
                        await handleStart(connectionId, ws, parsedMessage.payload);
                        break;
                    case 'user_audio':
                        await handleUserMessage(connectionId, ws, parsedMessage.payload);
                        break;
                    case 'TURN_COMPLETE': {
                        if (IS_MOCK) {
                            safeSend(ws, JSON.stringify({ type: 'turn_complete' }))
                            break
                        }
                        let client = activeSessions.get(connectionId)
                        if (!client) {
                          pendingTurnComplete.set(connectionId, true)
                          console.info(`[${connectionId}] 🕒 TURN_COMPLETE queued (session not ready). Waiting for explicit start.`)
                          break
                        }
                        if (turnInflight.get(connectionId)) {
                          console.info(`[${connectionId}] ⏳ TURN_COMPLETE ignored (already in-flight).`)
                          break
                        }
                        turnInflight.set(connectionId, true)
                        try {
                          await (client.session as any).sendRealtimeInput({ turnComplete: true })
                          console.info(`[${connectionId}] ✅ TURN_COMPLETE -> upstream`)
                        } catch (e) {
                          console.error(`[${connectionId}] ❌ TURN_COMPLETE upstream`, e)
                          // Fallback to legacy batch send
                          await sendBufferedAudioToGemini(connectionId)
                        } finally {
                          turnInflight.delete(connectionId)
                        }
                        break
                    }
                }
            } catch (error) {
                console.error(`[${connectionId}] Error:`, error);
            }
        });

  ws.on('close', (code: number, reason: Buffer) => {
    console.info(`[${connectionId}] Browser WS closed. Code: ${code}, Reason: ${reason?.toString?.() || 'N/A'}`)
          try { activeSessions.get(connectionId)?.session?.close?.() } catch {}
          handleClose(connectionId)
        });
        ws.on('error', (err) => {
    console.error(`[${connectionId}] Browser WS error:`, err)
          handleClose(connectionId)
        });
    });

    console.info('Server setup complete.');
