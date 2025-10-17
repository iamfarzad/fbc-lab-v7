# End-to-End Testing Guide - Persistent Multimodal Context

**Test Date:** [To be filled]  
**Tester:** [Your name]  
**Environment:** Development / Production

---

## Pre-Test Setup

### 1. Start Development Environment

```bash
cd /Users/farzad/fbc_lab_v7
pnpm dev:all:clean
```

**Expected:**
```
✓ Next.js server running on http://localhost:3000
✓ WebSocket server running on ws://localhost:3001
✓ Redis connected (Upstash)
✓ Supabase connected
```

### 2. Verify Migrations

Check Supabase Dashboard → SQL Editor → Run:

```sql
-- Verify tables exist
SELECT COUNT(*) FROM wal_log;
SELECT COUNT(*) FROM audit_log;
SELECT * FROM conversation_contexts LIMIT 1; -- Check pdf_url column exists

-- Verify storage bucket
SELECT * FROM storage.buckets WHERE id = 'conversation-pdfs';
```

**Expected:** All queries succeed (0 rows is fine for empty tables)

### 3. Clear Test Data (if needed)

```bash
# Clear Redis cache
curl -X DELETE http://localhost:3000/api/admin/clear-cache

# Or in Upstash console: flush all keys with prefix "fbc_cache:multimodal:"
```

---

## Test Suite

### Test 1: Basic Redis Persistence ✅

**Objective:** Verify context survives server restart

**Steps:**
1. Open http://localhost:3000
2. Accept terms: Name="Test User", Email="test@example.com"
3. Send 5 text messages
4. Check logs for: `✅ Context saved to Redis: session_xxx`
5. **Kill server** (Ctrl+C in terminal)
6. **Restart server** (`pnpm dev:all`)
7. Refresh browser page

**Expected:**
- [ ] Messages still visible after restart
- [ ] Console shows: `✅ Context loaded from Redis: session_xxx`
- [ ] Can continue conversation seamlessly

**Troubleshooting:**
- If messages lost → Check Redis env vars
- If "Redis save failed" → Check Upstash dashboard for quota/errors

---

### Test 2: Write-Ahead Logging ✅

**Objective:** Verify WAL provides data reliability

**Steps:**
1. Open http://localhost:3000
2. Accept terms
3. Have a 10-message conversation
4. Check Supabase → wal_log table

**Expected:**
- [ ] wal_log has ~10 entries (one per message)
- [ ] Each entry has: operation ('add_text'), payload (conversation entry), synced_at timestamp
- [ ] Console shows: `✅ WAL entry logged: add_text for session_xxx`
- [ ] Console shows: `✅ WAL synced to Supabase: [id]`

**Query:**
```sql
SELECT operation, COUNT(*) 
FROM wal_log 
WHERE session_id = 'your_session_id'
GROUP BY operation;
```

---

### Test 3: Voice Transcripts Persistence ✅

**Objective:** Verify voice is logged to WAL and context

**Steps:**
1. Open http://localhost:3000
2. Accept terms
3. Type: "Hello"
4. Click "+" menu → "Start Voice"
5. Allow microphone access
6. Say: "Can you hear me? This is a test."
7. Wait for transcript to appear
8. Say 2-3 more sentences
9. Check logs and database

**Expected:**
- [ ] Voice transcripts appear in chat as user messages
- [ ] Console shows: `✅ WAL entry logged: add_voice for session_xxx`
- [ ] Console shows: `✅ Voice transcript stored in context`
- [ ] wal_log table has voice entries with operation='add_voice'
- [ ] Payload contains transcript text

**Query:**
```sql
SELECT payload->>'data'->>'transcript' as transcript
FROM wal_log 
WHERE session_id = 'your_session_id' 
  AND operation = 'add_voice';
```

---

### Test 4: Screen Share & Webcam Persistence ✅

**Objective:** Verify visual analyses are logged

**Steps:**
1. Continue from Test 3 (voice still active)
2. Click "+" menu → "Start Screen Share"
3. Select a window to share
4. Wait 2-3 seconds for capture
5. Click "+" menu → "Start Camera"
6. Wait for camera to initialize
7. Wave at camera
8. Check logs and database

**Expected:**
- [ ] Console shows: `📺 Screen frame streamed to Live API` (every 500ms)
- [ ] Console shows: `📹 Webcam frame streamed to Live API` (every 500ms)
- [ ] If using fallback: `✅ WAL entry logged: add_visual for session_xxx`
- [ ] wal_log table has visual entries (if legacy path used)

**Note:** Live API streaming doesn't use WAL (real-time path), but fallback analysis does.

---

### Test 5: File Upload Persistence ✅

**Objective:** Verify uploaded files are logged

**Steps:**
1. Continue conversation
2. Click paperclip icon in chat input
3. Upload a PDF file (any test document)
4. Wait for "File uploaded" message
5. Check logs and database

**Expected:**
- [ ] File preview appears in chat
- [ ] Console shows: `✅ WAL entry logged: add_upload for session_xxx`
- [ ] wal_log table has upload entry
- [ ] Payload contains filename, mimeType, size, analysis

**Query:**
```sql
SELECT 
  payload->>'filename' as filename,
  payload->>'mimeType' as type,
  payload->>'size' as size
FROM wal_log 
WHERE session_id = 'your_session_id' 
  AND operation = 'add_upload';
```

---

### Test 6: Auto-Summarization (Long Conversations) ✅

**Objective:** Verify automatic summarization at 50 messages

**Steps:**
1. Start new session
2. Accept terms
3. Send 50+ text messages (use bulk send script or manual)
4. Watch console at message 50

**Expected:**
- [ ] Console shows at message 50: `✅ Summarized conversation at 51 messages for session_xxx`
- [ ] Console shows: `✅ Summarized 50 messages into XXX characters`
- [ ] Next AI response includes summary in context

**To test AI sees summary:**
Ask after 50 messages: "What have we discussed so far?"  
AI should reference earlier topics (even those >30 messages back)

---

### Test 7: Inline PDF Summary Artifact ✅

**Objective:** Verify summary renders inline with GDPR notice

**Steps:**
1. Complete a conversation (10+ messages, use voice, upload file)
2. Click the file icon → "Download Summary"
3. Wait for summary to generate

**Expected:**
- [ ] Toast: "Generating conversation summary..."
- [ ] Console shows: `✅ Conversation archived`
- [ ] Summary artifact appears inline in chat
- [ ] Artifact shows:
  - [ ] Lead Information section
  - [ ] Session Overview (modalities used)
  - [ ] Voice Conversation Highlights (if voice was used)
  - [ ] Visual Context Analyzed (if screen/camera used)
  - [ ] Documents Shared (if files uploaded)
  - [ ] Conversation Highlights
- [ ] GDPR Privacy Notice visible with:
  - [ ] Orange alert box
  - [ ] Data Retained list (PDF summary, contact info, audit trail)
  - [ ] Data Deleted list (voice, screen, files, messages)
- [ ] Two buttons visible:
  - [ ] "Download PDF" button
  - [ ] "Email PDF" button (if email available)

---

### Test 8: PDF Download from Artifact ✅

**Objective:** Verify PDF generation and Supabase storage

**Steps:**
1. From Test 7, click "Download PDF" button in artifact
2. Wait for PDF to download
3. Check Supabase

**Expected:**
- [ ] Button shows "Generating PDF..."
- [ ] Console shows:
  ```
  🔄 Flushing WAL before PDF generation...
  📦 Loading multimodal context...
  📊 PDF data assembled: X messages, text, audio, image
  📤 Uploading PDF to Supabase Storage: session_xxx/timestamp.pdf
  ✅ PDF stored and database updated
  📋 Audit logged: pdf_generated
  ```
- [ ] PDF downloads to computer
- [ ] Open PDF and verify sections:
  - [ ] F.B/c logo and branding
  - [ ] Lead Information
  - [ ] Multimodal Interactions section (NEW)
  - [ ] Voice Conversation Excerpts (NEW)
  - [ ] Visual Context Analyzed (NEW)
  - [ ] Documents Shared (NEW)
  - [ ] Conversation Highlights
- [ ] Supabase Storage browser shows file in conversation-pdfs bucket
- [ ] conversation_contexts table updated with pdf_url
- [ ] audit_log has pdf_generated event

**Supabase Queries:**
```sql
SELECT session_id, pdf_url, pdf_generated_at 
FROM conversation_contexts 
WHERE session_id = 'your_session_id';

SELECT * FROM audit_log 
WHERE session_id = 'your_session_id' 
  AND event = 'pdf_generated';

-- Check storage
SELECT * FROM storage.objects 
WHERE bucket_id = 'conversation-pdfs' 
  AND name LIKE 'your_session_id%';
```

---

### Test 9: Email PDF from Artifact ✅

**Objective:** Verify PDF email functionality

**Steps:**
1. From Test 7/8, click "Email PDF" button
2. Wait for confirmation

**Expected:**
- [ ] Button shows "Sending..."
- [ ] Toast: "PDF sent to test@example.com"
- [ ] Email received with PDF attachment
- [ ] PDF in email matches downloaded version

**Note:** Requires Resend API key configured

---

### Test 10: PII Detection & Redaction ✅

**Objective:** Verify PII security in development mode

**Steps:**
1. Start new session
2. Type message: "My credit card is 4532-1234-5678-9010"
3. Type message: "My SSN is 123-45-6789"
4. Type message: "Call me at 555-123-4567"
5. Check logs and audit_log

**Expected (Development Mode):**
- [ ] Console shows: `⚠️ PII detected in message: creditCard`
- [ ] Console shows: `⚠️ PII detected in message: ssn`
- [ ] Console shows: `⚠️ PII detected in message: phone`
- [ ] Console shows: `📋 Audit logged: pii_detected for session_xxx`
- [ ] Messages NOT redacted in dev (shown as-is)
- [ ] audit_log table has pii_detected events

**Expected (Production Mode):**
- [ ] Same logs as dev
- [ ] Console shows: `🔒 PII redacted from message`
- [ ] Messages shown as: "My credit card is [REDACTED]"

**Query:**
```sql
SELECT event, details 
FROM audit_log 
WHERE session_id = 'your_session_id' 
  AND event = 'pii_detected';
```

---

### Test 11: GDPR Data Deletion API ✅

**Objective:** Verify complete data removal

**Steps:**
1. Complete Test 8 (have a full session with PDF)
2. Note the session_id and email
3. Run deletion API:

```bash
curl -X POST http://localhost:3000/api/data-deletion \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Expected Response:**
```json
{
  "deleted": 1,
  "items": [
    "memory:session_xxx",
    "redis:session_xxx",
    "conversation_contexts:session_xxx",
    "wal_log:session_xxx",
    "activities:session_xxx",
    "leads:session_xxx",
    "pdfs:session_xxx:1",
    "audit:session_xxx"
  ],
  "message": "All data deleted successfully for 1 session(s)"
}
```

**Verification:**
- [ ] conversation_contexts: No rows for session_id
- [ ] wal_log: No rows for session_id
- [ ] activities: No rows for session_id
- [ ] leads: No rows for email
- [ ] Storage: No PDFs in session_xxx folder
- [ ] audit_log: No rows for session_id (deleted after 1 second delay)

**Queries:**
```sql
-- All should return 0 rows
SELECT COUNT(*) FROM conversation_contexts WHERE session_id = 'your_session_id';
SELECT COUNT(*) FROM wal_log WHERE session_id = 'your_session_id';
SELECT COUNT(*) FROM audit_log WHERE session_id = 'your_session_id';
```

---

### Test 12: Archive on Disconnect ✅

**Objective:** Verify automatic archival when user disconnects

**Steps:**
1. Start new session
2. Accept terms
3. Start voice conversation
4. Say 5+ things (≥3 messages minimum for archival)
5. **Close browser tab** (don't stop voice properly)
6. Check server logs and Supabase

**Expected Server Logs:**
```
[connectionId] WebSocket closed. Code: 1001
[connectionId] 💾 Archiving conversation for session_xxx...
[connectionId] ✅ Conversation archived on disconnect
[connectionId] Session removed.
```

**Expected in Supabase:**
- [ ] conversation_contexts has row with full multimodal_context
- [ ] Context includes all voice transcripts
- [ ] audit_log has context_archived event

**Query:**
```sql
SELECT 
  session_id,
  email,
  multimodal_context->>'conversationHistory' as history_count,
  updated_at
FROM conversation_contexts 
WHERE session_id = 'your_session_id';
```

---

### Test 13: WAL Recovery (Disaster Recovery) ✅

**Objective:** Verify context can be recovered from WAL

**Steps:**
1. Start conversation
2. Send 10 messages (all types: text, voice, upload)
3. Verify wal_log has entries
4. **Kill server** mid-conversation (Ctrl+C)
5. In Supabase, verify wal_log has 10+ entries
6. Clear Redis cache (simulate Redis failure):
   - In Upstash console → flush keys for session
7. Restart server
8. Try to export PDF for that session

**Expected:**
- [ ] WAL recovery attempted
- [ ] Console shows: `✅ Recovered context from X WAL entries`
- [ ] PDF generation succeeds with full data
- [ ] All message types present in PDF

**Manual Recovery Test:**
```typescript
// In browser console
const response = await fetch('/api/recover-from-wal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sessionId: 'your_session_id' })
})
const data = await response.json()
console.log(data) // Should show recovered context
```

---

### Test 14: Terms & Privacy Policy Pages ✅

**Objective:** Verify legal documents are accessible

**Steps:**
1. Go to http://localhost:3000
2. Before accepting terms, click "Terms and Conditions" link
3. Click "Privacy Policy" link

**Expected:**
- [ ] /docs/terms-and-conditions opens in new tab
- [ ] Page shows full terms document
- [ ] All sections render correctly
- [ ] No console errors
- [ ] /docs/privacy-policy opens in new tab
- [ ] Privacy policy shows data retention table
- [ ] GDPR rights section visible

---

### Test 15: Complete User Journey (Full Pipeline) 🎯

**Objective:** Test entire flow from start to finish

**Duration:** ~15 minutes  
**Importance:** CRITICAL - This simulates real client interaction

#### Phase A: Initial Contact & Discovery (5 min)

1. **Open chat** at http://localhost:3000
2. **Accept terms:**
   - Name: "John Smith"
   - Email: "john.smith@testcorp.com"
   - Click links to verify terms/privacy open
   - Check "I agree" checkbox
   - Click "Continue"

3. **Expected:**
   - [ ] Terms card disappears
   - [ ] Suggestions appear
   - [ ] Console: Session initialized

4. **Discovery conversation** (type these):
   - "What can you do?"
   - "I'm looking for help with AI strategy"
   - "We're a mid-size fintech company"
   - "Our main challenge is customer support automation"
   - "Budget is around $50k"

5. **Expected:**
   - [ ] AI responses personalized
   - [ ] Google Grounding research triggered (if keywords detected)
   - [ ] Each message logged: `✅ WAL entry logged: add_text`
   - [ ] Context saved: `✅ Context saved to Redis`

#### Phase B: Multimodal Interaction (5 min)

6. **Enable voice:**
   - Click "+" menu → "Start Voice"
   - Allow mic access
   - Say: "Can you hear me clearly?"
   - Say: "I want to show you our current dashboard"
   - Say: "Let me share my screen"

7. **Expected:**
   - [ ] Voice transcripts appear as user messages
   - [ ] AI responds with voice
   - [ ] Console: `✅ WAL entry logged: add_voice`

8. **Share screen:**
   - Click "+" menu → "Start Screen Share"
   - Select your IDE or browser window
   - Wait 2-3 seconds
   - Say: "Can you see my screen?"

9. **Expected:**
   - [ ] AI confirms seeing screen
   - [ ] AI describes what's visible
   - [ ] Console: `📺 Screen frame streamed to Live API`

10. **Upload document:**
    - Click paperclip icon
    - Upload any PDF file (e.g., README.md exported as PDF)
    - Wait for upload to complete

11. **Expected:**
    - [ ] File preview appears
    - [ ] Analysis shows: "PDF document with X pages"
    - [ ] Console: `✅ WAL entry logged: add_upload`

#### Phase C: Conversation Summary & Archive (5 min)

12. **Generate summary:**
    - Click file icon (Next Steps menu)
    - Click "Download Summary"
    - Wait for artifact to appear

13. **Expected:**
    - [ ] Toast: "Generating conversation summary..."
    - [ ] Toast: "✅ Conversation archived"
    - [ ] Summary artifact appears inline in chat
    - [ ] Artifact contains:
      - [ ] Your name, email, company
      - [ ] Modalities Used: text, audio, image
      - [ ] Voice Conversation Highlights section with your voice transcripts
      - [ ] Visual Context Analyzed section (screen: 1+, webcam: 1+)
      - [ ] Documents Shared section with filename
      - [ ] Conversation Highlights (last 10 exchanges)
    - [ ] GDPR Privacy Notice visible with orange alert
    - [ ] Data Retained list shown
    - [ ] Data Deleted list shown
    - [ ] Two buttons: "Download PDF" and "Email PDF"

14. **Download PDF:**
    - Click "Download PDF" button in artifact
    - Wait for download

15. **Expected:**
    - [ ] Button shows "Generating PDF..."
    - [ ] PDF downloads to computer
    - [ ] Toast: "PDF downloaded successfully!"
    - [ ] Console shows:
      ```
      🔄 Flushing WAL before PDF generation...
      📦 Loading multimodal context...
      📊 PDF data assembled: X messages, text, audio, image
      📤 Uploading PDF to Supabase Storage
      ✅ PDF stored and database updated
      📋 Audit logged: pdf_generated
      ```

16. **Open downloaded PDF:**
    - Open the PDF file
    - Verify ALL sections present:
      - [ ] F.B/c logo (with orange 'c')
      - [ ] LEAD INFORMATION
      - [ ] MULTIMODAL INTERACTIONS ← NEW
      - [ ] Voice Conversation Excerpts ← NEW (shows your actual transcripts)
      - [ ] Visual Context Analyzed ← NEW (webcam: 1, screen: 1)
      - [ ] Documents Shared ← NEW (shows uploaded filename)
      - [ ] CONVERSATION HIGHLIGHTS
    - [ ] Voice transcripts readable
    - [ ] Screen/webcam analyses make sense
    - [ ] File metadata correct

17. **Email PDF (optional):**
    - Click "Email PDF" button in artifact
    - Check email inbox

18. **Expected:**
    - [ ] Toast: "PDF sent to john.smith@testcorp.com"
    - [ ] Email received with PDF attachment
    - [ ] PDF in email matches downloaded version

#### Phase D: Database Verification

19. **Check Supabase Dashboard:**

**conversation_contexts:**
```sql
SELECT 
  session_id,
  email,
  name,
  pdf_url,
  pdf_generated_at,
  (multimodal_context->>'conversationHistory')::jsonb AS history
FROM conversation_contexts 
WHERE email = 'john.smith@testcorp.com'
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected:**
- [ ] Row exists with your session
- [ ] pdf_url populated: `session_xxx/timestamp.pdf`
- [ ] pdf_generated_at has timestamp
- [ ] multimodal_context contains full conversation history, audioContext, visualContext, uploadContext

**wal_log:**
```sql
SELECT operation, COUNT(*) as count
FROM wal_log 
WHERE session_id = 'your_session_id'
GROUP BY operation;
```

**Expected:**
- [ ] add_text: ~10-15 entries
- [ ] add_voice: ~5-10 entries
- [ ] add_upload: ~1 entry
- [ ] add_visual: 0+ entries (depends on fallback usage)

**audit_log:**
```sql
SELECT event, details, timestamp 
FROM audit_log 
WHERE session_id = 'your_session_id'
ORDER BY timestamp DESC;
```

**Expected:**
- [ ] pdf_generated event
- [ ] context_archived event
- [ ] pii_detected events (if you tested PII)

**Storage:**
- [ ] Navigate to Storage → conversation-pdfs bucket
- [ ] Click on session_xxx folder
- [ ] PDF file visible
- [ ] Click to preview/download

---

### Test 16: Conversation Reset After Summary ✅

**Objective:** Verify memory cleanup works

**Steps:**
1. After generating PDF in Test 15
2. Check server logs
3. Inspect Redis
4. Start a new message in same chat

**Expected:**
- [ ] Context cleared from memory (if client closed)
- [ ] Redis cache still has context (1h TTL)
- [ ] New messages create fresh context
- [ ] Old context archived in Supabase

---

### Test 17: Terms Card Links ✅

**Objective:** Verify terms acceptance has working links

**Steps:**
1. Open fresh session (incognito mode)
2. Before accepting terms, inspect the checkbox label
3. Click "Terms and Conditions" link
4. Click "Privacy Policy" link

**Expected:**
- [ ] Label text reads: "I agree to the Terms and Conditions and Privacy Policy"
- [ ] Both links are blue and underlined
- [ ] Both links open in new tab
- [ ] Small text below shows GDPR notice
- [ ] Links work without activating checkbox

---

## Performance Benchmarks

Record these metrics during Test 15:

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Time to archive context | < 500ms | ___ ms | [ ] |
| Time to flush WAL | < 1000ms | ___ ms | [ ] |
| Time to generate summary text | < 5s | ___ s | [ ] |
| Time to generate PDF | < 10s | ___ s | [ ] |
| Time to upload PDF to Supabase | < 2s | ___ s | [ ] |
| Total time (click to download) | < 20s | ___ s | [ ] |
| PDF file size | < 500KB | ___ KB | [ ] |

---

## Failure Scenarios

### Scenario 1: Redis Unavailable

**Simulate:**
- Stop Upstash Redis or exhaust quota
- Start conversation

**Expected:**
- [ ] Console shows: `Redis save failed (non-fatal)`
- [ ] Conversation continues normally
- [ ] Context still works (in-memory only)
- [ ] PDF generation still succeeds

### Scenario 2: Supabase Unavailable

**Simulate:**
- Disconnect internet briefly during conversation
- Send messages

**Expected:**
- [ ] WAL writes succeed (Redis still available)
- [ ] Console shows: `❌ WAL sync failed for [id]`
- [ ] Pending writes queued
- [ ] When connection restores, background sync resumes

### Scenario 3: Both Redis & Supabase Down

**Simulate:**
- Block both connections

**Expected:**
- [ ] Console shows: `❌ WAL write failed`
- [ ] Error thrown (critical failure)
- [ ] User sees error message
- [ ] Graceful degradation (in-memory still works for session)

---

## Success Criteria Checklist

All tests must pass for production readiness:

### Infrastructure
- [ ] Redis persistence working
- [ ] Supabase archival working
- [ ] WAL functioning correctly
- [ ] All 3 migrations applied successfully

### Core Features
- [ ] Text messages persist
- [ ] Voice transcripts persist and appear in PDF
- [ ] Screen share analyses persist and appear in PDF
- [ ] File uploads persist and appear in PDF
- [ ] Auto-summarization at 50 messages
- [ ] Archive on disconnect

### PDF Generation
- [ ] Summary renders inline as artifact
- [ ] GDPR notice displays correctly
- [ ] PDF downloads successfully
- [ ] PDF contains ALL multimodal sections
- [ ] PDF stored in Supabase Storage
- [ ] conversation_contexts updated with pdf_url
- [ ] Email PDF works

### Security & Compliance
- [ ] PII detection working
- [ ] Audit logging functioning
- [ ] GDPR deletion API complete
- [ ] Terms & Privacy pages accessible
- [ ] Terms card has working links

### Performance
- [ ] Total PDF generation < 20 seconds
- [ ] No UI freezing during operations
- [ ] All operations non-blocking
- [ ] Error handling graceful

---

## Test Results Template

```
Test Date: _____________
Tester: _____________
Environment: Development / Production
Git Commit: _____________

Test 1 (Redis Persistence): PASS / FAIL - Notes: ___________
Test 2 (WAL): PASS / FAIL - Notes: ___________
Test 3 (Voice): PASS / FAIL - Notes: ___________
Test 4 (Visual): PASS / FAIL - Notes: ___________
Test 5 (Upload): PASS / FAIL - Notes: ___________
Test 6 (Summarization): PASS / FAIL - Notes: ___________
Test 7 (Inline Artifact): PASS / FAIL - Notes: ___________
Test 8 (PDF Download): PASS / FAIL - Notes: ___________
Test 9 (Email PDF): PASS / FAIL - Notes: ___________
Test 10 (PII Detection): PASS / FAIL - Notes: ___________
Test 11 (GDPR Deletion): PASS / FAIL - Notes: ___________
Test 12 (Disconnect Archive): PASS / FAIL - Notes: ___________

Test 15 (Complete Journey): PASS / FAIL - Notes: ___________

Overall Status: PASS / FAIL
Production Ready: YES / NO
```

---

## Quick Smoke Test (5 minutes)

If you don't have time for full suite, run this minimal test:

```bash
# 1. Start dev
pnpm dev:all:clean

# 2. Open http://localhost:3000
# 3. Accept terms with real name/email
# 4. Type: "Hello, testing multimodal"
# 5. Start voice, say: "Can you hear me?"
# 6. Upload any PDF file
# 7. Click Download Summary → Wait for artifact
# 8. Click "Download PDF" in artifact
# 9. Open PDF and verify:
   - Multimodal Interactions section exists
   - Voice excerpt shows your transcript
   - Documents Shared shows your file
   
# 10. Check Supabase:
   - conversation_contexts has pdf_url
   - wal_log has entries
   - Storage has PDF file

# If all ✅ → Production ready!
```

---

## Troubleshooting Guide

### Issue: "WAL write failed"
**Cause:** Redis connection issue  
**Fix:** Check UPSTASH_REDIS_REST_URL env var, verify Upstash dashboard

### Issue: "Failed to archive conversation"
**Cause:** Supabase connection or column missing  
**Fix:** Verify migrations ran, check SUPABASE_SERVICE_ROLE_KEY

### Issue: PDF missing multimodal sections
**Cause:** Context not loaded properly  
**Fix:** Verify walLog.flushSession() succeeds, check context has data

### Issue: Summary artifact not showing
**Cause:** Metadata structure mismatch  
**Fix:** Check message.metadata.artifacts array structure, verify SummaryArtifact imported

### Issue: "Cannot find module 'react-markdown'"
**Cause:** Package not installed  
**Fix:** Run `pnpm install` (already done)

---

## Post-Testing

After all tests pass:

1. **Document results** in test results template
2. **Update** DEPLOY_PERSISTENT_CONTEXT.md with any learnings
3. **Create** production deployment plan
4. **Schedule** client beta test
5. **Monitor** logs in production for first week

---

## Production Deployment Pre-Check

Before deploying to production:

- [ ] All tests passed in development
- [ ] Migrations run in production Supabase
- [ ] Redis quota sufficient (check Upstash plan)
- [ ] Supabase storage quota sufficient
- [ ] Email sending configured (Resend API)
- [ ] Terms & Privacy reviewed by legal (recommended)
- [ ] Performance benchmarks acceptable
- [ ] Error monitoring configured (Sentry recommended)
- [ ] Backup and disaster recovery plan documented

---

## Next Steps After Testing

1. If all tests pass → Deploy to production
2. If any failures → Document in GitHub issues
3. Schedule follow-up testing after production deployment
4. Monitor audit_log for 1 week post-launch
5. Gather client feedback on PDF summaries

**Ready to test? Start with Test 15 (Complete User Journey) for full validation!** 🚀

