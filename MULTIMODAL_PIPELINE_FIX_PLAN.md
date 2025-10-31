# Multimodal Pipeline Fix Plan (Git History Analysis)

**Date:** 2025-01-17  
**Analysis:** Comprehensive git history review + codebase analysis

---

## Executive Summary

After analyzing git commit history and branches, I've identified:
- **7 critical issues** with specific fixes from history
- **1 unmerged branch** (`fix/cross-modal-context-sharing`) with working improvements
- **Duplicate context fetching** causing performance issues
- **Historical decisions** that must be respected (auto-injection was intentionally removed)

---

## Git History Findings

### Key Commits

1. **`2a3d0296`** - "Unify conversation storage for cross-modal context sharing"
   - Attempted webcam context integration
   - Enhanced voice context loading (10 msgs, modality labels)
   - **NOT FULLY MERGED** - webcam route fix missing

2. **`981a4ccc`** - "Store visual context locally instead of auto-sending to Live API"
   - **REMOVED** automatic context injection (too intrusive)
   - Decision: Only inject when user explicitly asks
   - **Must respect this decision** - don't re-add aggressive auto-injection

3. **`282e137a`** - "Use sendRealtimeInput for context updates"
   - Fixed incorrect API calls (`send()` doesn't exist)
   - Correct method: `sendRealtimeInput()`

4. **`4859990b`** - "Implement visual context injection for Live API"
   - Added visual context injection
   - Later reverted by 981a4ccc

5. **`4347f79d`** - "Unify live session context and consolidate chat system"
   - Major refactor that consolidated components
   - May have introduced some current issues

### Unmerged Branch

**`origin/fix/cross-modal-context-sharing`**
- Has webcam context integration fixes
- Enhanced voice context loading
- Better conversation history formatting
- **Not merged to main** - likely due to conflicts

---

## Issues Identified

### 1. Webcam Missing Context Integration ⚠️ **CRITICAL**

**Current State:**
- `app/api/tools/webcam/route.ts` does NOT call `addVisualAnalysis()`
- Analysis results never stored in multimodal context
- Chat and voice can't see webcam analyses

**Fix from Branch:**
- Add `multimodalContextManager.addVisualAnalysis()` after analysis
- Get `sessionId` from headers
- Match pattern from screen route

**Files:**
- `app/api/tools/webcam/route.ts` (missing ~10 lines)

---

### 2. Duplicate Context Calls ⚠️ **CRITICAL**

**Current State:**
- `prepareChatContext()` called TWICE:
  - `app/api/chat/unified/route.ts:888`
  - `src/core/agents/orchestrator.ts:105`
- Wastes ~200-500ms per request

**Fix:**
- Call once in unified route
- Pass result via `AgentContext.multimodalContext`
- Orchestrator uses provided context

**Files:**
- `app/api/chat/unified/route.ts` (keep call)
- `src/core/agents/orchestrator.ts` (remove duplicate, use provided)

---

### 3. Voice Context Too Limited ⚠️ **HIGH**

**Current State:**
- Only loads 6 text messages
- No visual/upload context included
- No modality labels

**Fix from Branch:**
- Increase to 10 messages
- Include visual/audio/video with labels `[VOICE]`, `[VISUAL]`, `[VIDEO]`
- Better formatting

**Files:**
- `server/live-server.ts:242-273` - `loadConversationHistory()`

**Note:** Consider using `prepareChatContext()` but be careful not to auto-inject (981a4ccc)

---

### 4. Semantic Search Performance ⚠️ **HIGH**

**Current State:**
- Runs on every chat request if embeddings enabled
- Blocks response (synchronous)
- No caching
- No timeout

**Fix:**
- Make async/background
- Cache results (30s TTL)
- Add 5s timeout
- Only run if query provided

**Files:**
- `src/core/context/multimodal-context.ts:828-834`

---

### 5. Context Injection Too Aggressive ⚠️ **MEDIUM**

**Current State:**
- Auto-injection was removed (981a4ccc) but may still be too frequent
- Debounce is 8s for webcam, 12s for screen
- May interrupt conversations

**Fix:**
- Respect historical decision (no aggressive auto-injection)
- Increase debounce to 15s screen, 10s webcam
- Add injection queue
- Track what was sent (prevent duplicates)

**Files:**
- `server/live-server.ts:354-451` - `handleContextUpdate()`

---

### 6. Screen Analysis Quality ⚠️ **MEDIUM**

**Current State:**
- May inject stale analyses
- No validation against previous
- Hallucinations possible

**Fix:**
- Validate analysis changed (>50 chars)
- Only inject if < 30s old
- Compare analysis hash to prevent duplicates

**Files:**
- `app/api/tools/screen/route.ts:177-186`

---

### 7. Chat Slow / Rendering Issues ⚠️ **LOW**

**Needs Investigation:**
- May be semantic search blocking
- May be duplicate context calls
- May be streaming configuration

**Fix:**
- Test after fixing phases 2 & 4
- Verify `streamText` works correctly
- Check tool call rendering

---

## Implementation Plan

### Phase 1: Webcam Context (Quick Win)
1. Merge fix from branch or add manually
2. Add `addVisualAnalysis()` call
3. Test: Webcam → Chat sees analysis

### Phase 2: Remove Duplicates (Performance)
1. Remove `prepareChatContext` from orchestrator
2. Pass context from unified route
3. Test: Measure response time improvement

### Phase 3: Optimize Semantic Search (Performance)
1. Make async/background
2. Add caching
3. Add timeout
4. Test: Response time improvement

### Phase 4: Enhance Voice Context (Functionality)
1. Merge improvements from branch
2. Increase messages, add labels
3. Test: Voice sees visual context

### Phase 5: Fix Injection Issues (Reliability)
1. Increase debounce times
2. Add injection queue
3. Track sent items
4. Test: No conversation interruption

### Phase 6: Improve Analysis Quality (Quality)
1. Add validation
2. Prevent stale injection
3. Test: Better analyses, no hallucinations

### Phase 7: Verify Chat Rendering (Testing)
1. Test streaming works
2. Test tool calls render
3. Fix if needed

---

## Historical Decisions to Respect

1. **Auto-injection removed** (981a4ccc) - Don't re-add aggressive injection
2. **Use `sendRealtimeInput`** (282e137a) - Correct API method
3. **Store context locally** - Context stored, not auto-sent

---

## Git References

- Branch: `origin/fix/cross-modal-context-sharing`
- Key commits: `2a3d0296`, `981a4ccc`, `282e137a`, `4859990b`, `4347f79d`
- Unmerged: Webcam context fix, enhanced voice loading

---

## Risk Assessment

**Low Risk:**
- Phase 1 (Webcam) - Simple addition
- Phase 2 (Duplicates) - Clean removal
- Phase 4 (Voice) - Merge existing code

**Medium Risk:**
- Phase 3 (Semantic) - Needs careful async handling
- Phase 5 (Injection) - Must not break existing flow

**High Risk:**
- Phase 6 (Quality) - Analysis changes may affect behavior

---

## Testing Checklist

After each phase:
- [ ] Webcam analysis appears in chat
- [ ] Context calls reduced (check logs)
- [ ] Response time improved
- [ ] Voice sees visual context
- [ ] No conversation interruption
- [ ] Screen analyses accurate
- [ ] Chat renders fully




