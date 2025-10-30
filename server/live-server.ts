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
import { SessionLogger } from './session-logger'
import { GEMINI_MODELS, WEBSOCKET_CONFIG, VOICE_CONFIG, GEMINI_CONFIG, CONTEXT_CONFIG, ALLOWED_ORIGINS } from '../src/config/constants.js'
import { MESSAGE_TYPES } from './message-types.js'
import { LIVE_FUNCTION_DECLARATIONS } from '../src/config/live-tools.js'

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Load .env.local first (if exists), then fallback to .env
  dotenv.config({ path: path.join(__dirname, '.env.local') });
  dotenv.config({ path: path.join(__dirname, '.env') });

  // Use PORT for Fly.io compatibility, fallback to 3001 for local development
  const PORT = process.env.PORT || process.env.LIVE_SERVER_PORT || 3001;
  console.log(`🔧 Environment check: PORT=${process.env.PORT}, LIVE_SERVER_PORT=${process.env.LIVE_SERVER_PORT}, Using: ${PORT}`);

  // Voice & Language Utilities
  // Imported from constants.ts - VOICE_CONFIG.BY_LANG

  function isBcp47(s?: string) {
    return typeof s === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z]{2}|-[A-Za-z]{4})?(-[A-Za-z]{2}|-[0-9]{3})?$/.test(s)
  }

  // Turn completion timeout configuration
  const TURN_COMPLETION_TIMEOUT_MS = 3000; // 3 seconds of silence = turn complete

  // Logging configuration
  const DEBUG_MODE = process.env.WEBSOCKET_DEBUG === 'true'
  const AUDIO_LOG_INTERVAL = 50 // Log audio stats every N chunks to reduce spam

  // Helper function to send turn completion and clear timer
  function sendTurnComplete(connectionId: string, client: ActiveSessionRecord, reason: string) {
    console.info(`[${connectionId}] 🔄 Sending turn_complete (reason: ${reason})`);
    safeSend(client.ws, JSON.stringify({ type: MESSAGE_TYPES.TURN_COMPLETE, payload: { turnComplete: true } }));
    client.logger?.log('turn_complete_auto', { reason });
    
    // Clear the timer
    if (client.turnCompletionTimer) {
      clearTimeout(client.turnCompletionTimer);
      client.turnCompletionTimer = undefined;
    }
  }

  // Helper function to reset turn completion timer
  function resetTurnCompletionTimer(connectionId: string, client: ActiveSessionRecord) {
    // Clear existing timer
    if (client.turnCompletionTimer) {
      clearTimeout(client.turnCompletionTimer);
    }
    
    // Set new timer
    client.turnCompletionTimer = setTimeout(() => {
      sendTurnComplete(connectionId, client, 'timeout_silence');
    }, TURN_COMPLETION_TIMEOUT_MS);
    
    // Only log timer reset in debug mode (too verbose otherwise)
    if (DEBUG_MODE) {
      console.log(`[${connectionId}] ⏰ Turn completion timer reset (${TURN_COMPLETION_TIMEOUT_MS}ms timeout)`);
    }
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
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (!isProduction) {
        console.info(`🔌 Dev mode: Accepting connection from ${info.origin || 'unknown'}`);
        return true;
      }
      
      const origin = info.origin;
      const allowed = ALLOWED_ORIGINS.includes(origin);
      
      if (!allowed) {
        console.warn(`🚫 Rejected connection from unauthorized origin: ${origin}`);
      }
      
      return allowed;
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
          ws.send(JSON.stringify({ type: MESSAGE_TYPES.HEARTBEAT, timestamp: Date.now() }));
        } catch (error) {
          console.warn('Failed to send ping to client:', error);
        }
      }
    })
  }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL)
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
  // Imported from constants.ts - GEMINI_CONFIG.SYSTEM_PROMPT

  // const FUNCTION_DECLARATIONS = LIVE_FUNCTION_DECLARATIONS; // Removed for simplified config

  // Visual trigger + throttle configuration - imported from constants.ts
  const VISUAL_TRIGGER_WORDS = VOICE_CONFIG.VISUAL_TRIGGERS;
  const VISUAL_INJECT_THROTTLE_MS = VOICE_CONFIG.VISUAL_INJECT_THROTTLE_MS;
  const VISUAL_PERSIST_THROTTLE_MS = Math.max(VISUAL_INJECT_THROTTLE_MS, 3000);

  // Visual context snapshot & session record types
  type Snapshot = {
    analysis: string;
    capturedAt: number;
    imageData?: string;
    lastInjected?: number;
    lastPersisted?: number;
  };

type ActiveSessionRecord = {
  ws: WebSocket;
  session: any;
  sessionId?: string; // Client session ID for context management
  latestContext: {
    screen?: Snapshot;
    webcam?: Snapshot;
  };
  injectionTimers?: {
    screen?: ReturnType<typeof setTimeout>;
    webcam?: ReturnType<typeof setTimeout>;
  };
  logger?: SessionLogger;
  turnCompletionTimer?: ReturnType<typeof setTimeout>;
  lastAudioActivity?: number;
  audioChunkCount?: number; // Track audio chunks for periodic logging
  userTurnCount?: number; // NEW: track turns for milestone triggers
  lastTurnCompleteAt?: number; // Prevent double-counting turnComplete events
  lastAssistantText?: string; // Track last assistant response for context saving
};

  // Store active Live API sessions
  const activeSessions = new Map<string, ActiveSessionRecord>();
  const noSessionWarned = new Set<string>(); // Track connections we've already warned about
  // Feature flag + debounce controls for CONTEXT_UPDATE → Live injection - imported from constants.ts
  const INJECT_ON_CONTEXT_UPDATE = VOICE_CONFIG.INJECT_ON_CONTEXT_UPDATE;
  const CONTEXT_INJECT_DEBOUNCE_MS = VOICE_CONFIG.CONTEXT_INJECT_DEBOUNCE_MS;
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

  // Helper function to load conversation history
  async function loadConversationHistory(sessionId: string, connectionId: string): Promise<string> {
    if (!sessionId || sessionId === 'anonymous') return '';
    
    try {
      const { multimodalContextManager } = await import('../src/core/context/multimodal-context.js')
      // Load more messages (20 instead of 6) to give voice better context
      const recentConversation = await multimodalContextManager.getConversationHistory(sessionId, 20)

      if (recentConversation.length > 0) {
        const formatted = recentConversation
          .map((entry) => {
            const rawSpeaker = typeof entry.metadata?.speaker === 'string' ? entry.metadata.speaker : undefined
            const speaker = rawSpeaker === 'assistant' || rawSpeaker === 'model'
              ? 'assistant'
              : rawSpeaker === 'user'
                ? 'user'
                : entry.modality === 'text'
                  ? 'user'
                  : 'assistant'
            const trimmed = entry.content.trim().replace(/\s+/g, ' ')
            // Don't truncate - include full context for voice
            return `${speaker}: ${trimmed}`
          })
          .join('\n')

        return `\n\nRECENT CONVERSATION HISTORY (latest first shown last):\n${formatted}`
      }
    } catch (err) {
      console.warn(`[${connectionId}] Failed to load conversation history for voice session:`, err)
    }
    
    return '';
  }

  // Helper function to sync voice conversation to orchestrator
  async function syncVoiceToOrchestrator(
    sessionId: string,
    connectionId: string,
    client: ActiveSessionRecord
  ): Promise<void> {
    if (!sessionId || sessionId === 'anonymous') return

    try {
      // Load conversation history from multimodalContext
      const { multimodalContextManager } = await import('../src/core/context/multimodal-context.js')
      
      // Get conversation history (last 20 messages)
      const conversationHistory = await multimodalContextManager.getConversationHistory(sessionId, 20)
      
      // Build chat messages array from conversation history
      const messages = conversationHistory
        .filter((entry: any) => {
          const speaker = entry.metadata?.speaker || (entry.modality === 'text' ? 'user' : 'assistant')
          return speaker === 'user' || speaker === 'assistant' || speaker === 'model'
        })
        .map((entry: any) => {
          const speaker = entry.metadata?.speaker || (entry.modality === 'text' ? 'user' : 'assistant')
          return {
            role: (speaker === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
            content: entry.content || ''
          }
        })

      if (messages.length === 0) return

      // Get database context for email, flow, and intelligence
      const { ContextStorage } = await import('../src/core/context/context-storage.js')
      const storage = new ContextStorage()
      const dbContext = await storage.get(sessionId)

      // CRITICAL FIX: Load conversationFlow from database for stage determination
      const persistedFlow = dbContext?.conversation_flow || undefined

      // Build agent context
      const agentContext = {
        sessionId,
        conversationFlow: persistedFlow, // Use persisted flow from DB
        intelligenceContext: dbContext?.intelligence_context || undefined,
        voiceActive: true
      } as any

      console.log(`[${connectionId}] 📊 Voice sync - Loaded conversationFlow:`, {
        hasPersistedFlow: !!persistedFlow,
        coveredCount: persistedFlow && typeof persistedFlow === 'object' && 'covered' in persistedFlow && persistedFlow.covered ? Object.values(persistedFlow.covered).filter(Boolean).length : 0,
        recommendedNext: persistedFlow && typeof persistedFlow === 'object' && 'recommendedNext' in persistedFlow ? persistedFlow.recommendedNext : undefined
      })

      // Route through orchestrator
      const { routeToAgent } = await import('../src/core/agents/orchestrator.js')
      // Convert messages to proper Message[] format with id and timestamp
      const formattedMessages = messages.map((msg) => ({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        role: msg.role,
        content: msg.content
      }))
      
      const agentResult = await routeToAgent({
        messages: formattedMessages,
        context: agentContext,
        trigger: 'voice'
      })

      // Send stage update to client (non-blocking)
      if (agentResult.metadata?.stage) {
        safeSend(client.ws, JSON.stringify({
          type: MESSAGE_TYPES.STAGE_UPDATE,
          payload: {
            stage: agentResult.metadata.stage,
            agent: agentResult.agent,
            flow: agentResult.metadata.enhancedConversationFlow
          }
        }))
      }

      console.log(`[${connectionId}] ✅ Voice synced to orchestrator: ${agentResult.agent} (${agentResult.metadata?.stage})`)
    } catch (error) {
      console.error(`[${connectionId}] Voice orchestrator sync failed:`, error)
      // Non-fatal - don't interrupt voice session
    }
  }

  // Helper function to build Live API configuration
  async function buildLiveConfig(
    sessionId: string,
    priorContext: string, 
    voiceNameOverride?: string
  ): Promise<any> {
    console.log(`[buildLiveConfig] Building config for session: ${sessionId}`);
    
    // Base system prompt from constants
    let fullInstruction = GEMINI_CONFIG.SYSTEM_PROMPT;
    
    // ADD BRANDING CONSTRAINT (match chat)
    fullInstruction += `\n\nNever identify yourself as Gemini, Google's AI, or any other AI assistant. You are F.B/c AI, created specifically for Farzad Bayat Consulting.`;
    
    // ADD VOICE-SPECIFIC GUIDANCE
    fullInstruction += `\n\nVOICE MODE: Keep responses conversational and concise for voice playback. 2 sentences maximum per turn unless explicitly asked for details.`;
    
    // ADD PERSONALIZED CONTEXT (if sessionId available)
    if (sessionId && sessionId !== 'anonymous') {
      try {
        const { ContextStorage } = await import('../src/core/context/context-storage.js');
        const storage = new ContextStorage();
        const sessionContext = await storage.get(sessionId);
        
        if (sessionContext) {
          let personalizedContext = '\n\nPERSONALIZED CONTEXT:\n';
          
          if (sessionContext.name) {
            personalizedContext += `User: ${sessionContext.name}`;
            if (sessionContext.email) personalizedContext += ` (${sessionContext.email})`;
            personalizedContext += '\n';
          }
          
          const companyCtx = sessionContext.company_context as any;
          if (companyCtx?.name) {
            personalizedContext += `Company: ${companyCtx.name}\n`;
            if (companyCtx.industry) personalizedContext += `Industry: ${companyCtx.industry}\n`;
            if (companyCtx.size) personalizedContext += `Size: ${companyCtx.size}\n`;
          }
          
          const roleInfo = sessionContext.role;
          if (roleInfo) {
            personalizedContext += `Role: ${roleInfo}\n`;
          }
          
          // Cap personalized context at 500 chars to avoid bloat
          if (personalizedContext.length > 500) {
            personalizedContext = personalizedContext.substring(0, 500) + '...\n';
          }
          
          fullInstruction += personalizedContext;
        }
      } catch (error) {
        console.warn(`[buildLiveConfig] Failed to load personalized context:`, error);
        // Continue without personalized context
      }
    }
    
    // ADD MULTIMODAL CONTEXT SNAPSHOT (if available)
    if (sessionId && sessionId !== 'anonymous') {
      try {
        const { multimodalContextManager } = await import('../src/core/context/multimodal-context.js');
        const contextData = await multimodalContextManager.prepareChatContext(
          sessionId,
          false, // Don't include visual for initial prompt (too large)
          false  // Don't include audio
        );
        
        if (contextData.multimodalContext?.recentAnalyses?.length > 0) {
          const recentSummary = contextData.multimodalContext.recentAnalyses
            .slice(0, 2) // Last 2 analyses only
            .join('; ');
          
          if (recentSummary.length > 0 && recentSummary.length <= 300) {
            fullInstruction += `\n\nRECENT MULTIMODAL CONTEXT: ${recentSummary}`;
          }
        }
      } catch (error) {
        console.warn(`[buildLiveConfig] Failed to load multimodal context:`, error);
      }
    }
    
    // ADD PRIOR CHAT CONTEXT
    if (priorContext) {
      fullInstruction += `\n\n${priorContext}`;
    }
    
    // Cap total instruction at 4000 chars to avoid token bloat
    if (fullInstruction.length > 4000) {
      console.warn(`[buildLiveConfig] System instruction truncated from ${fullInstruction.length} to 4000 chars`);
      fullInstruction = fullInstruction.substring(0, 4000) + '\n\n[Context truncated for token efficiency]';
    }
    
    const liveConfig: any = {
      responseModalities: ["AUDIO"],
      inputAudioTranscription: {
        model: "gemini-2.5-flash-native-audio-preview-09-2025"
      },
      outputAudioTranscription: {
        model: "gemini-2.5-flash-native-audio-preview-09-2025"
      },
      speechConfig: {
        voiceConfig: { 
          prebuiltVoiceConfig: { 
            voiceName: voiceNameOverride || VOICE_CONFIG.DEFAULT_VOICE 
          } 
        }
      },
      systemInstruction: fullInstruction,
      tools: [{ functionDeclarations: LIVE_FUNCTION_DECLARATIONS }]
    };
    
    console.log(`[buildLiveConfig] Final config:`, {
      systemInstructionLength: liveConfig.systemInstruction.length,
      voiceName: liveConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
      hasPersonalizedContext: fullInstruction.includes('PERSONALIZED CONTEXT'),
      hasMultimodalContext: fullInstruction.includes('MULTIMODAL CONTEXT')
    });
    
    return liveConfig;
  }

  // Message handler functions
  async function handleToolResult(connectionId: string, client: ActiveSessionRecord, payload: any) {
    const responses = payload?.responses;
    if (!Array.isArray(responses) || responses.length === 0) {
      console.warn(`[${connectionId}] TOOL_RESULT missing responses`);
      return;
    }
    
    try {
      client.logger?.log('tool_result_client', { responsesCount: responses.length })
      await client.session.sendToolResponse({ functionResponses: responses });
      safeSend(client.ws, JSON.stringify({ type: MESSAGE_TYPES.TOOL_CALL, payload: { responses } }));
      client.logger?.log('tool_result_forwarded', { responsesCount: responses.length })
    } catch (err) {
      console.error(`[${connectionId}] Failed to forward tool responses to Live API:`, err);
      safeSend(client.ws, JSON.stringify({ type: MESSAGE_TYPES.TOOL_CALL, payload: { error: err instanceof Error ? err.message : 'Tool response failed' } }));
      client.logger?.log('error', { where: 'tool_result_forward', message: err instanceof Error ? err.message : String(err) })
    }
  }

  async function handleRealtimeInput(connectionId: string, client: ActiveSessionRecord, payload: any) {
    const chunks = Array.isArray(payload?.chunks) ? payload.chunks : [];

    if (chunks.length === 0) {
      console.warn(`[${connectionId}] REALTIME_INPUT received but no chunks`);
      return;
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
  }

  async function handleContextUpdate(connectionId: string, client: ActiveSessionRecord, payload: any) {
    const modality = typeof payload?.modality === 'string' ? payload.modality : '';
    if (modality !== 'screen' && modality !== 'webcam') {
      console.warn(`[${connectionId}] CONTEXT_UPDATE ignored due to invalid modality: ${modality}`);
      return;
    }

    const analysis = typeof payload.analysis === 'string' ? payload.analysis : '';
    if (!analysis) {
      console.warn(`[${connectionId}] CONTEXT_UPDATE missing analysis text`);
      return;
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
      lastInjected: prev?.lastInjected,
      lastPersisted: prev?.lastPersisted
    };
    client.logger?.log('context_update', { modality, analysis, capturedAt, hasImage: Boolean(imageData), imageBytes: typeof imageData === 'string' ? Math.floor(imageData.length * 0.75) : 0 })

    if (client.sessionId) {
      const snapRef = client.latestContext[modalityKey];
      const now = Date.now();
      if (!snapRef.lastPersisted || now - snapRef.lastPersisted >= VISUAL_PERSIST_THROTTLE_MS) {
        snapRef.lastPersisted = now;
        (async () => {
          try {
            const { multimodalContextManager } = await import('../src/core/context/multimodal-context.js')
            const imageBytes = typeof imageData === 'string' ? Math.floor(imageData.length * 0.75) : undefined
            await multimodalContextManager.addVisualAnalysis(client.sessionId!, analysis, modalityKey, imageBytes, imageData)
            client.logger?.log('context_persisted', { modality, imageBytes, analysisLength: analysis.length })
          } catch (err) {
            console.error(`[${connectionId}] Failed to persist ${modality} context:`, err);
            client.logger?.log('error', { where: 'context_persist', modality, message: err instanceof Error ? err.message : String(err) })
          }
        })().catch(() => {
          // handled in logger
        })
      }
    }

    if (!INJECT_ON_CONTEXT_UPDATE) {
      console.info(`[${connectionId}] CONTEXT_UPDATE received; injection disabled by flag`);
      return;
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

        if (typeof client.session.sendRealtimeInput === 'function') {
          // Send image first if available
          if (snap.imageData) {
            const base64Data = snap.imageData.replace(/^data:image\/\w+;base64,/, '');
            await client.session.sendRealtimeInput({ 
              media: { mimeType: 'image/jpeg', data: base64Data } 
            });
          }
          // Then send text context
          await client.session.sendRealtimeInput({ 
            media: { mimeType: 'text/plain', data: `[${modality} context]: ${snap.analysis}` }
          });
        } else {
          throw new Error('sendRealtimeInput not available');
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
  }

  async function handleStart(connectionId: string, ws: WebSocket, payload: any) {
    console.info(`[${connectionId}] 🔊 handleStart called with payload:`, JSON.stringify(payload));

    // Acknowledge start immediately so client doesn't timeout
    safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.START_ACK, payload: { connectionId } }));

    // Prevent concurrent starts
    if (sessionStarting.has(connectionId)) {
      console.info(`[${connectionId}] 🔊 start() already in progress; skipping duplicate call.`)
      return
    }
    sessionStarting.add(connectionId)

    // Close existing session if any
    if (activeSessions.has(connectionId) && !closingForRestart.has(connectionId) && !sessionStarting.has(connectionId)) {
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
      safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { message: 'GEMINI_API_KEY not configured on server.' } }));
      sessionStarting.delete(connectionId)
      return;
    }

    try {
      const requestedLang = isBcp47(payload?.languageCode) ? payload.languageCode : undefined
      const lang = requestedLang || 'en-US'
      const requestedVoice = typeof payload?.voiceName === 'string' ? payload.voiceName : undefined
      const voiceName = requestedVoice || VOICE_CONFIG.BY_LANG[lang as keyof typeof VOICE_CONFIG.BY_LANG] || VOICE_CONFIG.DEFAULT_VOICE
      const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId.trim() : ''

      const priorChatContext = await loadConversationHistory(sessionId, connectionId);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      // Use a Live-supported model. Allow override via env, fallback to config
      const model = `models/${process.env.GEMINI_LIVE_MODEL || GEMINI_MODELS.DEFAULT_VOICE}`

      console.info(`[${connectionId}] Connecting to Live API with model: ${model}`)

      let isOpen = false

      // Build Live API configuration (now async with sessionId)
      const liveConfig = await buildLiveConfig(sessionId, priorChatContext, voiceName);

      // Add connection timeout to prevent infinite hangs
      const connectTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Live API connection timeout after 30s')), 30000)
      )

      const session: any = await Promise.race([
        ai.live.connect({
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
              // Log EVERY message from Gemini for comprehensive debugging
              console.log(`[${connectionId}] [GEMINI MESSAGE]`, JSON.stringify(message, null, 2));
              
              // Setup complete
              if (message?.setupComplete) {
                console.log(`[${connectionId}] [SETUP COMPLETE] Full details:`, JSON.stringify(message.setupComplete, null, 2));
                safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.SETUP_COMPLETE, payload: { setupComplete: true } }));
                activeSessions.get(connectionId)?.logger?.log('setup_complete')
              }

              // Tool calls
              if (message?.toolCall) {
                safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.TOOL_CALL, payload: message.toolCall }));
                activeSessions.get(connectionId)?.logger?.log('tool_call', message.toolCall)

                // Track tool call for export
                const sessionClient = activeSessions.get(connectionId)
                if (sessionClient?.sessionId && message.toolCall?.functionCalls?.[0]) {
                  try {
                    const toolCall = message.toolCall.functionCalls[0]
                    const { multimodalContextManager } = await import('../src/core/context/multimodal-context.js')
                    await multimodalContextManager.addToolCallToLastTurn(sessionClient.sessionId, {
                      name: toolCall.name,
                      args: toolCall.args || {},
                      id: toolCall.id
                    })
                  } catch (err) {
                    console.warn(`[${connectionId}] Failed to track tool call:`, err)
                  }
                }
              }

              const serverContent = message?.serverContent;
              if (!serverContent) {
                // Log what we received if no serverContent
                console.log(`[${connectionId}] [NO SERVER CONTENT] Message keys:`, Object.keys(message || {}));
                return;
              }

              // Log server content structure for debugging (only key info, not full JSON)
              const hasModelTurn = !!serverContent.modelTurn;
              const partsCount = serverContent.modelTurn?.parts?.length || 0;
              const hasAudioParts = serverContent.modelTurn?.parts?.some((p: any) => p.inlineData?.data) || false;
              console.log(`[${connectionId}] [SERVER CONTENT] hasModelTurn: ${hasModelTurn}, parts: ${partsCount}, hasAudio: ${hasAudioParts}`);
              
              if (serverContent.modelTurn) {
                console.log(`[${connectionId}] [MODEL TURN] Exists!`, {
                  hasparts: !!serverContent.modelTurn.parts,
                  partsLength: serverContent.modelTurn.parts?.length,
                  partTypes: serverContent.modelTurn.parts?.map((p: any) => ({
                    hasText: !!p.text,
                    hasInlineData: !!p.inlineData,
                    inlineDataKeys: p.inlineData ? Object.keys(p.inlineData) : []
                  }))
                });
              }

              // Transcriptions
              if (serverContent.inputTranscription) {
                const text = serverContent.inputTranscription.text;
                const isFinal = (serverContent.inputTranscription as any).isFinal ?? false;
                // Compat: include both isFinal and final to support older clients
                safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.INPUT_TRANSCRIPT, payload: { text, isFinal, final: isFinal } }));
                activeSessions.get(connectionId)?.logger?.log('input_transcript', { text, isFinal })

                // Track conversation turn for export (when final)
                if (isFinal) {
                  const sessionClient = activeSessions.get(connectionId)
                  if (sessionClient?.sessionId) {
                    try {
                      const { multimodalContextManager } = await import('../src/core/context/multimodal-context.js')
                      await multimodalContextManager.addConversationTurn(sessionClient.sessionId, {
                        role: 'user',
                        text,
                        isFinal: true,
                        modality: 'voice'
                      })
                      if (text && text.trim().length > 0) {
                        await multimodalContextManager.addVoiceTranscript(
                          sessionClient.sessionId,
                          text,
                          'user',
                          true
                        )
                      }

                      // NEW: Track turn count and trigger orchestrator sync
                      sessionClient.userTurnCount = (sessionClient.userTurnCount || 0) + 1
                      const turnCount = sessionClient.userTurnCount
                      
                      // Sync at milestones: 3, 8, 13, 18, etc.
                      if (turnCount === 3 || (turnCount > 3 && (turnCount - 3) % 5 === 0)) {
                        console.log(`[${connectionId}] Milestone reached (turn ${turnCount}), syncing to orchestrator...`)
                        
                        // Non-blocking - don't await
                        syncVoiceToOrchestrator(sessionClient.sessionId, connectionId, sessionClient)
                          .catch(err => console.error('Background orchestrator sync failed:', err))
                      }
                    } catch (err) {
                      console.warn(`[${connectionId}] Failed to track user voice turn:`, err)
                    }
                  }
                }

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
                          // Use sendRealtimeInput for visual context injection
                          if (typeof clientRec.session.sendRealtimeInput === 'function') {
                            // Send image first if available
                            if (snap.imageData) {
                              const base64Data = snap.imageData.replace(/^data:image\/\w+;base64,/, '');
                              await clientRec.session.sendRealtimeInput({ 
                                media: { mimeType: 'image/jpeg', data: base64Data } 
                              });
                            }
                            // Then send text context
                            await clientRec.session.sendRealtimeInput({ 
                              media: { mimeType: 'text/plain', data: `Visual context: ${snap.analysis.substring(0, 200)}` }
                            });
                          } else {
                            throw new Error('sendRealtimeInput not available');
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
                safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.OUTPUT_TRANSCRIPT, payload: { text, isFinal, final: isFinal } }));
                activeSessions.get(connectionId)?.logger?.log('output_transcript', { text, isFinal })

                // Track conversation turn for export (when final)
                if (isFinal) {
                  const sessionClient = activeSessions.get(connectionId)
                  if (sessionClient?.sessionId) {
                    try {
                      const { multimodalContextManager } = await import('../src/core/context/multimodal-context.js')
                      await multimodalContextManager.addConversationTurn(sessionClient.sessionId, {
                        role: 'agent',
                        text,
                        isFinal: true,
                        modality: 'voice'
                      })
                      if (text && text.trim().length > 0) {
                        await multimodalContextManager.addVoiceTranscript(
                          sessionClient.sessionId,
                          text,
                          'assistant',
                          true
                        )
                      }
                    } catch (err) {
                      console.warn(`[${connectionId}] Failed to track AI voice turn:`, err)
                    }
                  }
                }
              }

              // Text + audio parts
              if (serverContent.modelTurn?.parts) {
                for (const part of serverContent.modelTurn.parts) {
                  // Skip internal thoughts - these are not meant for the user
                  if (part.thought === true) {
                    console.log(`[${connectionId}] [MODEL THOUGHT] Skipping internal thought:`, part.text?.substring(0, 100));
                    activeSessions.get(connectionId)?.logger?.log('model_thought_skipped', { textPreview: part.text?.substring(0, 100) })
                    continue;
                  }
                  
                  if (part.text) {
                    console.log(`[${connectionId}] [MODEL TEXT] Received text:`, part.text);
                    safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.TEXT, payload: { content: part.text } }));
                    activeSessions.get(connectionId)?.logger?.log('model_text', { text: part.text })
                  }
                  if (part.inlineData?.data) {
                    const audioBase64 = part.inlineData.data;
                    const audioBytes = Math.floor((audioBase64.length || 0) * 0.75);
                    console.log(`[${connectionId}] 🔊 [MODEL AUDIO] Received audio chunk! Size: ${audioBytes} bytes, base64Length: ${audioBase64.length}`);
                    
                    // Forward audio to client
                    safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.AUDIO, payload: { audioData: audioBase64, mimeType: 'audio/pcm;rate=24000' } }));
                    activeSessions.get(connectionId)?.logger?.log('audio_chunk', { direction: 'server_to_client', bytes: audioBytes, mimeType: 'audio/pcm;rate=24000' });
                    
                    // Log success
                    console.log(`[${connectionId}] ✅ Audio chunk forwarded to client via WebSocket`);
                  } else if (part.inlineData) {
                    // Has inlineData but no data field - log structure for debugging
                    console.log(`[${connectionId}] ⚠️ [MODEL PART] Has inlineData but no data field. Keys:`, Object.keys(part.inlineData || {}));
                  }
                }
              }

              if (serverContent.turnComplete) {
                safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.TURN_COMPLETE, payload: { turnComplete: true } }));
                activeSessions.get(connectionId)?.logger?.log('turn_complete')
                // Clear any pending turn completion timer since we received a real one
                const client = activeSessions.get(connectionId);
                if (client?.turnCompletionTimer) {
                  clearTimeout(client.turnCompletionTimer);
                  client.turnCompletionTimer = undefined;
                  console.info(`[${connectionId}] 🔄 Cleared turn completion timer (received from Live API)`);
                }

                // Track conversation turn for milestone sync and context saving (since inputTranscription isn't available)
                // Each turnComplete means the model finished responding to a user turn
                if (client?.sessionId && !client.lastTurnCompleteAt) {
                  // Only count once per turn (prevent double-counting)
                  client.lastTurnCompleteAt = Date.now();
                  
                  try {
                    // Save user voice turn (even without transcript) - mark as voice input
                    // This ensures chat can see voice conversations happened
                    const { multimodalContextManager } = await import('../src/core/context/multimodal-context.js')
                    await multimodalContextManager.addConversationTurn(client.sessionId, {
                      role: 'user',
                      text: '[Voice input - transcript unavailable]', // Placeholder since Gemini doesn't send inputTranscription
                      isFinal: true,
                      modality: 'voice'
                    })
                    await multimodalContextManager.addVoiceTranscript(
                      client.sessionId,
                      '[Voice input - transcript unavailable]',
                      'user',
                      true
                    )
                    
                    // Increment turn count
                    client.userTurnCount = (client.userTurnCount || 0) + 1
                    const turnCount = client.userTurnCount
                    
                    console.log(`[${connectionId}] 🔢 Voice turn completed (turn ${turnCount})`)
                    
                    // Sync at milestones: 3, 8, 13, 18, etc.
                    if (turnCount === 3 || (turnCount > 3 && (turnCount - 3) % 5 === 0)) {
                      console.log(`[${connectionId}] 🎯 Milestone reached (turn ${turnCount}), syncing to orchestrator...`)
                      
                      // Non-blocking - don't await
                      syncVoiceToOrchestrator(client.sessionId, connectionId, client)
                        .catch(err => console.error(`[${connectionId}] Background orchestrator sync failed:`, err))
                    }
                  } catch (err) {
                    console.warn(`[${connectionId}] Failed to track voice turn completion:`, err)
                  }
                  
                  // Reset after 2 seconds to allow next turn to be tracked
                  setTimeout(() => {
                    if (client) {
                      client.lastTurnCompleteAt = undefined
                    }
                  }, 2000)
                }
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
            safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { message, code } }))
            activeSessions.get(connectionId)?.logger?.log('error', { where: 'live_api', message, code })
          },
          onclose: (event: any) => {
            isOpen = false
            const closeDetails = {
              code: event?.code,
              reason: event?.reason,
              wasClean: event?.wasClean,
              timestamp: new Date().toISOString(),
              hadError: Boolean(event?.error)
            }
            console.error(`[${connectionId}] ⚠️ Live API session closed`, closeDetails)
            const rec = activeSessions.get(connectionId)
            rec?.logger?.log('session_closed', { source: 'live_api', ...closeDetails })
            rec?.logger?.close()
            activeSessions.delete(connectionId)
            noSessionWarned.delete(connectionId)
            // If we're intentionally restarting a session, don't emit session_closed to the client
            if (closingForRestart.has(connectionId)) {
              closingForRestart.delete(connectionId)
            } else {
              safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.SESSION_CLOSED, payload: { reason: 'live_api_closed' } }))
            }
          }
        }
      }),
      connectTimeout
    ])

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

      // If the client WebSocket closed while we were connecting to the Live API,
      // do not proceed. Close the Live session to avoid orphaned sessions and bail.
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn(`[${connectionId}] Client socket closed before session ready; closing Live session`)
        try { (session as any)?.close?.() } catch {}
        activeSessions.delete(connectionId)
        sessionStarting.delete(connectionId)
        return
      }

      {
        const prev = activeSessions.get(connectionId)
        activeSessions.set(connectionId, { ws, session, sessionId, latestContext: prev?.latestContext || {}, injectionTimers: prev?.injectionTimers, logger: prev?.logger });
      }
      console.info(`[${connectionId}] Live API session established for sessionId: ${sessionId || 'anonymous'}`)

      // Send session started message to client
      safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.SESSION_STARTED, payload: { connectionId, languageCode: lang, voiceName } }));
      activeSessions.get(connectionId)?.logger?.log('session_started', { languageCode: lang, voiceName })

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session';
      console.error(`[${connectionId}] Failed to start Live API session:`, error);
      safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { message } }));
      activeSessions.get(connectionId)?.logger?.log('error', { where: 'handleStart', message })
    } finally {
      sessionStarting.delete(connectionId)
    }
  }

  async function handleUserMessage(connectionId: string, ws: WebSocket, payload: any) {
    // Always use Live API in this configuration

    if (payload.audioData && payload.mimeType) {
      const client = activeSessions.get(connectionId)
      if (!client || !client.session) {
        // Only log once per connection to avoid spam
        if (!noSessionWarned.has(connectionId)) {
          console.warn(`[${connectionId}] No active session to send audio to - session may not be initialized yet`)
          noSessionWarned.add(connectionId)
        }
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
        // Track audio chunk count for periodic logging
        client.audioChunkCount = (client.audioChunkCount || 0) + 1
        
        client.logger?.log('audio_chunk', { direction: 'client_to_server', bytes: approxBytes, mimeType })
        
        // Update last audio activity time and reset turn completion timer
        client.lastAudioActivity = Date.now();
        resetTurnCompletionTimer(connectionId, client);
        
        // Only log session methods in debug mode (too verbose)
        if (DEBUG_MODE) {
          console.log(`[${connectionId}] Session methods:`, {
            hasSendRealtimeInput: typeof client.session.sendRealtimeInput,
            hasSend: typeof client.session.send,
            sessionKeys: Object.keys(client.session),
          })
        }
        
        if (typeof client.session.sendRealtimeInput === 'function') {
          await client.session.sendRealtimeInput({ media: { mimeType, data: audioData } })
          
          // Log audio stats periodically instead of every chunk
          if (DEBUG_MODE || client.audioChunkCount % AUDIO_LOG_INTERVAL === 0) {
            console.info(`[${connectionId}] ✅ Audio chunks processed: ${client.audioChunkCount} (${audioData.length} chars, ${mimeType})`)
          }
        } else {
          console.error(`[${connectionId}] ❌ sendRealtimeInput method not available on session`) 
          safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { message: 'Live session cannot accept audio (no sendRealtimeInput method)' } }))
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
        safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { message: `Failed to send audio to Live API: ${msg}` } }))
      }
      return
    }

    // Handle text messages if needed in the future
  }

  async function handleClose(connectionId: string) {
    const client = activeSessions.get(connectionId);
    if (client) {
      // Clear turn completion timer
      if (client.turnCompletionTimer) {
        clearTimeout(client.turnCompletionTimer);
        client.turnCompletionTimer = undefined;
        console.info(`[${connectionId}] 🔄 Cleared turn completion timer (session closing)`);
      }

      // Archive conversation if it has meaningful content
      if (client.sessionId && CONTEXT_CONFIG.ARCHIVE_ON_DISCONNECT) {
        try {
          const { multimodalContextManager } = await import('../src/core/context/multimodal-context.js')
          const context = await multimodalContextManager.getContext(client.sessionId)
          
          if (context && context.conversationHistory.length >= CONTEXT_CONFIG.MIN_MESSAGES_FOR_ARCHIVE) {
            console.log(`[${connectionId}] 💾 Archiving conversation for ${client.sessionId}...`)
            await multimodalContextManager.archiveConversation(client.sessionId)
            console.log(`[${connectionId}] ✅ Conversation archived on disconnect`)
          } else {
            console.log(`[${connectionId}] ⏭️ Skipping archive: no meaningful content`)
          }
        } catch (err) {
          console.error(`[${connectionId}] ❌ Failed to archive on disconnect:`, err)
          // Non-fatal - continue with cleanup
        }
      }

      // NEW: Final orchestrator sync before closing
      if (client.sessionId && client.userTurnCount && client.userTurnCount > 0) {
        console.log(`[${connectionId}] Final orchestrator sync before session end...`)
        await syncVoiceToOrchestrator(client.sessionId, connectionId, client)
          .catch(err => console.error('Final orchestrator sync failed:', err))
      }

      try { client.session?.close?.() } catch (error) {
        console.warn(`[${connectionId}] Failed to close session`, error)
      }
      activeSessions.delete(connectionId);
      noSessionWarned.delete(connectionId);
    }
    console.info(`[${connectionId}] Session removed.`);
  }

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const connectionId = uuidv4();
    console.info(`[${connectionId}] Client connected.`);
    
    let heartbeatTimer: NodeJS.Timeout | null = null;

    // Register message handler IMMEDIATELY (before any other operations)
    // This ensures we capture ALL messages regardless of timing
    ws.on('message', async (message: RawData) => {
      // Start heartbeat only after first message
      if (!heartbeatTimer) {
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: MESSAGE_TYPES.HEARTBEAT, timestamp: Date.now() }));
          }
        }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL);
      }
      
      try {
        const rawString = decodeRawMessage(message)
        const parsedMessage = rawString ? JSON.parse(rawString) : { type: 'unknown' }
        const messageType = String(parsedMessage?.type || 'unknown');
        
        // Only log raw/parsed messages in debug mode (too verbose for production)
        // Consolidated single log instead of 3 separate logs (per duplicate prevention rules)
        if (DEBUG_MODE) {
          console.info(`[${connectionId}] 📨 ${messageType.toUpperCase()}:`, {
            rawSize: Buffer.isBuffer(message) ? message.length : 'unknown',
            payloadSize: rawString?.length || 0,
            hasPayload: !!parsedMessage.payload,
            preview: rawString?.substring(0, 100) || 'null'
          });
        }
        switch (parsedMessage.type) {
          case MESSAGE_TYPES.START:
            console.info(`[${connectionId}] Handling start message`);
            try { activeSessions.get(connectionId)?.logger?.log('client_start', { payload: { languageCode: parsedMessage?.payload?.languageCode, voiceName: parsedMessage?.payload?.voiceName, sessionId: parsedMessage?.payload?.sessionId } }) } catch {}
            await handleStart(connectionId, ws, parsedMessage.payload);
            break;
          case MESSAGE_TYPES.STOP: {
            console.info(`[${connectionId}] Handling stop message`)
            await handleClose(connectionId)
            // Acknowledge stop
            safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.SESSION_CLOSED, payload: { reason: 'client_stop' } }))
            break;
          }
          case MESSAGE_TYPES.USER_AUDIO:
            // No redundant log - switch case already shows we're handling user_audio
            await handleUserMessage(connectionId, ws, parsedMessage.payload);
            break;
          case MESSAGE_TYPES.TOOL_RESULT: {
            const client = activeSessions.get(connectionId);
            if (!client) {
              console.warn(`[${connectionId}] TOOL_RESULT received but no active session`);
              break;
            }
            await handleToolResult(connectionId, client, parsedMessage.payload);
            break;
          }
          case MESSAGE_TYPES.REALTIME_INPUT: {
            console.info(`[${connectionId}] Handling REALTIME_INPUT message`);
            const client = activeSessions.get(connectionId);
            if (!client) {
              console.warn(`[${connectionId}] REALTIME_INPUT received but no active session`);
              break;
            }
            await handleRealtimeInput(connectionId, client, parsedMessage.payload);
            break;
          }
          case MESSAGE_TYPES.CONTEXT_UPDATE: {
            console.info(`[${connectionId}] Handling CONTEXT_UPDATE message`);
            const client = activeSessions.get(connectionId);
            if (!client) {
              console.warn(`[${connectionId}] CONTEXT_UPDATE received but no active session`);
              break;
            }
            await handleContextUpdate(connectionId, client, parsedMessage.payload);
            break;
          }
          case MESSAGE_TYPES.HEARTBEAT_ACK: {
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

    // Disable socket delay to improve performance                (This is a performance optimization)
    try { 
      (req.socket as any)?.setNoDelay?.(true) 
    } catch (error) {
      console.warn(`[${connectionId}] Unable to disable socket delay`, error)
    }

    // Acknowledge connection
    const connectedMessage = JSON.stringify({ type: MESSAGE_TYPES.CONNECTED, payload: { connectionId } })
    console.info(`[${connectionId}] Sending connected event to client`)
    safeSend(ws, connectedMessage)

    // Initialize session logger asynchronously to not block message handling
    Promise.resolve().then(() => {
      try {
        const logger = new SessionLogger(connectionId)
        logger.log('connected')
        // Update or seed the active session record with logger
        const existing = activeSessions.get(connectionId)
        if (existing) {
          existing.logger = logger
        } else {
          activeSessions.set(connectionId, { ws, session: undefined as any, latestContext: {}, logger })
        }
      } catch (e) {
        console.warn(`[${connectionId}] Failed to initialize session logger:`, e)
      }
    })

    ws.on('close', (code: number, reason: Buffer) => {
      console.info(`[${connectionId}] WebSocket closed. Code: ${code}, Reason: ${reason?.toString?.() || 'N/A'}`)
      console.warn(`[${connectionId}] CLOSED early code=${code} reason=${reason?.toString()}`);
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
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
