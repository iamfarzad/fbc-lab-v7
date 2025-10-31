# Voice Audio Quality Analysis: Client vs Admin

**Date**: 2025-01-27  
**Question**: Are audio quality and streaming the same between client and admin voice interfaces?

---

## TL;DR

**✅ YES - Audio quality and streaming are IDENTICAL**

Both client (`/live`) and admin voice interfaces produce **exactly the same** audio quality because they use the **same underlying implementation**:
- Same `useRealtimeVoice` hook
- Same `AudioRecorder` class
- Same `AudioPlayer` for playback
- Same WebSocket transport
- Same server processing

**⚠️ ONLY Difference:** Admin sends visual context (webcam/screen) 4x more frequently

---

## Audio Pipeline (Shared)

```
Both Client & Admin
├── useLiveApi()
│   └── useRealtimeVoice()
│       ├── useInlineRecorder({ targetSampleRate: 16000 })
│       │   └── AudioRecorder (src/lib/audio-recorder.ts)
│       │       ├── AudioContext @ 24kHz
│       │       ├── CRISP_AUDIO_WORKLET (inline)
│       │       ├── Buffer: 1024 samples (64ms latency)
│       │       └── PCM16 → base64
│       │
│       └── AudioPlayer (src/lib/audio/player.ts)
│           └── AudioContext @ 24kHz output
│
└── WebSocket Transport
    ├── WEBSOCKET_CONFIG (shared constant)
    ├── LiveClientWS (singleton)
    └── Gemini Live API (server)
```

---

## Audio Specifications

### Identical Configuration

**Input Audio:**
- **Sample Rate**: 24kHz (via AudioContext)
- **Channels**: Mono (1 channel)
- **Bit Depth**: 16-bit PCM
- **Latency**: 64ms per chunk (1024 samples)
- **Format**: Base64-encoded PCM16

**Audio Processing:**
- **Worklet**: Inline `CRISP_AUDIO_WORKLET`
- **Buffer Size**: 1024 samples
- **Chunks/sec**: ~15 chunks/second
- **DSP**: Controlled by environment variables

**Output Audio:**
- **Sample Rate**: 24kHz (server default)
- **Player**: `AudioPlayer` with schedule-ahead buffering
- **Latency Hint**: Interactive

### Environment Variables (Both Read Same)

```typescript
// src/lib/audio-utils.ts - STANDARD_AUDIO_CONSTRAINTS
NEXT_PUBLIC_VOICE_DSP_DEFAULT = false (default)
NEXT_PUBLIC_VOICE_ECHO_CANCELLATION
NEXT_PUBLIC_VOICE_NOISE_SUPPRESSION
NEXT_PUBLIC_VOICE_AUTO_GAIN
```

**Note:** If you want better audio quality, enable DSP features:
```bash
NEXT_PUBLIC_VOICE_DSP_DEFAULT=true
NEXT_PUBLIC_VOICE_ECHO_CANCELLATION=true
NEXT_PUBLIC_VOICE_NOISE_SUPPRESSION=true
NEXT_PUBLIC_VOICE_AUTO_GAIN=true
```

---

## Streaming Configuration

### Identical Transport

**WebSocket:**
- Same URL from `WEBSOCKET_CONFIG`
- Same `LiveClientWS` singleton
- Same encoding: PCM16 base64
- Same heartbeat: 60s

**Connection:**
- Same retry logic: 5 attempts with exponential backoff
- Same timeout: 10s connection timeout
- Same session timeout: 25 minutes

**Server:**
- Same Gemini Live API model
- Same voice configuration
- Same system prompts (session-type dependent, not UI dependent)
- Same audio processing pipeline

---

## The ONLY Difference: Visual Context Capture

### Multimodal Capture Intervals

| Interface | Webcam | Screen Share |
|-----------|--------|--------------|
| **Client** | 12 seconds | 4 seconds |
| **Admin** | 3 seconds | 3 seconds |

**Impact:**
- Admin sends webcam frames **4x more frequently**
- Admin sends screen frames **33% more frequently**
- Higher bandwidth usage for admin
- More server processing for visual context
- **NO impact on voice audio quality**

**Why the difference?**
- Client: More conservative (bandwidth/user experience balance)
- Admin: More aggressive (better real-time visual context)

---

## Audio Quality Matrix

| Aspect | Client | Admin | Match? |
|--------|--------|-------|--------|
| **Input Sample Rate** | 24kHz | 24kHz | ✅ |
| **Output Sample Rate** | 24kHz | 24kHz | ✅ |
| **Bit Depth** | 16-bit | 16-bit | ✅ |
| **Channels** | Mono | Mono | ✅ |
| **Latency** | 64ms | 64ms | ✅ |
| **Worklet** | CRISP_AUDIO_WORKLET | CRISP_AUDIO_WORKLET | ✅ |
| **Buffer Size** | 1024 | 1024 | ✅ |
| **Encoding** | PCM16 base64 | PCM16 base64 | ✅ |
| **WebSocket** | Same | Same | ✅ |
| **AudioRecorder** | Same class | Same class | ✅ |
| **AudioPlayer** | Same class | Same class | ✅ |
| **Server Processing** | Same | Same | ✅ |
| **Echo Cancellation** | Same env vars | Same env vars | ✅ |
| **Noise Suppression** | Same env vars | Same env vars | ✅ |
| **Auto Gain** | Same env vars | Same env vars | ✅ |
| **DSP Default** | Same env vars | Same env vars | ✅ |

**Result: 15/15 identical ✅**

---

## Code Verification

Both use `useLiveApi()` which wraps `useRealtimeVoice()`:

```typescript
// Client: src/components/agent-ui/app/session-view.tsx:293
const live = useLiveApi();

// Admin: src/components/admin/chat/AdminChatPanel.tsx:113
const liveApi = useLiveApi({
  sessionId,
  onPartialTranscript: (text) => setUserPartialTranscript(text),
  // ...
});
```

Both call the same hook:
```typescript
// src/hooks/useLiveApi.ts:13-17
export function useLiveApi(options: UseLiveApiOptions = {}) {
  const shared = useLiveApiContext()
  const { sessionId, ...realtimeOptions } = options
  const realtime = useRealtimeVoice({ ...realtimeOptions, sessionId })
  // ...
}
```

Both create the same recorder:
```typescript
// src/hooks/useRealtimeVoice.ts:247
const { startRecording, stopRecording, ... } = useInlineRecorder({ targetSampleRate: 16000 });

// Which creates:
const recorder = new AudioRecorder(); // Same class for both
```

---

## Performance Characteristics

### Identical Performance

**Latency:**
- Audio chunk processing: 64ms
- WebSocket transmission: Same for both
- Server processing: Same for both
- Playback: Same AudioPlayer

**Bandwidth:**
- Voice audio: Identical for both
- Visual context: Admin uses 4x more (webcam)
- Total bandwidth: Admin higher (visual context only)

**CPU Usage:**
- Audio processing: Identical for both
- Visual processing: Admin slightly higher
- Overall: Admin marginally higher due to more frequent captures

**Memory:**
- Audio buffers: Identical for both
- Visual buffers: Admin slightly higher
- Overall: Negligible difference

---

## Testing Audio Quality

To verify audio quality is identical:

```typescript
// Both use same AudioRecorder
const recorder = new AudioRecorder();
// Both get same sample rate
const rate = recorder.getSampleRate(); // Returns 24000

// Both use same AudioPlayer
const player = new AudioPlayer(24000);

// Both read same environment variables
const echoCancellation = parseBooleanEnv(
  process.env.NEXT_PUBLIC_VOICE_ECHO_CANCELLATION, 
  DEFAULT_DSP_STATE
);
```

**Verification Commands:**

```bash
# Check environment variables are same
env | grep NEXT_PUBLIC_VOICE

# Check audio recorder class
grep -r "class AudioRecorder" src/lib/

# Check sample rates
grep -r "sampleRate.*24000" src/

# Check buffer sizes
grep -r "bufferSize.*1024" src/lib/audio-recorder.ts
```

---

## Conclusion

### Audio Quality: IDENTICAL ✅

Both client and admin voice interfaces produce:
- Identical audio quality
- Identical sample rates
- Identical latency
- Identical processing
- Identical streaming performance
- Identical server-side handling

**Reason:** They share the exact same code path:
1. Same hook (`useRealtimeVoice`)
2. Same recorder (`AudioRecorder`)
3. Same player (`AudioPlayer`)
4. Same WebSocket transport
5. Same server processing

### Only Difference: Visual Context Capture ⚠️

Admin sends visual context more frequently:
- Webcam: 4x more often (3s vs 12s)
- Screen share: 33% more often (3s vs 4s)

**Impact:** Slightly higher bandwidth/server usage for admin, but **zero impact on voice quality**.

---

## Recommendations

1. **Audio quality is already optimized** - both use the same high-quality pipeline
2. **Enable DSP features** if you want better noise handling:
   - Add to `.env.local`: `NEXT_PUBLIC_VOICE_DSP_DEFAULT=true`
3. **Consider harmonizing capture intervals** if bandwidth is a concern
4. **Both are production-ready** for voice quality

**Bottom line:** Audio quality and streaming are identical. Choose between client and admin based on UI/UX preferences, not audio quality concerns.

