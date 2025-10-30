# Live Page Runtime Issues - Fix Plan

## Immediate Issues Found

### 1. WebSocket Server Not Running
**Status:** Port 3001 not in use
**Fix:** Start the WebSocket server with `pnpm dev:all` or `pnpm dev:websocket`

### 2. Multiple startSession Calls (Loop)
**Fixed:** Added `hasStartedRef` guard in ViewController to prevent duplicate calls
**Fixed:** Added `startInFlightRef` check at start of `startSession` function

### 3. Connection Retry Logic
**Issue:** Multiple retry attempts happening simultaneously
**Status:** Need to verify retry logic doesn't create race conditions

## Changes Made

1. **src/components/agent-ui/app/view-controller.tsx**
   - Added `hasStartedRef` to prevent useEffect loop
   - Reset flag on error to allow retry

2. **src/hooks/useRealtimeVoice.ts**
   - Added early return in `startSession` if already in progress
   - Added early return if session already active

## Next Steps

1. **Start WebSocket Server:**
   ```bash
   pnpm dev:all
   # or separately:
   pnpm dev:websocket
   ```

2. **Test the fixes:**
   - Verify single startSession call
   - Verify connection succeeds when server is running
   - Check console for reduced log spam

3. **Monitor for:**
   - Any remaining duplicate connection attempts
   - Connection state transitions
   - Error handling when server is down

## Server Status Check

Run this to verify server is running:
```bash
lsof -i :3001
# Should show node process listening on port 3001
```

If not running, start it:
```bash
cd server && pnpm dev
# or
pnpm dev:all:clean
```

