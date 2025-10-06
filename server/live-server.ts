import { WebSocketServer, WebSocket } from 'ws'
import type { RawData } from 'ws'
import { GoogleGenAI, LiveServerToolCall, Modality } from '@google/genai'
import { GenAILiveClient } from './genai-live-client.js'
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

// Determine if running in local development
const hasFlyEnv = process.env.FLY_APP_NAME && process.env.FLY_APP_NAME.length > 0;
const explicitProdEnv = process.env.NODE_ENV === 'production';
const isLocalDev = !hasFlyEnv && !explicitProdEnv;

// Use PORT for Fly.io compatibility, fallback to 3001 for local development
const PORT = process.env.PORT || process.env.LIVE_SERVER_PORT || 3001;
console.log(`🔧 Environment check: PORT=${process.env.PORT || 'undefined'}, LIVE_SERVER_PORT=${process.env.LIVE_SERVER_PORT || 'undefined'}, Using: ${PORT}`);
console.log(`🌍 Environment: NODE_ENV=${process.env.NODE_ENV || 'undefined'}, FLY_APP_NAME=${process.env.FLY_APP_NAME || 'undefined'}`);
console.log(`🏷️  Mode: ${isLocalDev ? 'LOCAL DEVELOPMENT' : 'PRODUCTION (Fly.io)'}`);
const IS_MOCK = (process.env.FBC_USE_MOCKS === '1' || process.env.LIVE_MOCK === '1');

// Voice & Language Utilities
const VOICE_BY_LANG: Record<string, string> = {
  'en-US': 'Zephyr',
  'en-GB': 'Zephyr',
  'nb-NO': 'Zephyr',
  'sv-SE': 'Zephyr',
  'de-DE': 'Zephyr',
  'es-ES': 'Zephyr',
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

// Store active Live API sessions
const activeSessions = new Map<string, { ws: WebSocket; session: any; audioBuffer: ArrayBuffer[]; audioTimeout?: NodeJS.Timeout }>();
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

// PCM to WAV conversion utility
function pcmToWav(pcmData: ArrayBuffer, sampleRate: number, channels: number, bitDepth: number): Buffer {
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  
  const wavHeader = Buffer.alloc(44);
  const wavData = Buffer.from(pcmData);
  
  // WAV header
  wavHeader.write('RIFF', 0); // ChunkID
  wavHeader.writeUInt32LE(36 + wavData.length, 4); // ChunkSize
  wavHeader.write('WAVE', 8); // Format
  wavHeader.write('fmt ', 12); // Subchunk1ID
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (PCM)
  wavHeader.writeUInt16LE(channels, 22); // NumChannels
  wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
  wavHeader.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // ByteRate
  wavHeader.writeUInt16LE(blockAlign, 32); // BlockAlign
  wavHeader.writeUInt16LE(bitDepth, 34); // BitsPerSample
  wavHeader.write('data', 36); // Subchunk2ID
  wavHeader.writeUInt32LE(wavData.length, 40); // Subchunk2Size
  
  return Buffer.concat([wavHeader, wavData]);
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
    try { activeSessions.get(connectionId)?.session?.disconnect?.() } catch (error) {
      console.warn(`[${connectionId}] Failed to close previous session`, error)
    }
  }

  if (IS_MOCK) {
    // Mock session: immediately report started without touching Gemini
    safeSend(ws, JSON.stringify({ type: 'session_started', payload: { connectionId, languageCode: payload?.languageCode || 'en-US', voiceName: payload?.voiceName || 'Puck', mock: true } }));
    activeSessions.set(connectionId, { ws, session: {} as any, audioBuffer: [] });
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

    // Use the exact working sandbox pattern
    const client = new GenAILiveClient(
      process.env.GEMINI_API_KEY,
      process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-live-001'
    );

    console.info(`[${connectionId}] 🔍 Using GenAILiveClient pattern from working sandbox`);

    // Set up event handlers exactly like the sandbox
    client.on('log', (log) => {
      console.info(`[${connectionId}] 📋 Client log:`, JSON.stringify(log, null, 2));
    });

    client.on('setupcomplete', () => {
      console.info(`[${connectionId}] ✅ SETUP COMPLETE RECEIVED! Session ready for audio`);
      console.info(`[${connectionId}] 📤 Sending session_started message to client`);
      safeSend(ws, JSON.stringify({ type: 'session_started', payload: { connectionId, languageCode: lang, voiceName } }));
      console.info(`[${connectionId}] ✅ session_started message sent successfully`);
    });

    client.on('content', (content) => {
      console.info(`[${connectionId}] 📨 Received content:`, JSON.stringify(content, null, 2));
      if (content.modelTurn?.parts) {
        for (const part of content.modelTurn.parts) {
          if (part.text) {
            console.info(`[${connectionId}] 📝 Text response: ${part.text}`);
            safeSend(ws, JSON.stringify({ type: 'text', payload: { content: part.text } }))
          }
        }
      }
    });

    client.on('audio', async (audioData: ArrayBuffer) => {
      console.info(`[${connectionId}] 🔊 Audio response received (${audioData.byteLength} bytes)`);
      
      const client = activeSessions.get(connectionId);
      if (!client) return;
      
      // Buffer audio chunks - don't send immediately, wait for turn completion
      client.audioBuffer.push(audioData);
      console.info(`[${connectionId}] 📊 Buffered audio chunk: ${audioData.byteLength} bytes (total: ${client.audioBuffer.length} chunks)`);
    });

    client.on('turncomplete', () => {
      console.info(`[${connectionId}] 🔄 Turn completed`);
      
      const client = activeSessions.get(connectionId);
      if (client && client.audioBuffer.length > 0) {
        try {
          console.info(`[${connectionId}] 🎵 Sending combined audio at turn completion: ${client.audioBuffer.length} chunks`);
          
          // Combine all buffered chunks
          const totalLength = client.audioBuffer.reduce((sum, chunk) => sum + chunk.byteLength, 0);
          const combinedBuffer = new ArrayBuffer(totalLength);
          const combinedView = new Uint8Array(combinedBuffer);
          
          let offset = 0;
          for (const chunk of client.audioBuffer) {
            const chunkView = new Uint8Array(chunk);
            combinedView.set(chunkView, offset);
            offset += chunkView.length;
          }
          
          // Convert combined PCM to WAV format for browser compatibility
          const wavBuffer = pcmToWav(combinedBuffer, 24000, 1, 16);
          const base64Audio = wavBuffer.toString('base64');
          
          safeSend(ws, JSON.stringify({
            type: 'audio',
            payload: { audioData: base64Audio, mimeType: 'audio/wav' }
          }));
          
          console.info(`[${connectionId}] 📤 Sent complete WAV audio at turn completion: ${wavBuffer.length} bytes from ${client.audioBuffer.length} chunks`);
          
          // Clear buffer after sending
          client.audioBuffer = [];
        } catch (error) {
          console.error(`[${connectionId}] Error sending complete audio at turn completion:`, error);
          client.audioBuffer = [];
        }
      }
      
      safeSend(ws, JSON.stringify({ type: 'turn_complete' }))
    });

    client.on('inputTranscription', (text, isFinal) => {
      console.info(`[${connectionId}] 📝 Input transcription: ${text} (final: ${isFinal})`);
      safeSend(ws, JSON.stringify({ 
        type: 'input_transcript', 
        payload: { text, final: isFinal } 
      }))
    });

    client.on('outputTranscription', (text, isFinal) => {
      console.info(`[${connectionId}] 📝 Output transcription: ${text} (final: ${isFinal})`);
      safeSend(ws, JSON.stringify({ 
        type: 'output_transcript', 
        payload: { text, final: isFinal } 
      }))
    });

    client.on('error', (error) => {
      console.error(`[${connectionId}] 🔥 Client error:`, error);
      safeSend(ws, JSON.stringify({ type: 'error', payload: { message: `Client error: ${error.message}` } }))
    });

    client.on('toolcall', (toolCall: LiveServerToolCall) => {
      console.info(`[${connectionId}] 🔧 Tool call received:`, JSON.stringify(toolCall, null, 2));
      
      // Handle tool calls like the sandbox does
      const functionResponses: any[] = [];

      for (const fc of toolCall.functionCalls || []) {
        console.info(`[${connectionId}] 🛠️ Executing function: ${fc.name} with args:`, JSON.stringify(fc.args, null, 2));
        
        // Prepare a simple response for each function call
        functionResponses.push({
          id: fc.id,
          name: fc.name,
          response: { result: 'ok' }, // Simple, hard-coded function response like sandbox
        });
      }

      console.info(`[${connectionId}] 📤 Sending tool response:`, JSON.stringify(functionResponses, null, 2));
      client.sendToolResponse({ functionResponses: functionResponses });
    });

    client.on('close', (event: CloseEvent) => {
      console.warn(`[${connectionId}] ⚠️ Client closed:`, event);
      activeSessions.delete(connectionId);
      safeSend(ws, JSON.stringify({ type: 'session_closed', payload: { reason: 'client_closed', event } }))
    });

    // Create EXACT configuration matching the working sandbox
    const liveConfig: any = {
      responseModalities: [Modality.AUDIO],  // Use Modality.AUDIO, not 'AUDIO' string
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName,
          },
        },
      },
      inputAudioTranscription: {},  // EMPTY OBJECTS, not undefined
      outputAudioTranscription: {}, // EMPTY OBJECTS, not undefined
      systemInstruction: {
        parts: [{ text: 'You are a helpful assistant and answer in a friendly tone.' }]
      },
      tools: []  // Start with no tools to eliminate this as the issue
    };

    console.info(`[${connectionId}] 📋 Connecting with config:`, JSON.stringify(liveConfig, null, 2));

    // Connect using the sandbox pattern
    const connected = await client.connect(liveConfig);
    
    if (!connected) {
      throw new Error('Failed to connect to GenAI Live API');
    }

    console.info(`[${connectionId}] ✅ GenAILiveClient connected successfully`);
    console.info(`[${connectionId}] ⏳ Waiting for setupComplete before sending session_started`);

    activeSessions.set(connectionId, { ws, session: client, audioBuffer: [] });
    console.info(`[${connectionId}] Live API session established using GenAILiveClient pattern`);

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
      console.info(`[${connectionId}] 🎤 Processing audio for turn-based conversation`);
      
      // For gemini-2.0-flash-live-001, use continuous streaming approach
      const audioBase64 = payload.audioData;
      
      console.info(`[${connectionId}] 🎤 Sending audio chunk: ${audioBase64.length} chars, MIME: ${payload.mimeType}`);
      
      // Use the correct approach from the working sandbox
      if (typeof client.session.sendRealtimeInput === 'function') {
        await client.session.sendRealtimeInput([{
          mimeType: 'audio/pcm;rate=16000',  // Use PCM format like sandbox, not WebM
          data: audioBase64
        }]);
        console.info(`[${connectionId}] ✅ Audio chunk sent using sendRealtimeInput() with PCM format`);
      } else {
        throw new Error('Session does not have a valid audio sending method');
      }
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
    try { 
      // Check if session exists and has a close method
      if (client.session && typeof client.session.close === 'function') {
        client.session.close();
      } else if (client.session && typeof client.session.destroy === 'function') {
        client.session.destroy();
      } else if (client.session && typeof client.session.end === 'function') {
        client.session.end();
      }
      // If no close method exists, just log and continue
      console.log(`[${connectionId}] Session cleanup completed`);
  } catch (error) {
    console.warn(`[${connectionId}] Session cleanup failed (non-critical):`, error instanceof Error ? error.message : String(error))
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
            // Try different methods for turn completion
            let turnCompleteSent = false;
            
            if (typeof client.session.sendClientContent === 'function') {
              await client.session.sendClientContent({ turnComplete: true });
              turnCompleteSent = true;
              console.info(`[${connectionId}] turnComplete sent using sendClientContent() method`);
            } else if (typeof client.session.send === 'function') {
              await client.session.send({
                clientContent: {
                  turnComplete: true
                }
              });
              turnCompleteSent = true;
              console.info(`[${connectionId}] turnComplete sent using send() method`);
            } else if (typeof client.session.sendRealtimeInput === 'function') {
              await client.session.sendRealtimeInput({
                clientContent: {
                  turnComplete: true
                }
              });
              turnCompleteSent = true;
              console.info(`[${connectionId}] turnComplete sent using sendRealtimeInput() method`);
            }
            
            if (turnCompleteSent) {
              console.info(`[${connectionId}] turnComplete sent to Live API`)
              safeSend(ws, JSON.stringify({ type: 'turn_complete' }))
            } else {
              console.warn(`[${connectionId}] No turn complete method found on session`);
              safeSend(ws, JSON.stringify({ type: 'turn_complete' }))
            }
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
    console.info(`[${connectionId}] 🔍 WebSocket close details - Code: ${code}, Reason: ${reason?.toString?.() || 'N/A'}, Active sessions: ${activeSessions.size}`)
    handleClose(connectionId)
  });

  ws.on('error', (err) => {
    console.error(`[${connectionId}] WebSocket error:`, err)
    handleClose(connectionId)
  });
});

console.info('Server setup complete.');
