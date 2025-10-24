# Manual Test Plan - Cherry-Picked Features

## Test Environment Setup

### Prerequisites
- Development servers running: `pnpm dev:all`
- Next.js: http://localhost:3000
- WebSocket: http://localhost:3001
- Browser: Chrome DevTools available

### Test Data Preparation
```bash
# Create test files
echo "This is a test document for analysis." > test-document.txt
echo "Test image content" > test-image.jpg
```

---

## 🎯 **Test 1: Context Improvement (GEMINI_CONFIG.SYSTEM_PROMPT)**

### Objective
Verify centralized system prompt is working

### Steps
1. **Navigate to voice test page**
   - Go to: http://localhost:3000/voice-test
   - Check console for no errors

2. **Start voice session**
   - Click "Start Voice Session" button
   - Verify WebSocket connection established
   - Check server logs for system prompt usage

3. **Verify system prompt**
   - Look for logs showing: `systemInstructionLength: 483`
   - Confirm prompt comes from `GEMINI_CONFIG.SYSTEM_PROMPT`

### Expected Results
- ✅ Voice session starts without errors
- ✅ System prompt length shows 483 characters
- ✅ No console errors on voice page

---

## 🎯 **Test 2: Document Analysis API**

### Objective
Test `/api/tools/document` endpoint

### Steps
1. **Test with valid document**
   ```bash
   curl -X POST http://localhost:3000/api/tools/document \
     -F "document=@test-document.txt" \
     -H "x-intelligence-session-id: test-doc-123"
   ```

2. **Test with PDF (if available)**
   ```bash
   curl -X POST http://localhost:3000/api/tools/document \
     -F "document=@README.md" \
     -H "x-intelligence-session-id: test-doc-456"
   ```

3. **Test error handling**
   ```bash
   curl -X POST http://localhost:3000/api/tools/document \
     -F "document=@package.json" \
     -H "x-intelligence-session-id: test-doc-error"
   ```

### Expected Results
- ✅ Valid documents return 200 with analysis
- ✅ Unsupported MIME types return proper error messages
- ✅ No 500 Internal Server Errors

---

## 🎯 **Test 3: Image Analysis API**

### Objective
Test `/api/tools/image` endpoint

### Steps
1. **Test with valid image**
   ```bash
   curl -X POST http://localhost:3000/api/tools/image \
     -F "image=@public/favicon.ico" \
     -H "x-intelligence-session-id: test-img-123"
   ```

2. **Test with different image format**
   ```bash
   # Create a simple test image
   echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==" | base64 -d > test.png
   curl -X POST http://localhost:3000/api/tools/image \
     -F "image=@test.png" \
     -H "x-intelligence-session-id: test-img-456"
   ```

3. **Test error handling**
   ```bash
   curl -X POST http://localhost:3000/api/tools/image \
     -F "image=@test-document.txt" \
     -H "x-intelligence-session-id: test-img-error"
   ```

### Expected Results
- ✅ Valid images return 200 with analysis
- ✅ Unsupported formats return proper error messages
- ✅ No 500 Internal Server Errors

---

## 🎯 **Test 4: URL Analysis API**

### Objective
Test `/api/tools/url` endpoint

### Steps
1. **Test with simple URL**
   ```bash
   curl -X POST http://localhost:3000/api/tools/url \
     -H "Content-Type: application/json" \
     -d '{"url":"https://example.com"}' \
     -H "x-intelligence-session-id: test-url-123"
   ```

2. **Test with different URL**
   ```bash
   curl -X POST http://localhost:3000/api/tools/url \
     -H "Content-Type: application/json" \
     -d '{"url":"https://httpbin.org/json"}' \
     -H "x-intelligence-session-id: test-url-456"
   ```

3. **Test error handling**
   ```bash
   curl -X POST http://localhost:3000/api/tools/url \
     -H "Content-Type: application/json" \
     -d '{"url":"https://invalid-url-that-does-not-exist.com"}' \
     -H "x-intelligence-session-id: test-url-error"
   ```

### Expected Results
- ✅ Valid URLs return 200 with comprehensive analysis
- ✅ Invalid URLs return proper error messages
- ✅ Analysis includes title, description, and business insights

---

## 🎯 **Test 5: Screen Share Hook**

### Objective
Verify `useScreenShare` hook is available and functional

### Steps
1. **Check hook availability**
   ```bash
   # Verify hook file exists and exports correctly
   ls -la src/hooks/useScreenShare.ts
   ```

2. **Test in browser context**
   - Open browser console on any page
   - Try to import the hook (this will fail in console, but that's expected)
   - The hook should be available for React components

3. **Verify no import errors**
   - Check that no components have import errors
   - Verify TypeScript compilation succeeds

### Expected Results
- ✅ Hook file exists and is properly structured
- ✅ No TypeScript compilation errors
- ✅ Hook is available for future component usage

---

## 🎯 **Test 6: Minor Fixes & Cal.com Integration**

### Objective
Verify Cal.com integration and code cleanup

### Steps
1. **Check Cal.com script**
   - View page source of homepage
   - Verify Cal.com embed script is present:
   ```html
   <script type="text/javascript" src="https://app.cal.com/embed/embed.js" async></script>
   ```

2. **Test homepage functionality**
   - Navigate to: http://localhost:3000
   - Check for no console errors
   - Verify page loads correctly

3. **Test admin page**
   - Navigate to: http://localhost:3000/admin
   - Check for no console errors
   - Verify admin interface loads

### Expected Results
- ✅ Cal.com script is present in page source
- ✅ Homepage loads without errors
- ✅ Admin page loads without errors

---

## 🎯 **Test 7: Production Build**

### Objective
Verify production build succeeds

### Steps
1. **Run production build**
   ```bash
   pnpm build
   ```

2. **Check build output**
   - Verify no TypeScript errors
   - Check build completes successfully
   - Note build time and size

3. **Test production server**
   ```bash
   pnpm start
   # Test a few key pages
   curl http://localhost:3000
   curl http://localhost:3000/voice-test
   ```

### Expected Results
- ✅ Build completes without errors
- ✅ Production server starts successfully
- ✅ Key pages load in production mode

---

## 🎯 **Test 8: Voice Functionality**

### Objective
Verify voice functionality works after startSession fix

### Steps
1. **Navigate to voice test page**
   - Go to: http://localhost:3000/voice-test
   - Check console for no errors

2. **Test voice session lifecycle**
   - Click "Start Voice Session"
   - Verify WebSocket connection
   - Test microphone permission
   - Click "Stop Voice Session"
   - Verify clean disconnection

3. **Test voice features**
   - Test audio recording
   - Test audio playback
   - Test session state management

### Expected Results
- ✅ Voice session starts without TypeScript errors
- ✅ WebSocket connection established
- ✅ Audio recording/playback works
- ✅ Session state management works correctly

---

## 🎯 **Test 9: Integration Testing**

### Objective
Test all features together

### Steps
1. **Start voice session**
   - Go to voice test page
   - Start voice session

2. **Test multimodal context**
   - Use voice to request document analysis
   - Use voice to request image analysis
   - Use voice to request URL analysis

3. **Verify context integration**
   - Check that multimodal context is updated
   - Verify context persists across requests
   - Test context sharing between voice and APIs

### Expected Results
- ✅ Voice session works with new APIs
- ✅ Multimodal context is properly updated
- ✅ Context persists across different request types

---

## 🎯 **Test 10: Error Handling**

### Objective
Verify proper error handling

### Steps
1. **Test API error scenarios**
   - Send invalid requests to all APIs
   - Test with missing headers
   - Test with invalid data

2. **Test voice error scenarios**
   - Test without microphone permission
   - Test with network issues
   - Test with invalid session data

3. **Test edge cases**
   - Test with very large files
   - Test with very long URLs
   - Test with special characters

### Expected Results
- ✅ APIs return proper error messages
- ✅ Voice handles errors gracefully
- ✅ No crashes or unhandled exceptions

---

## 📊 **Test Results Summary**

### Checklist
- [ ] Context improvement working
- [ ] Document API working
- [ ] Image API working  
- [ ] URL API working
- [ ] Screen share hook available
- [ ] Cal.com integration working
- [ ] Production build successful
- [ ] Voice functionality working
- [ ] Integration testing passed
- [ ] Error handling working

### Success Criteria
- ✅ All APIs return 200 for valid requests
- ✅ All APIs return proper errors for invalid requests
- ✅ Voice functionality works without TypeScript errors
- ✅ Production build completes successfully
- ✅ No console errors on any page
- ✅ All features integrate properly

### Issues Found
- [ ] Document any issues discovered
- [ ] Note any performance concerns
- [ ] Record any unexpected behavior

---

## 🚀 **Final Verification**

### Before Merging
1. **All tests pass**
2. **No console errors**
3. **Production build successful**
4. **Voice functionality working**
5. **APIs responding correctly**

### Ready for Merge
- [ ] All manual tests completed
- [ ] All issues resolved
- [ ] Ready to merge `feature/cherry-pick-multimodal-apis` into `main`
- [ ] Ready to delete original branch

---

## 📝 **Notes**

- Test in Chrome DevTools for best debugging
- Check server logs for detailed error information
- Use browser network tab to monitor API calls
- Test both development and production modes
- Verify all features work together as expected
