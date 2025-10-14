# How to Use Multimodal AI Chat

## Quick Start Guide

### Step 1: Start Voice 🎤

**This must be done FIRST!**

1. Open the chat interface
2. Click the **+ (Actions menu)** button at the bottom
3. Click **"Start Voice"**
4. Allow microphone access when prompted
5. Wait for "Listening..." status to appear

✅ **Voice is now active** - The Live API connection is established

### Step 2: Add Camera (Optional) 📹

1. Keep voice running (don't stop it!)
2. Click the **+ (Actions menu)** button again
3. Click **"Start Camera"**
4. Allow camera access when prompted
5. You should see:
   - Green pulsing dot with "Camera Active" label
   - Live camera feed appears in the chat area
   - Console log: `📹 Webcam frame streamed to Live API`

✅ **Camera is now streaming** - AI can see you!

### Step 3: Add Screen Share (Optional) 🖥️

1. Keep voice and camera running
2. Click the **+ (Actions menu)** button again
3. Click **"Start Screen Share"**
4. Select which screen/window/tab to share
5. You should see:
   - Blue pulsing dot with "Screen Sharing" label
   - Screen preview appears in the chat area
   - Console log: `📺 Screen frame streamed to Live API`

✅ **Screen is now streaming** - AI can see your screen!

## Testing the AI Can See/Hear You

### Test Voice:
```
You: "Hello, can you hear me?"
AI: "Yes, I can hear you clearly!"
```

### Test Camera:
```
You: "Can you see me?"
AI: "Yes, I can see you! I see [description of what's visible]"

You: "What's in my background?"
AI: "I can see [description of background]"
```

### Test Screen Share:
```
You: "What's on my screen?"
AI: "I can see [description of screen content]"

You: "Can you read what's on my screen?"
AI: "Yes, I can see [specific text/content from screen]"
```

## Important Notes

### ⚠️ Order Matters!

**ALWAYS start voice first**, then add camera/screen. Here's why:

- Voice establishes the Live API WebSocket connection
- Camera and screen share send frames through this connection
- Without voice active, camera/screen won't send data to the AI

### ⚠️ All Three Can Run Simultaneously

You can have:
- ✅ Voice + Camera
- ✅ Voice + Screen Share
- ✅ Voice + Camera + Screen Share

All at the same time! The AI will process all inputs together.

### ⚠️ Stopping Media

- Stop voice → All media stops (connection closes)
- Stop camera → Camera stops, voice and screen continue
- Stop screen → Screen stops, voice and camera continue

## Visual Indicators

When everything is working, you'll see:

1. **Voice Active:**
   - "Listening..." or "Recording" status
   - Voice waveform animation
   - Transcripts appearing in chat as message bubbles

2. **Camera Active:**
   - **Floating draggable video player** appears in bottom-left
   - Title: "Webcam Feed" with red pulsing recording dot
   - Your video feed (mirrored like a selfie camera)
   - **Drag the header** to move it anywhere
   - **Drag bottom-right corner** to resize
   - **X button** to close

3. **Screen Share Active:**
   - **Floating draggable video player** appears (offset from camera if both active)
   - Title: "Screen Share" with red pulsing recording dot
   - Live preview of your screen
   - **Drag the header** to move it anywhere
   - **Drag bottom-right corner** to resize
   - **X button** to close

## Troubleshooting

### "AI says it can't see me"

**Check:**
1. ✅ Did you start voice FIRST?
2. ✅ Do you see the **floating "Webcam Feed" video player**?
3. ✅ Can you see yourself in the video player?
4. ✅ Check console for `📹 Webcam frame streamed to Live API` logs (every 500ms)

**Fix:**
- Close the webcam player (X button) and start camera again
- Make sure voice is still active (green microphone indicator)
- Check browser console for errors
- Verify microphone permission was granted

### "AI says it can't see my screen"

**Check:**
1. ✅ Did you start voice FIRST?
2. ✅ Do you see the **floating "Screen Share" video player**?
3. ✅ Can you see your screen in the preview?
4. ✅ Check console for `📺 Screen frame streamed to Live API` logs (every 500ms)

**Fix:**
- Close the screen share player (X button) and start again
- Make sure voice is still active (green microphone indicator)
- Try sharing a different window/tab
- Select "Entire Screen" instead of individual window

### "No transcripts appearing"

**Check:**
1. ✅ Is voice active?
2. ✅ Are you speaking clearly?
3. ✅ Check microphone permissions

**Fix:**
- Stop and restart voice
- Check microphone is not muted
- Try speaking louder/clearer

### "Everything looks active but AI still can't see/hear"

**Check console logs:**
- Should see: `📹 Webcam frame streamed to Live API` (every 500ms)
- Should see: `📺 Screen frame streamed to Live API` (every 500ms)
- Should see voice transcription events

**If no logs:**
- Refresh the page
- Start voice first, then add media
- Check network tab for WebSocket connection

## Technical Details

### Frame Rates
- Camera: 2 FPS (one frame every 500ms)
- Screen Share: 2 FPS (one frame every 500ms)
- Voice: Continuous audio streaming

### Data Flow
```
Voice → WebSocket → Live API → AI Response
Camera → sendRealtimeInput → Live API → AI Vision
Screen → sendRealtimeInput → Live API → AI Vision
```

### Browser Support
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari (may have limitations)

### Permissions Required
- 🎤 Microphone (for voice)
- 📹 Camera (for webcam)
- 🖥️ Screen Recording (for screen share)

## Example Conversation

```
[User clicks "Start Voice"]
AI: "Hello! I'm ready to help."

[User clicks "Start Camera"]
AI: "I can see you now!"

User: "What do you see?"
AI: "I can see you're in a room with [description]. You're wearing [clothing description]."

[User clicks "Start Screen Share"]
AI: "I can now see your screen as well."

User: "What's on my screen?"
AI: "I can see you have [application] open with [content description]."

User: "Can you help me with this?"
AI: "Yes! Based on what I'm seeing on your screen, [helpful response]."
```

## Pro Tips

1. **Start with voice** - Always establish the connection first
2. **Speak naturally** - The AI understands conversational language
3. **Be specific** - Ask "What do you see in the top left?" for precise help
4. **Use all three** - Voice + Camera + Screen = most powerful assistance
5. **Check indicators** - Pulsing dots = active streaming
6. **Watch console** - Logs confirm frames are being sent

## Need Help?

If something isn't working:
1. Check this guide's troubleshooting section
2. Look at console logs for errors
3. Try the test phrases above
4. Restart in order: Voice → Camera → Screen

