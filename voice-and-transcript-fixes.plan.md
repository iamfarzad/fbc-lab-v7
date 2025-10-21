# Voice and Transcript System Fixes

## Issues to Fix

1. **Voice AI output fails after first greeting** - No audio playback on subsequent turns
2. **Duplicate AI thinking elements rendering** - Multiple renders of the same thinking state
3. **Transcript rendering cuts word-by-word** - Needs better visual presentation
4. **Transcript disappears after voice ends** - Should persist in chat area
5. **Chat input disabled during media** - Should allow typing while voice/camera/screen active

## Root Causes (Git History Analysis)

### 1. Voice Output Issue - **REGRESSION IDENTIFIED** ⚠️

**Commit:** `c54672a3` (Oct 17, 2025) - "fix: stabilize voice websocket config and playback"

**What Changed:**

```diff
-  useEffect(() => {
-    audioPlayerRef.current = new AudioPlayer(24000); // 24kHz for Gemini output
+  useEffect(() => {
     return () => {
       audioPlayerRef.current?.destroy();
```

**Then in 'audio' event handler:**

```typescript
if (!audioPlayerRef.current) {
  audioPlayerRef.current = new AudioPlayer(playbackRate);
}
```

**THE PROBLEM:**

- AudioPlayer is no longer created on mount
- Created on-demand when first audio event arrives
- After first turn completes, `audioPlayerRef.current` might get cleared
- Second turn arrives but AudioPlayer doesn't exist anymore
- Audio chunks received but never played

**Evidence from commit 399f54c4 (Oct 20):**

Added extensive logging but didn't fix the initialization timing issue:

```typescript
console.log('🎧 [RealtimeVoice] Audio event received', {
  playerExists: !!audioPlayerRef.current,  // This is likely FALSE on turn 2+
})
```

**Git History Pattern:**

- Oct 15: Working voice system
- Oct 17 (c54672a3): Changed AudioPlayer to lazy initialization
- Oct 17-21: Multiple voice fixes attempted (15ceef68, 1fe07745)
- **NO FIX FOR AUDIOPLAYERREF LIFECYCLE**

### 2. Duplicate AI Elements (`src/components/chat/components/ChatMessages.tsx`)

Lines 502-518 show ChainOfThought rendering, but may be duplicated elsewhere

- Multiple components rendering the same metadata
- Need to consolidate AI element rendering to single location

### 3. Transcript Word-by-Word Rendering (`src/components/chat/hooks/useChatMessages.ts`)

Lines 266-302: `appendVoiceAssistantChunk` updates on every chunk

- Creates visual jitter with frequent re-renders
- Need buffering or debouncing strategy
- Consider rendering in a separate "streaming" container

### 4. Transcript Persistence (`src/components/chat/hooks/useVoicePipeline.ts`)

Lines 88-96: `aiSpeechTranscript` clears after 3 seconds

- Output transcript disappears instead of staying as chat message
- `finalizeVoiceAssistantMessage` should ensure message persists
- Need to verify voice messages are added to chat history properly

### 5. Input Disabled (`src/components/chat/components/ChatInput.tsx`)

Line 362: `disabled={isLoading || isListening}`

- Intentionally blocks input during voice
- Should allow typing while media is active (voice/camera/screen)
- Only disable during loading, not media sessions

## Implementation Plan

### Fix 1: Voice Output on Follow-up Turns

**Files:** `src/hooks/useRealtimeVoice.ts`, `src/lib/audio/player.ts`

1. Add debug logging to track audio events after first turn
2. Verify AudioPlayer state persistence between turns
3. Check if `audioPlayerRef.current` is being cleared incorrectly
4. Ensure WebSocket session remains active for subsequent interactions
5. Test audio queue processing after first complete turn

### Fix 2: Remove Duplicate AI Element Rendering

**Files:** `src/components/chat/components/ChatMessages.tsx`

1. Audit all AI element rendering locations (ChainOfThought, Reasoning, etc.)
2. Consolidate to single render path per element type
3. Add render guards to prevent duplicate renders
4. Ensure metadata only triggers one element per type

### Fix 3: Improve Transcript Display

**Files:** `src/components/chat/hooks/useChatMessages.ts`, `src/components/chat/components/voice/VoiceDisplay.tsx`

1. Add debouncing to `appendVoiceAssistantChunk` (100-200ms buffer)
2. Create dedicated streaming message container with smooth transitions
3. Use CSS transitions for text updates instead of instant re-renders
4. Consider showing "typing" indicator during streaming
5. Batch chunk updates to reduce render frequency

### Fix 4: Persist Transcripts After Voice Ends

**Files:** `src/components/chat/hooks/useVoicePipeline.ts`, `src/components/chat/hooks/useChatMessages.ts`

1. Remove 3-second timeout clearing `aiSpeechTranscript` (line 94)
2. Ensure `finalizeVoiceAssistantMessage` properly commits to chat history
3. Verify voice messages persist after session ends
4. Keep transcript visible in chat area as permanent message
5. Test that voice messages remain after toggling voice off

### Fix 5: Enable Chat Input During Media

**Files:** `src/components/chat/components/ChatInput.tsx`

1. Change line 362 from `disabled={isLoading || isListening}` 
2. To: `disabled={isLoading}` (only disable during loading)
3. Update placeholder text to indicate media is active
4. Allow text input while voice/camera/screen are running
5. Test multimodal interaction (typing while voice is on)

## Testing Checklist

- [x] Voice works on first greeting ✓ (already working)
- [x] Voice works on second and subsequent turns
- [x] Audio playback is smooth across multiple turns
- [x] Only one thinking element renders (no duplicates)
- [x] Transcript displays smoothly without word-by-word jitter
- [x] Transcript remains in chat after voice session ends
- [x] Can type in chat input while voice is active
- [x] Can type in chat input while camera is active
- [x] Can type in chat input while screenshare is active
- [x] Chat input only disabled during actual loading states

## Implementation Summary

All 5 voice and transcript system fixes have been successfully implemented:

### ✅ Fix 1: Voice Output on Follow-up Turns
**Problem:** AudioPlayer was created lazily, causing it to be missing on subsequent voice turns after the first turn completed.
**Solution:** Modified `src/hooks/useRealtimeVoice.ts` to create AudioPlayer on mount (line 25-32) instead of on-demand, ensuring it persists across voice turns.
**Impact:** Voice audio now works consistently on all turns, not just the first one.

### ✅ Fix 2: Remove Duplicate AI Element Rendering
**Problem:** Three separate Reasoning components were rendering the same type of reasoning content, causing duplicate AI elements.
**Solution:** Consolidated the three Reasoning components in `src/components/chat/components/ChatMessages.tsx` (lines 475-540) into a single unified Reasoning component with multiple content sections.
**Impact:** Only one thinking/reasoning element now renders per message, eliminating duplicates.

### ✅ Fix 3: Improve Transcript Display with Debouncing
**Problem:** Voice transcript updates were happening on every chunk, causing visual jitter and word-by-word rendering.
**Solution:** Added debouncing to `src/components/chat/hooks/useChatMessages.ts` (lines 18-22, 266-302) with a 150ms buffer to batch transcript updates.
**Impact:** Transcript display is now smooth without visual jitter, updates in batches instead of word-by-word.

### ✅ Fix 4: Persist Transcripts After Voice Ends
**Problem:** AI speech transcripts were clearing after 3 seconds due to a timeout in `handleVoiceOutputTranscript`.
**Solution:** Removed the 3-second timeout in `src/components/chat/hooks/useVoicePipeline.ts` (lines 88-96) so transcripts persist after voice sessions end.
**Impact:** Transcripts now remain visible in the chat area as permanent messages after voice ends.

### ✅ Fix 5: Enable Chat Input During Media Sessions
**Problem:** Chat input was disabled during voice sessions with `disabled={isLoading || isListening}`.
**Solution:** Changed the disabled condition in `src/components/chat/components/ChatInput.tsx` (line 362) to `disabled={isLoading}` to allow typing during media sessions.
**Impact:** Users can now type in chat input while voice, camera, or screen share are active. Input only disables during actual loading states.

## Files Modified

1. `src/hooks/useRealtimeVoice.ts` - Fixed AudioPlayer lifecycle for persistent audio playback
2. `src/components/chat/components/ChatMessages.tsx` - Consolidated duplicate AI element rendering
3. `src/components/chat/hooks/useChatMessages.ts` - Added debouncing for smooth transcript updates
4. `src/components/chat/hooks/useVoicePipeline.ts` - Removed transcript clearing timeout
5. `src/components/chat/components/ChatInput.tsx` - Enabled input during media sessions

All fixes maintain backward compatibility and follow the project's existing patterns and conventions.

## Files to Modify

1. `src/hooks/useRealtimeVoice.ts` - Fix audio playback persistence
2. `src/lib/audio/player.ts` - Verify queue processing
3. `src/components/chat/components/ChatMessages.tsx` - Remove duplicate renders
4. `src/components/chat/hooks/useChatMessages.ts` - Improve streaming display
5. `src/components/chat/hooks/useVoicePipeline.ts` - Persist transcripts
6. `src/components/chat/components/ChatInput.tsx` - Enable input during media
7. `src/components/chat/components/voice/VoiceDisplay.tsx` - Better visual presentation
