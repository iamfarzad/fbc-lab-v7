# Voice Orchestrator Integration - Manual Testing Guide

## Setup

1. Start the development environment:
   ```bash
   pnpm dev:all
   ```
   - Next.js on port 3000
   - WebSocket server on port 3001

2. Open the app in your browser: `http://localhost:3000`

3. Open browser DevTools Console (F12) to monitor logs

## Test Scenarios

### Test 1: First Milestone Sync (Turn 3)

**Steps:**
1. Accept terms if prompted
2. Start a voice session (click voice button)
3. Have **3 conversation turns** covering discovery categories:
   - Turn 1: "I want to improve my sales process" (goals category)
   - Turn 2: "Our main pain point is manual data entry" (pain category)
   - Turn 3: "Data is stored in spreadsheets" (data category)

**Expected Results:**
- ✅ After turn 3 (when model finishes responding), you should see:
  - Server console: `🔢 Voice turn completed (turn 3)`
  - Server console: `🎯 Milestone reached (turn 3), syncing to orchestrator...`
  - Server console: `✅ Voice synced to orchestrator: Discovery Agent (DISCOVERY)`
- ✅ Browser console shows: `🎯 Agent stage update: Discovery Agent (DISCOVERY)`
- ✅ Brief "F.B/c AI is analyzing..." notification may appear

**How Turn Tracking Works:**
- Turns are tracked when the model sends `turnComplete` (finishes responding)
- Each turn = one user utterance + one model response
- Turn count increments after each model response completes

**Verify in Console:**
```javascript
// Look for these log messages in server terminal:
"[connectionId] 🔢 Voice turn completed (turn 3)"
"[connectionId] 🎯 Milestone reached (turn 3), syncing to orchestrator..."
"[connectionId] ✅ Voice synced to orchestrator: Discovery Agent (DISCOVERY)"

// Browser console should show:
"🎯 Agent stage update: Discovery Agent (DISCOVERY)"
```

### Test 2: Second Milestone Sync (Turn 8)

**Steps:**
1. Continue the voice conversation from Test 1
2. Add **5 more turns** (turns 4-8):
   - Turn 4: "We're not ready yet" (readiness category)
   - Turn 5: "Budget is around 50k" (budget category)
   - Turns 6-8: Any additional conversation

**Expected Results:**
- ✅ At turn 8 (when model finishes responding):
  - Server console: `🔢 Voice turn completed (turn 8)`
  - Server console: `🎯 Milestone reached (turn 8), syncing to orchestrator...`
- ✅ Orchestrator synced again with updated stage

**Verify:**
```bash
# Server console should show sync at turn 8:
"[connectionId] 🔢 Voice turn completed (turn 8)"
"[connectionId] 🎯 Milestone reached (turn 8), syncing to orchestrator..."
```

### Test 3: Stage Transition Detection

**Steps:**
1. Continue conversation with **5 more turns** (turns 9-13)
2. Cover all discovery categories to trigger stage progression
3. Listen for stage updates in logs

**Expected Results:**
- ✅ Stage should progress from DISCOVERY → SCORING → (possibly) SALES
- ✅ Agent status shows different agents as stage changes
- ✅ Console logs show stage progression

### Test 4: Final Sync on Session End

**Steps:**
1. Have a conversation with at least 3+ turns
2. End the voice session (click stop button)

**Expected Results:**
- ✅ Server console shows: `[connectionId] Final orchestrator sync before session end...`
- ✅ Final orchestrator sync completes
- ✅ Conversation state persisted to database

**Verify:**
```bash
# Server console should show:
"[connectionId] Final orchestrator sync before session end..."
"[connectionId] ✅ Voice synced to orchestrator: [Agent] ([Stage])"
```

### Test 5: Database Persistence

**Steps:**
1. Complete a voice session with 5+ turns
2. Wait for orchestration sync to complete
3. Check database

**Expected Results:**
- ✅ `conversation_flow` updated with category coverage
- ✅ `last_agent` shows which agent handled the session
- ✅ `last_stage` shows current funnel stage
- ✅ `intelligence_context` contains flow metadata

**Verify in Supabase:**
```sql
SELECT 
  session_id,
  last_agent,
  last_stage,
  conversation_flow,
  intelligence_context,
  updated_at
FROM conversation_contexts
WHERE session_id = '<your-session-id>'
ORDER BY updated_at DESC
LIMIT 1;
```

### Test 6: Error Handling (Non-Blocking)

**Steps:**
1. Start voice session
2. Simulate orchestrator error (stop database temporarily)
3. Continue voice conversation

**Expected Results:**
- ✅ Voice session continues normally
- ✅ User sees no errors
- ✅ Server console shows: `Voice orchestrator sync failed: [error]`
- ✅ No interruption to audio streaming

## Success Criteria

### ✅ All Tests Pass If:

1. **Milestone Triggers Work:**
   - Sync happens at turns 3, 8, 13, etc.
   - Console logs confirm milestone detection

2. **Stage Updates Visible:**
   - "F.B/c AI is analyzing..." appears briefly
   - Automatically disappears after 2 seconds
   - Shows correct agent name in console

3. **No Latency Impact:**
   - Voice responses remain instant (<500ms)
   - No audio glitches or interruptions
   - Sync happens in background

4. **Persistence Works:**
   - Conversation flow saved to database
   - Stage progression tracked correctly
   - Final sync on session end completes

5. **Error Handling Robust:**
   - Voice continues if orchestrator fails
   - Errors logged but don't surface to user
   - No blocking errors in console

## Common Issues & Troubleshooting

### Issue: No orchestrator sync logs
**Solution:** 
- Verify sessionId is not 'anonymous'
- Check that `turnComplete` events are being received (look for `🔄 Cleared turn completion timer`)
- Verify `🔢 Voice turn completed (turn X)` logs appear
- Confirm milestone logic triggers at turns 3, 8, 13, etc.
- Check that `syncVoiceToOrchestrator` function is imported correctly

### Issue: Agent status not appearing
**Solution:**
- Check STAGE_UPDATE message type is sent
- Verify handler in useRealtimeVoice
- Confirm live.agentStatus is exported

### Issue: Database not updating
**Solution:**
- Check agent persistence service is working
- Verify ContextStorage connection
- Check for version conflicts in optimistic locking

### Issue: Voice session interrupted
**Solution:**
- Check all syncs are non-blocking (no await)
- Verify error handling wraps all sync calls
- Check for unhandled promise rejections

## What to Document

When running these tests, document:

1. **Console Logs:** Screenshot or copy all relevant server logs
2. **Browser Console:** Capture agent update messages
3. **Database State:** Show before/after database values
4. **Any Errors:** Even if non-blocking, log them
5. **Performance:** Note any latency or audio issues

## Next Steps After Testing

If all tests pass:
- Mark voice integration as complete
- Update BACKEND_PIPELINE_ANALYSIS.md
- Move to next priority item

If issues found:
- Document specific failures
- Check logs for error patterns
- Review sync implementation
- Fix issues and re-test

