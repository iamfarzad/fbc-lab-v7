# Quick Start: Testing Conversational Flow

**Ready to verify everything works?** Let's start with the basics.

## 🚀 Quick Test (30 seconds)

```bash
# 1. Start the server (if not running)
pnpm dev:all

# 2. In another terminal, run the test script
pnpm tsx scripts/test-conversational-flow.ts
```

**Expected Output**:
```
🧪 Conversational Flow E2E Test Suite

Base URL: http://localhost:3000
Logs Dir: /path/to/logs

✓ Server Health Check
✓ Basic Chat Message
   Response: "Welcome. To ensure we focus..."
✓ Discovery Agent Pattern
   Contains discovery language: ✓
✓ Log File Generation
   Found 42 log entries
✓ Log Entry Structure
   Log structure valid: ✓
...

📊 Test Results Summary
Total Tests: 7
✓ Passed: 7
✗ Failed: 0
```

## 🎯 Manual Verification (5 minutes)

### Test 1: Does the API actually respond?

```bash
curl http://localhost:3000/api/chat/unified?action=status
```

**What you should see**:
```json
{"status":"operational","backend":"unified-ai-sdk","version":"2.0.1"}
```

**If you see this**: ✅ API is working
**If you see "Connection refused"**: ❌ Server not running → `pnpm dev:all`

### Test 2: Does chat actually work?

```bash
curl -X POST http://localhost:3000/api/chat/unified \
  -H "Content-Type: application/json" \
  -H "x-session-id: quick-test-123" \
  -d '{
    "messages": [{
      "id": "msg-1",
      "role": "user",
      "content": "Hello, test",
      "timestamp": "2025-10-29T12:00:00Z"
    }],
    "context": {"sessionId": "quick-test-123"},
    "stream": false
  }'
```

**What you should see**: JSON response with `message.content` field

**If you see valid JSON**: ✅ Chat is working
**If you see an error**: Check the error message for details

### Test 3: Are logs actually being created?

```bash
# Check if today's log file exists
ls -lh logs/chat/chat-$(date +%Y%m%d).jsonl

# View last entry
tail -1 logs/chat/chat-$(date +%Y%m%d).jsonl | jq '.'
```

**What you should see**: 
- File exists with size > 0
- Last entry is JSON with `ts`, `category`, `event`, `data` fields
- `data.sessionId` matches your test session

**If file exists with valid JSON**: ✅ Logging works
**If file doesn't exist**: ❌ Check `logJsonl()` is being called

## 🐛 Common Issues

### Issue: "Server not running"
**Fix**: 
```bash
pnpm dev:all
```
Wait for "Ready on http://localhost:3000"

### Issue: "Cannot find module"
**Fix**:
```bash
pnpm install
```

### Issue: "Log files not created"
**Fix**:
```bash
# Create logs directory if missing
mkdir -p logs/{chat,live,webcam,screen,document,image,url}

# Check permissions
ls -la logs/
```

### Issue: "403 Forbidden" or "401 Unauthorized"
**Check**: API key configuration
```bash
# Verify environment variable
echo $GEMINI_API_KEY | cut -c1-10
```

## 📊 Next Steps After Quick Test

1. **If all tests pass**: Continue with full test plan in `CONVERSATIONAL_FLOW_TEST_PLAN.md`
2. **If tests fail**: 
   - Note which test failed
   - Check server logs: `tail -f .next/server.log`
   - Check API logs: `tail -f logs/chat/chat-$(date +%Y%m%d).jsonl`
   - Report specific error message

## 🎯 What We're Actually Testing

We're verifying that the claims made in the analysis are **actually true**:

- ✅ Chat API accepts messages → **Test 1 & 2**
- ✅ Discovery agent responds correctly → **Test 2**
- ✅ Logs are generated → **Test 3**
- ✅ Session management works → Use same `sessionId` twice
- ✅ Error handling works → Send invalid JSON

---

**Start Here**: Run the quick test script and report what you see!

