# WebSocket Connection Timing Issue Analysis

## Problem Identified

**Root Cause**: The current implementation has a race condition where the client sends the start message before the WebSocket connection is fully established on the server side.

**Evidence**:
- ✅ Client logs show: "🎤 [RealtimeVoice] Sending start message"
- ✅ Client logs show: "🎤 [RealtimeVoice] Start message sent successfully"
- ❌ Server logs show: No start message received
- ❌ Server logs show: No "Client connected" log for this connection
- ❌ Server logs show: Only user_audio messages received

## Key Difference: Prototype vs Current Implementation

### Prototype Connection Flow (WORKING)

```typescript
// Location: /Users/farzad/Downloads/f.b_c-ai-consultant/components/LiveAgent.tsx

const connect = async () => {
  // 1. Get microphone FIRST
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // 2. Setup audio contexts
  inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
  outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
  
  // 3. Connect to Gemini Live API (direct connection)
  sessionPromiseRef.current = geminiLiveService.connect({
    onopen: () => {
      // 4. ONLY AFTER connection is ready, setup audio processing
      setConnectionState(ConnectionState.CONNECTED);
      const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
      const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
      
      // 5. Start audio processing AFTER connection is established
      scriptProcessor.onaudioprocess = (event: AudioProcessingEvent) => {
        // Audio processing and sending happens here
        sessionPromiseRef.current?.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
        });
      };
      
      // 6. Connect audio pipeline LAST
      source.connect(scriptProcessor);
      scriptProcessor.connect(inputAudioContextRef.current!.destination);
    }
  });
};
```

**Key Points**:
- **Sequential Setup**: Microphone → Audio Context → Connection → Audio Processing
- **No Separate Start Message**: Audio processing starts in `onopen` callback
- **Direct API**: No WebSocket proxy, direct Gemini Live API connection
- **Single Flow**: Everything happens in the `onopen` callback

### Current Implementation Connection Flow (BROKEN)

```typescript
// Location: src/hooks/useRealtimeVoice.ts

const startSession = useCallback(async (opts?: { languageCode?: string; voiceName?: string; sessionId?: string }) => {
  // 1. Check if socket ready (but 'open' ≠ 'connected')
  if (!isSocketReady || !liveRef.current) {
    // 2. Try to connect and wait for 'connected' event
    const ok = await new Promise<boolean>((resolve) => {
      const off = liveRef.current?.on('connected', () => {
        resolve(true);
      });
    });
  }
  
  // 3. Send start message IMMEDIATELY after 'connected' event
  console.log('🎤 [RealtimeVoice] Sending start message');
  liveRef.current?.start({
    languageCode: opts?.languageCode,
    voiceName: opts?.voiceName,
    sessionId: opts?.sessionId,
  });
  
  // 4. THEN start microphone recording
  await startRecording({ onChunk: handleRecorderChunk });
}, []);
```

**The Problem**: 
- **Race Condition**: `start()` message sent before server is fully ready
- **Two-Step Process**: Connection → Start Message → Microphone
- **WebSocket Proxy**: Additional layer adds complexity
- **Event Timing**: `connected` event ≠ server ready for start message

## What's Missing in Current Implementation

### 1. Proper Connection State Management

**Prototype**: Uses `onopen` callback as the single point of truth
```typescript
onopen: () => {
  setConnectionState(ConnectionState.CONNECTED);
  // Start everything here
}
```

**Current**: Has multiple states (`open`, `connected`) causing confusion
```typescript
client.on('open', () => setSocketReady(true));           // WebSocket open
client.on('connected', (id) => handleServerEvent(...)); // Server connected
```

### 2. Sequential Setup Order

**Prototype Order**:
1. Get microphone permission
2. Setup audio contexts
3. Connect to API
4. Start audio processing in `onopen`

**Current Order**:
1. Connect WebSocket
2. Wait for `connected` event
3. Send start message (PROBLEM: too early)
4. Start microphone

### 3. Single Point of Connection Setup

**Prototype**: Everything happens in the `onopen` callback
```typescript
onopen: () => {
  // Connection is ready
  // Setup audio processing
  // Start sending audio
}
```

**Current**: Distributed across multiple events and functions
```typescript
// Connection setup in connectWebSocket()
// Start message in startSession()
// Audio in handleRecorderChunk()
```

## The Fix: Learn from Prototype

### Option 1: Fix Current Architecture

```typescript
const startSession = useCallback(async (opts?: { languageCode?: string; voiceName?: string; sessionId?: string }) => {
  // 1. Get microphone FIRST (like prototype)
  await startRecording({ onChunk: handleRecorderChunk });
  
  // 2. Wait for proper connection
  if (!isSocketReady) {
    const ok = await new Promise<boolean>((resolve) => {
      const off = liveRef.current?.on('connected', () => {
        // 3. Send start message ONLY in the connected callback
        liveRef.current?.start({
          languageCode: opts?.languageCode,
          voiceName: opts?.voiceName,
          sessionId: opts?.sessionId,
        });
        resolve(true);
      });
    });
  }
}, []);
```

### Option 2: Simplify to Prototype Pattern

```typescript
const connect = async () => {
  // 1. Get microphone first
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // 2. Setup audio
  await startRecording({ onChunk: handleRecorderChunk });
  
  // 3. Connect and start everything in callback
  liveRef.current = new LiveClientWS();
  liveRef.current.on('connected', () => {
    // 4. Start session here
    liveRef.current?.start({...});
  });
  liveRef.current.connect();
};
```

## Critical Insight

The prototype works because it follows the **"Connection First, Then Action"** pattern:

1. **Establish Connection Completely** (including server-side setup)
2. **Then Start Audio Processing**
3. **Then Send Messages**

The current implementation tries to send messages before the connection is fully established on both client and server sides.

## Recommendation

**Immediate Fix**: Move the `start()` call inside the `connected` event handler, not after waiting for it.

```typescript
// In startSession function
const startSession = useCallback(async (opts?: { ... }) => {
  // Get microphone ready first
  await startRecording({ onChunk: handleRecorderChunk });
  
  // Setup connection listener
  const off = liveRef.current?.on('connected', () => {
    // Send start message ONLY when connection is fully ready
    liveRef.current?.start({...});
    off(); // Clean up listener
  });
  
  // Connect if not already connected
  if (!isSocketReady) {
    liveRef.current?.connect();
  }
}, []);
```

This follows the prototype pattern where the start message is sent as part of the connection establishment flow, not after it.

---

*Analysis of WebSocket connection timing issue - October 23, 2025*
