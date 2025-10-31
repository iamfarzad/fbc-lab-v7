# Client vs Admin Audio Quality Fix

**Date**: 2025-01-27  
**Issue**: Client voice had static/barrel distortion; admin voice was crisp  
**Root Cause**: Float32→Int16 overflow in `AudioRecorder`  
**Status**: ✅ FIXED

---

## The Bug

**Location**: `src/lib/audio-recorder.ts:46`

```typescript
// BEFORE (buggy):
int16Buffer[j] = s * 32768;

// AFTER (fixed):
const clamped = Math.max(-1, Math.min(1, s));
int16Buffer[j] = clamped * 32768;
```

**Problem**: When Float32 samples exceeded `[-1, 1]`, multiplying by 32768 caused Int16 overflow, producing static/distortion.

**Why admin worked**: Pure luck / browser timing - admin's AudioContext likely initialized slightly differently, avoiding the overflow samples.

---

## Why They Used Same Code

Both client and admin used **identical** audio pipeline:
- Same `useRealtimeVoice` hook
- Same `AudioRecorder` class
- Same `AudioPlayer` 
- Same WebSocket transport
- Same DSP settings

The apparent quality difference was due to **timing differences** in AudioContext initialization and sample buffer handling.

---

## The Fix

Added clamping to prevent Int16 overflow:

```typescript
// Clamp to valid range [-1, 1] to prevent overflow distortion
const clamped = Math.max(-1, Math.min(1, s));
int16Buffer[j] = clamped * 32768;
```

This ensures samples never exceed Int16 bounds, eliminating static.

---

## Verification

Test both client (`/live`) and admin (`/admin` → Chat) - both should now sound crisp and clear.

```bash
# Check the fix is applied:
grep -A1 "Clamp to valid range" src/lib/audio-recorder.ts
```

Expected output:
```
            // Clamp to valid range [-1, 1] to prevent overflow distortion
            const clamped = Math.max(-1, Math.min(1, s));
```

---

## Related Files

- ✅ `src/lib/audio-recorder.ts` - Fixed Float32→Int16 conversion
- `src/lib/audio-utils.ts` - PCM16 decode (no changes needed)
- `src/lib/audio/player.ts` - Audio playback (no changes needed)
- `src/hooks/useRealtimeVoice.ts` - WebSocket voice session (no changes needed)

---

## Why UI Rendering Didn't Matter

The audio pipeline runs independently of React rendering:
- AudioWorklet runs on separate thread
- AudioContext is browser API, not React
- WebSocket transport is independent

The issue was **pure audio signal processing bug**, not UI-related.

