# Conversational Flow Test Plan

**Status**: Ready for Testing  
**Created**: October 29, 2025  
**Purpose**: Step-by-step verification of entire conversational flow

---

## 🎯 Test Objectives

Verify that:
1. ✅ Chat API accepts and processes messages correctly
2. ✅ Discovery agent workflow functions as described
3. ✅ Logging generates entries as claimed
4. ✅ Multimodal context builds correctly
5. ✅ Session management works
6. ✅ Error handling is robust
7. ✅ All code paths actually work (not just documented)

---

## 📋 Test Suite Structure

### Automated Tests
**File**: `tests/conversational-flow-e2e.test.ts`

**Run with**:
```bash
pnpm test tests/conversational-flow-e2e.test.ts
```

**Covers**:
- API health checks
- Basic message flow
- Discovery agent patterns
- Session management
- Rate limiting
- Multimodal context
- Error handling

### Manual Test Script
**File**: `scripts/test-conversational-flow.ts`

**Run with**:
```bash
pnpm tsx scripts/test-conversational-flow.ts
```

**Covers**:
- Server connectivity
- Chat message processing
- Discovery pattern verification
- Log file existence and structure
- Voice/webcam/screen log verification

---

## 🔍 Step-by-Step Testing Protocol

### Phase 1: Basic API Functionality

#### Test 1.1: Server Health
```bash
curl http://localhost:3000/api/chat/unified?action=status
```

**Expected**:
```json
{
  "status": "operational",
  "backend": "unified-ai-sdk",
  "version": "2.0.1"
}
```

#### Test 1.2: Capabilities
```bash
curl http://localhost:3000/api/chat/unified?action=capabilities
```

**Expected**:
```json
{
  "capabilities": {
    "supportsStreaming": true,
    "supportsMultimodal": true,
    "supportsRealtime": true
  }
}
```

#### Test 1.3: Simple Chat Message
```bash
curl -X POST http://localhost:3000/api/chat/unified \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-session-123" \
  -d '{
    "messages": [{
      "id": "msg-1",
      "role": "user",
      "content": "Hello, test message",
      "timestamp": "2025-10-29T12:00:00Z"
    }],
    "context": {"sessionId": "test-session-123"},
    "stream": false
  }'
```

**Verify**:
- ✅ Returns 200 OK
- ✅ Contains `message.content` field
- ✅ Response has valid structure
- ✅ Log entry created in `logs/chat/chat-YYYYMMDD.jsonl`

---

### Phase 2: Discovery Agent Verification

#### Test 2.1: New Conversation Opening
**Send**: "Hello"

**Expected Behavior**:
- AI responds with discovery-oriented question
- Contains words: "business", "goal", "objective", or "strategic"
- No errors or generic responses

**Check Logs**:
```bash
tail -1 logs/chat/chat-$(date +%Y%m%d).jsonl | jq '.'
```

**Verify Log Entry**:
- ✅ `category: "chat"`
- ✅ `event: "assistant_message"`
- ✅ `data.sessionId` matches request
- ✅ `data.agent: "Discovery Agent"`
- ✅ `data.content` contains discovery language

#### Test 2.2: Deflection Handling
**Send**: "What is 1+1?"

**Expected Behavior**:
- AI redirects back to business focus
- Polite but firm response
- Mentions "business", "objective", or "focus"

**Verify**:
- ✅ Response contains redirect language
- ✅ Not just answering the math question
- ✅ Maintains professional tone

---

### Phase 3: Log Generation Verification

#### Test 3.1: Chat Log Structure
```bash
# Find today's chat log
LOG_FILE="logs/chat/chat-$(date +%Y%m%d).jsonl"

# Count entries
wc -l "$LOG_FILE"

# Check last entry
tail -1 "$LOG_FILE" | jq '.'
```

**Verify**:
- ✅ File exists
- ✅ Contains valid JSONL entries
- ✅ Each entry has: `ts`, `category`, `event`, `data`
- ✅ `data.sessionId` is present
- ✅ `data.reqId` matches request header

#### Test 3.2: Session Correlation
Send messages with same `sessionId`, then check logs:

```bash
SESSION_ID="test-verify-$(date +%s)"

# Send multiple messages with same session
for i in 1 2 3; do
  curl -X POST http://localhost:3000/api/chat/unified \
    -H "x-session-id: $SESSION_ID" \
    -H "Content-Type: application/json" \
    -d "{\"messages\": [{\"id\": \"msg-$i\", \"role\": \"user\", \"content\": \"Test $i\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}], \"context\": {\"sessionId\": \"$SESSION_ID\"}, \"stream\": false}"
done

# Verify all logged under same session
grep "$SESSION_ID" logs/chat/chat-$(date +%Y%m%d).jsonl | wc -l
```

**Verify**:
- ✅ All messages logged with same `sessionId`
- ✅ Request IDs are unique
- ✅ Timestamps are sequential

---

### Phase 4: Multimodal Context Testing

#### Test 4.1: Screen Share Context
```bash
curl -X POST http://localhost:3000/api/chat/unified \
  -H "Content-Type: application/json" \
  -H "x-session-id: test-screen-123" \
  -d '{
    "messages": [{
      "id": "msg-screen",
      "role": "user",
      "content": "Here is my dashboard",
      "timestamp": "2025-10-29T12:00:00Z"
    }],
    "context": {
      "sessionId": "test-screen-123",
      "multimodalData": {
        "videoData": {
          "type": "screen",
          "imageData": "data:image/jpeg;base64,...",
          "timestamp": "2025-10-29T12:00:00Z"
        }
      }
    },
    "stream": false
  }'
```

**Verify**:
- ✅ Request succeeds
- ✅ Response acknowledges screen share
- ✅ No errors about invalid context

#### Test 4.2: Document Upload Context
**Test via `/api/chat/attachments` endpoint**:
```bash
curl -X POST http://localhost:3000/api/chat/attachments \
  -F "files=@test-document.txt" \
  -F "sessionId=test-doc-123"
```

**Verify**:
- ✅ Upload succeeds
- ✅ Analysis generated
- ✅ Context available for next chat message

---

### Phase 5: Voice Integration Testing

#### Test 5.1: Voice Session Start
**Using WebSocket to `/api/ws/realtime`** (if available)

**Verify**:
- ✅ Connection established
- ✅ Audio chunks transmitted
- ✅ Transcripts received
- ✅ Logs in `logs/client-live/client-live-YYYYMMDD.jsonl`

#### Test 5.2: Voice to Chat Bridge
**Verify**: `FBCAudioBridge.tsx` forwards voice transcripts to chat

---

### Phase 6: Error Handling

#### Test 6.1: Invalid JSON
```bash
curl -X POST http://localhost:3000/api/chat/unified \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
```

**Expected**: 400 Bad Request

#### Test 6.2: Missing Messages
```bash
curl -X POST http://localhost:3000/api/chat/unified \
  -H "Content-Type: application/json" \
  -d '{"context": {}}'
```

**Expected**: 400 Bad Request

#### Test 6.3: Empty Content
```bash
curl -X POST http://localhost:3000/api/chat/unified \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"id": "msg-1", "role": "user", "content": "   "}],
    "context": {}
  }'
```

**Expected**: 400 Bad Request

---

### Phase 7: Performance & Scale

#### Test 7.1: Concurrent Requests
```bash
# Send 10 concurrent requests
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/chat/unified \
    -H "x-session-id: perf-test-$i" \
    -H "Content-Type: application/json" \
    -d "{\"messages\": [{\"id\": \"msg-$i\", \"role\": \"user\", \"content\": \"Test $i\"}], \"context\": {\"sessionId\": \"perf-test-$i\"}, \"stream\": false}" &
done
wait
```

**Verify**:
- ✅ All requests complete
- ✅ No 429 rate limit errors (unless expected)
- ✅ Response times reasonable (< 5 seconds)

#### Test 7.2: Streaming Performance
**Measure**: Time to first token in streaming response

---

## 📊 Verification Checklist

### Code Paths Verified
- [ ] `POST /api/chat/unified` handler executes
- [ ] `streamText()` from AI SDK is called
- [ ] `routeToAgent()` routes correctly
- [ ] `multimodalContextManager.getContext()` builds context
- [ ] `logJsonl()` creates log entries
- [ ] Rate limiter checks execute
- [ ] Exit intent detection works
- [ ] Error handling returns proper status codes

### Log Generation Verified
- [ ] Chat messages logged to `logs/chat/chat-YYYYMMDD.jsonl`
- [ ] Voice events logged to `logs/client-live/client-live-YYYYMMDD.jsonl`
- [ ] Webcam captures logged to `logs/webcam/webcam-YYYYMMDD.jsonl`
- [ ] Screen shares logged to `logs/screen/screen-YYYYMMDD.jsonl`
- [ ] Log entries have correct structure
- [ ] Session IDs are preserved in logs

### Flow Verification
- [ ] New conversation → Discovery agent opens correctly
- [ ] Deflection attempt → Redirects to business focus
- [ ] Business goal response → Follow-up questions
- [ ] Screen share → Context integrated into response
- [ ] Voice input → Transcribed and forwarded to chat
- [ ] Session persistence → Context retained across messages

---

## 🐛 Known Issues to Test

### Issue 1: GitHub MCP Tools Not Available
**Status**: Tools didn't load (Docker requirement)
**Workaround**: Used local codebase search
**Action**: Documented limitation in mapping

### Issue 2: Log Analysis Claims vs Reality
**Claims Made**:
- 67+ chat interactions
- 360+ webcam captures
- 55+ screen shares

**Verification Needed**:
- [ ] Actually count log entries
- [ ] Verify timestamps match "past 2 days"
- [ ] Confirm activity distribution

### Issue 3: Agent Routing Logic
**Claim**: Routes to Discovery Agent for new conversations
**Verify**:
- [ ] Check `routeToAgent()` implementation
- [ ] Verify stage detection logic
- [ ] Confirm agent selection

---

## 🚀 Running Full Test Suite

### Option 1: Jest Tests
```bash
# Run all conversational flow tests
pnpm test tests/conversational-flow-e2e.test.ts

# With coverage
pnpm test --coverage tests/conversational-flow-e2e.test.ts
```

### Option 2: Manual Test Script
```bash
# Interactive test runner
pnpm tsx scripts/test-conversational-flow.ts

# With custom base URL
TEST_BASE_URL=http://localhost:3000 pnpm tsx scripts/test-conversational-flow.ts
```

### Option 3: Step-by-Step Manual
Follow Phase 1-7 above manually with curl commands.

---

## 📝 Test Results Template

```markdown
## Test Results - [Date]

### Phase 1: Basic API ✅
- [x] Server health check
- [x] Capabilities endpoint
- [x] Simple chat message

### Phase 2: Discovery Agent ⚠️
- [x] Opening pattern works
- [ ] Deflection handling (needs review)
- [x] Follow-up questions

### Phase 3: Logging ✅
- [x] Chat logs generated
- [x] Log structure correct
- [x] Session correlation works

### Phase 4: Multimodal ❌
- [ ] Screen share context
- [ ] Document upload
- [ ] Webcam integration

### Phase 5: Voice ⏳
- [ ] WebSocket connection
- [ ] Audio transmission
- [ ] Transcript forwarding

### Issues Found:
1. [Issue description]

### Next Steps:
1. [Action item]
```

---

## 🔧 Troubleshooting

### Server Not Responding
```bash
# Check if server is running
ps aux | grep "next dev"

# Check logs
tail -f logs/chat/chat-$(date +%Y%m%d).jsonl

# Restart server
pnpm dev:all
```

### Log Files Not Creating
- Check `LOGS_DIR` environment variable
- Verify write permissions on `logs/` directory
- Check `logJsonl()` function is being called

### Agent Not Routing Correctly
- Check `routeToAgent()` implementation
- Verify `context.conversationFlow` structure
- Review agent selection logic in `orchestrator.ts`

---

**Next Action**: Run Phase 1 tests and report results

