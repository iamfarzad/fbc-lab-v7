# Manual Testing Checklist

**Date:** _____________  
**Tester:** _____________  
**Environment:** [ ] Local [ ] Staging [ ] Production  
**Branch:** _____________

---

## Pre-Testing Setup

- [ ] Development servers running (`pnpm dev:all`)
  - [ ] Next.js on http://localhost:3000
  - [ ] WebSocket on ws://localhost:3001
- [ ] All automated tests passed
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Production build successful

---

## 1. Text Chat Functionality

### Basic Chat Operations
- [ ] Chat widget appears on homepage
- [ ] Can open chat dialog
- [ ] Can close chat dialog
- [ ] Can minimize chat
- [ ] Can restore minimized chat
- [ ] Can expand chat to fullscreen
- [ ] Can collapse from fullscreen

### Message Sending/Receiving
- [ ] Can type message in input field
- [ ] Send button becomes enabled when text entered
- [ ] Message appears in chat after sending
- [ ] AI response streams back within 5 seconds
- [ ] Multiple messages work correctly
- [ ] Long messages display properly
- [ ] Messages persist during session

### UI States
- [ ] Loading state shows while sending
- [ ] Send button disables while processing
- [ ] Error toast appears on failure
- [ ] Success feedback is clear
- [ ] Scroll behavior works correctly

---

## 2. Voice Functionality ⭐ CRITICAL

### Voice Session Startup
- [ ] Microphone button visible in chat
- [ ] Click mic - browser permission prompt appears
- [ ] Grant permission - mic activates successfully
- [ ] Voice indicator/waveform appears
- [ ] Status shows "Recording" or "Listening"

### Audio Capture & Playback
- [ ] **Speak for 5 seconds - voice is captured**
- [ ] **User transcript appears in real-time**
- [ ] **User transcript is accurate**
- [ ] **AI responds with audio playback**
- [ ] **AI audio is CLEAR (no static, crackling, or distortion)**
- [ ] **AI transcript displays while AI speaks**
- [ ] **AI transcript is accurate**

### Voice Session Behavior
- [ ] Can stop voice session mid-conversation
- [ ] Can restart voice after stopping
- [ ] Transcripts clear after turn completes
- [ ] Turn-taking works smoothly (no overlap)
- [ ] Voice session maintains WebSocket connection
- [ ] No memory leaks during extended session (test 5+ minutes)

### Error Handling
- [ ] Graceful error if permission denied
- [ ] Clear error message if WebSocket fails
- [ ] Can recover from temporary connection loss
- [ ] Microphone icon shows correct state (active/inactive)

---

## 3. Webcam Functionality

### Camera Activation
- [ ] Camera button visible in chat
- [ ] Click camera - browser permission prompt appears
- [ ] Grant permission - camera activates
- [ ] Video preview displays correctly
- [ ] Preview shows live feed (not frozen)

### Camera Features
- [ ] Can toggle camera on/off
- [ ] Can switch between front/back camera (mobile)
- [ ] Camera stream maintains good quality
- [ ] No significant lag in preview

### Analysis
- [ ] "Analyze" button appears when camera active
- [ ] Click analyze - triggers webcam analysis
- [ ] Analysis result appears in chat
- [ ] Result is relevant to camera content
- [ ] Can analyze multiple times

---

## 4. Screen Share Functionality

### Screen Share Activation
- [ ] Screen share button visible in chat
- [ ] Click screen share - browser picker appears
- [ ] Can select entire screen
- [ ] Can select specific window
- [ ] Can select browser tab
- [ ] Stream activates after selection
- [ ] Screen share indicator shows active state

### Explicit Analysis (New Feature)
- [ ] **"Analyze Screen" button visible when sharing**
- [ ] **Click "Analyze Screen" - prompt input appears**
- [ ] **Can enter custom prompt**
- [ ] **Click "Analyze" - sends screen capture + prompt**
- [ ] **Analysis appears in chat**
- [ ] **Analysis is relevant to screen content**
- [ ] **Toast notification: "Screen analyzed"**

### Screen Share Behavior
- [ ] Can stop screen sharing
- [ ] Can restart screen sharing
- [ ] Multiple analyses work correctly
- [ ] No performance degradation during sharing

---

## 5. File Attachments

### File Upload
- [ ] File upload button/area visible
- [ ] Can click to select file
- [ ] Can drag & drop file
- [ ] Accepted file types work (PDF, images, text)
- [ ] File size limit enforced (if applicable)
- [ ] Upload progress indicator shows

### File Processing
- [ ] File uploads successfully
- [ ] Upload confirmation appears
- [ ] Can send message with attachment
- [ ] AI analyzes file content
- [ ] Response includes file insights
- [ ] Can upload multiple files (if supported)

---

## 6. UI/UX Quality

### Visual Design
- [ ] All buttons are clearly labeled
- [ ] Icons are intuitive and recognizable
- [ ] Color scheme is consistent
- [ ] Contrast meets accessibility standards
- [ ] Animations are smooth (not janky)
- [ ] Loading states are clear

### Responsive Design
- [ ] **Desktop (1920x1080):** All features work
- [ ] **Laptop (1440x900):** All features work
- [ ] **Tablet (768x1024):** All features work
- [ ] **Mobile (375x667):** All features work
- [ ] Chat adapts to screen size
- [ ] No horizontal scrolling
- [ ] Touch targets are adequate size (mobile)

### Accessibility
- [ ] Can navigate with keyboard
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Screen reader announcements (if applicable)
- [ ] Alt text on images/icons

---

## 7. Backend & WebSocket

### Local Development
- [ ] WebSocket connects to ws://localhost:3001
- [ ] Connection established within 2 seconds
- [ ] Stays connected during session
- [ ] Reconnects automatically if dropped
- [ ] No WebSocket errors in console

### Production/Fly.io (if testing deployed version)
- [ ] WebSocket connects to wss://fb-consulting-websocket.fly.dev
- [ ] Connection latency acceptable (<500ms)
- [ ] Stable connection over extended use
- [ ] Handles reconnection gracefully

### API Routes
- [ ] POST /api/chat - text chat works
- [ ] POST /api/tools/screen - screen analysis works
- [ ] POST /api/tools/webcam - webcam analysis works
- [ ] POST /api/chat/attachments - file upload works
- [ ] All responses return within acceptable time (<10s)

---

## 8. Browser Logs & Debugging

### Console Monitoring
- [ ] Open browser DevTools console
- [ ] **No critical errors (red) in console**
- [ ] No 404 errors for resources
- [ ] No CORS errors
- [ ] No WebSocket connection errors
- [ ] Warnings are acceptable/expected

### Network Tab
- [ ] All API calls succeed (200/201 status)
- [ ] No failed requests (4xx/5xx except expected)
- [ ] WebSocket connection shows as established
- [ ] Resource loading times acceptable
- [ ] No excessive requests (check for loops)

### Performance
- [ ] Initial page load <3 seconds
- [ ] Time to interactive <5 seconds
- [ ] No memory leaks (check DevTools memory)
- [ ] CPU usage reasonable during voice/video
- [ ] No layout shifts (CLS)

---

## 9. Error Scenarios

### Network Errors
- [ ] Graceful degradation when offline
- [ ] Clear error message when API fails
- [ ] Retry logic works (if applicable)
- [ ] Can recover when network restored

### Permission Errors
- [ ] Clear message if mic permission denied
- [ ] Clear message if camera permission denied
- [ ] Clear message if screen share cancelled
- [ ] UI remains functional after permission denial

### Edge Cases
- [ ] Very long messages (>500 chars)
- [ ] Rapid clicking (button spam)
- [ ] Switching features mid-session
- [ ] Browser back/forward buttons
- [ ] Page refresh during active session

---

## 10. Production Readiness

### Deployment Checks (Pre-Push)
- [ ] All automated tests passed
- [ ] Type check: 0 errors
- [ ] Lint check: 0 errors
- [ ] Build succeeds without warnings
- [ ] Manual testing checklist complete

### Environment Variables
- [ ] GEMINI_API_KEY set correctly
- [ ] NEXT_PUBLIC_LIVE_SERVER_URL set (production)
- [ ] All required env vars present
- [ ] No hardcoded secrets in code

### Final Verification
- [ ] Voice quality is excellent (most critical)
- [ ] No blocking bugs found
- [ ] Performance is acceptable
- [ ] UX feels polished
- [ ] Ready to deploy to main

---

## Test Results Summary

**Total Checks:** _____ / _____  
**Pass Rate:** _____%

### Critical Issues Found:
1. 
2. 
3. 

### Non-Critical Issues:
1. 
2. 
3. 

### Recommendations:
- 
- 
- 

---

## Sign-Off

**Tested By:** _________________  
**Date:** _________________  
**Approved for Deployment:** [ ] Yes [ ] No [ ] With Conditions

**Conditions (if any):**
- 
- 

**Additional Notes:**



---

## Quick Reference

### Most Critical Tests (Must Pass)
1. ⭐ Voice audio quality (no static/crackling)
2. ⭐ Voice transcripts display correctly
3. ⭐ WebSocket connection stability
4. ⭐ No console errors
5. ⭐ Basic chat send/receive works

### Test Shortcuts
```bash
# Start dev environment
pnpm dev:all

# Run all automated tests
pnpm test:pre-deploy

# Check backend health
tsx scripts/check-backend-health.ts

# View logs
pnpm logs
```

