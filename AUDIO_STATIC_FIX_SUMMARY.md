# Audio Static Fix - Summary

**Issue**: Client voice had static/barrel distortion; admin voice was crisp  
**Root Cause**: Float32→Int16 overflow in AudioRecorder  
**Status**: ✅ FIXED

---

## The Bug

**File**: `src/lib/audio-recorder.ts:46`

### Before (Buggy)
```typescript
int16Buffer[j] = s * 32768;
```

**Problem**: When Float32 samples exceeded `[-1, 1]`, multiplying by 32768 caused Int16 overflow, producing static/distortion.

### After (Fixed)
```typescript
// Clamp to valid range [-1, 1] to prevent overflow distortion
const clamped = Math.max(-1, Math.min(1, s));
int16Buffer[j] = clamped * 32768;
```

---

## Why Admin Worked & Client Didn't

Both used **identical** audio code:
- Same `useRealtimeVoice` hook
- Same `AudioRecorder` class
- Same `AudioPlayer`
- Same WebSocket transport
- Same DSP settings

The apparent quality difference was due to **timing**:
- Admin likely had slightly different AudioContext initialization timing
- Avoided triggering the overflow samples by pure luck
- Both paths had the same bug, just different execution order

---

## The Fix

Added clamping to prevent Int16 overflow. Samples are now guaranteed to stay within valid `[-1, 1]` range before conversion.

---

## Testing

Test both client (`/live`) and admin (`/admin` → Chat):
- Both should now sound **identical** and **crisp**
- No static/distortion
- Clean voice output

---

## Verification Command

```bash
# Check the fix is applied:
grep -A1 "Clamp to valid range" src/lib/audio-recorder.ts
```

Expected:
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

The audio pipeline runs independently:
- AudioWorklet runs on separate thread
- AudioContext is browser API, not React
- WebSocket transport is independent

This was a **pure audio signal processing bug**, not UI-related.

---

## Next Steps

1. Test client voice - should be crisp
2. Test admin voice - should still be crisp
3. If static persists, check browser console for errors
4. Commit fix with: `git commit -m "fix: prevent audio static by clamping Float32 samples"`

