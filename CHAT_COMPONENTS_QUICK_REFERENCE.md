# Chat Components Quick Reference

> Quick lookup table for all chat components, their hooks, and connections

---

## Components by Category

### 🏗️ CORE STRUCTURE

| Component | Location | Purpose | Connected Hooks |
|-----------|----------|---------|-----------------|
| **ChatInterface** | `chat/ChatInterface.tsx` | Main orchestrator | ALL hooks |
| **ChatContainer** | `chat/components/ChatContainer.tsx` | Layout wrapper | useChatState |
| **ChatHeader** | `chat/components/ChatHeader.tsx` | Top bar controls | useChatState |
| **MinimizedChatBar** | `chat/components/MinimizedChatBar.tsx` | Minimized view | useChatState |

---

### 💬 MESSAGE COMPONENTS

| Component | Location | Purpose | Connected Hooks |
|-----------|----------|---------|-----------------|
| **ChatMessages** | `chat/components/ChatMessages.tsx` | Message renderer | useChatMessages, useChatIntelligence |
| **ChatSuggestions** | `chat/components/ChatSuggestions.tsx` | Quick suggestions | useChatIntelligence |
| **ChatTermsAcceptance** | `chat/components/ChatTermsAcceptance.tsx` | Terms form | useChatIntelligence |
| **LiveTranscriptPanel** | `chat/components/LiveTranscriptPanel.tsx` | Voice transcript | useRealtimeVoice |
| **SessionLimitWarning** | `chat/SessionLimitWarning.tsx` | Usage warnings | (none - direct API) |

---

### ⌨️ INPUT COMPONENTS

| Component | Location | Purpose | Connected Hooks |
|-----------|----------|---------|-----------------|
| **ChatInput** | `chat/components/ChatInput.tsx` | Message input | ALL media hooks |
| **ToolsMenu** | `chat/components/ToolsMenu.tsx` | Media tools dropdown | useMediaToggle |
| **ActionsMenu** | `chat/components/ActionsMenu.tsx` | Additional actions | (none) |
| **VoiceButton** | `chat/components/VoiceButton.tsx` | Voice toggle | useRealtimeVoice |

---

### 🎤 VOICE COMPONENTS

| Component | Location | Purpose | Connected Hooks |
|-----------|----------|---------|-----------------|
| **VoiceDisplay** | `chat/components/voice/VoiceDisplay.tsx` | Transcript display | useRealtimeVoice |
| **VoicePopover** | `chat/components/voice/VoicePopover.tsx` | Compact voice UI | useRealtimeVoice |
| **VoiceFullScreen** | `chat/components/voice/VoiceFullScreen.tsx` | Full voice UI | useRealtimeVoice |
| **VoiceWaveform** | `chat/components/VoiceWaveform.tsx` | Audio visualization | useMicLevel |

---

### 📷 CAMERA COMPONENTS

| Component | Location | Purpose | Connected Hooks |
|-----------|----------|---------|-----------------|
| **CameraDisplay** | `chat/components/camera/CameraDisplay.tsx` | Video preview | useCamera |
| **CameraPopover** | `chat/components/camera/CameraPopover.tsx` | Compact camera UI | useCamera |
| **CameraFullScreen** | `chat/components/camera/CameraFullScreen.tsx` | Full camera UI | useCamera |

---

### 🖥️ SCREEN SHARE COMPONENTS

| Component | Location | Purpose | Connected Hooks |
|-----------|----------|---------|-----------------|
| **ScreenDisplay** | `chat/components/screen/ScreenDisplay.tsx` | Screen preview | useChatState |
| **ScreenPopover** | `chat/components/screen/ScreenPopover.tsx` | Compact screen UI | useChatState |
| **ScreenFullScreen** | `chat/components/screen/ScreenFullScreen.tsx` | Full screen UI | useChatState |

---

### 🎛️ MEDIA CONTROLS

| Component | Location | Purpose | Connected Hooks |
|-----------|----------|---------|-----------------|
| **MediaPopover** | `chat/components/MediaPopover.tsx` | Unified media panel | ALL media hooks |
| **MediaControlsOverlay** | `chat/components/MediaControlsOverlay.tsx` | Floating controls | ALL media hooks |
| **DraggableVideoPlayer** | `chat/components/DraggableVideoPlayer.tsx` | Draggable video | (props-based) |

---

### ⚙️ UTILITY COMPONENTS

| Component | Location | Purpose | Connected Hooks |
|-----------|----------|---------|-----------------|
| **SettingsDialog** | `chat/components/SettingsDialog.tsx` | Settings UI | useAIElements |
| **StatusIndicator** | `chat/components/StatusIndicator.tsx` | Connection status | (props-based) |
| **PermissionExplanationDialog** | `chat/components/PermissionExplanationDialog.tsx` | Permission help | (none) |
| **BottomSheet** | `chat/components/BottomSheet.tsx` | Mobile modal | (none) |

---

### 🤝 INTEGRATION COMPONENTS

| Component | Location | Purpose | Connected Hooks |
|-----------|----------|---------|-----------------|
| **MeetingOverlay** | `meeting/MeetingOverlay.tsx` | Cal.com embed | (none) |

---

## AI Elements Components

### 🎨 Core Elements

| Component | Location | Purpose |
|-----------|----------|---------|
| **Message** | `ai-elements/core/message.tsx` | Message wrapper |
| **MessageContent** | `ai-elements/core/message.tsx` | Content container |
| **MessageAvatar** | `ai-elements/core/message.tsx` | Avatar display |
| **Response** | `ai-elements/core/response.tsx` | Response wrapper |
| **Loader** | `ai-elements/core/loader.tsx` | Loading indicator |
| **Conversation** | `ai-elements/core/conversation.tsx` | Conversation container |

### 🧠 Reasoning Elements

| Component | Location | Purpose |
|-----------|----------|---------|
| **Reasoning** | `ai-elements/reasoning/reasoning.tsx` | Collapsible reasoning |
| **ChainOfThought** | `ai-elements/reasoning/chain-of-thought.tsx` | Step-by-step thinking |
| **Task** | `ai-elements/reasoning/task.tsx` | Task tracking |

### 📚 Source Elements

| Component | Location | Purpose |
|-----------|----------|---------|
| **Sources** | `ai-elements/sources/sources.tsx` | Citation list |
| **InlineCitation** | `ai-elements/sources/inline-citation.tsx` | Inline reference |
| **Context** | `ai-elements/sources/context.tsx` | Contextual info |

### 🛠️ Tool Elements

| Component | Location | Purpose |
|-----------|----------|---------|
| **Tool** | `ai-elements/tools/tool.tsx` | Tool execution display |
| **Branch** | `ai-elements/tools/branch.tsx` | Conversation branching |

### 📦 Content Elements

| Component | Location | Purpose |
|-----------|----------|---------|
| **Artifact** | `ai-elements/content/artifact.tsx` | Rich content card |
| **CodeBlock** | `ai-elements/content/code-block.tsx` | Code display |
| **Image** | `ai-elements/content/image.tsx` | Image viewer |
| **WebPreview** | `ai-elements/content/web-preview.tsx` | URL preview |

### 🎯 Interactive Elements

| Component | Location | Purpose |
|-----------|----------|---------|
| **Actions** | `ai-elements/interactive/actions.tsx` | Action buttons |
| **Suggestion** | `ai-elements/interactive/suggestion.tsx` | Suggestion chips |
| **PromptInput** | `ai-elements/interactive/prompt-input.tsx` | Advanced input |

---

## Hooks Reference

### 🎯 Core Chat Hooks

| Hook | Location | Purpose | Key Functions |
|------|----------|---------|---------------|
| **useChatState** | `chat/hooks/useChatState.ts` | UI state | toggleChat, toggleMinimize, toggleExpand, toggleScreenShare |
| **useChatMessages** | `chat/hooks/useChatMessages.ts` | Message mgmt | handleSendMessage, appendVoiceMessage, uploadAttachments |
| **useChatIntelligence** | `chat/hooks/useChatIntelligence.ts` | AI context | handleTermsAcceptance, initialiseSession, fetchSuggestions |
| **useConversationFlow** | `chat/hooks/useConversationFlow.ts` | Analytics | (analyzes conversation patterns) |

### 🎤 Media Hooks

| Hook | Location | Purpose | Key Functions |
|------|----------|---------|---------------|
| **useRealtimeVoice** | `hooks/useRealtimeVoice.ts` | Voice session | startSession, stopSession, sendMessage |
| **useMediaRecorderVoice** | `hooks/useMediaRecorderVoice.ts` | Audio recording | startRecording, stopRecording |
| **useCamera** | `hooks/useCamera.ts` | Camera capture | startCamera, stopCamera, captureFrame, switchCamera |
| **useMicLevel** | `hooks/useMicLevel.ts` | Mic monitoring | (returns level value) |

### 🔧 Utility Hooks

| Hook | Location | Purpose | Key Functions |
|------|----------|---------|---------------|
| **useUnifiedChat** | `hooks/useUnifiedChat.ts` | Core chat API | sendMessage, regenerate, stop, addToolResult |
| **useAIElements** | `hooks/useAIElements.ts` | AI config | (returns config object) |
| **useMediaToggle** | `hooks/useMediaToggle.ts` | Media controls | handleToggle |
| **useMediaKeyboardShortcuts** | `hooks/useMediaKeyboardShortcuts.ts` | Shortcuts | (attaches listeners) |

---

## Hook → Component Connections

### useChatState Used By:
- ✅ ChatInterface (primary)
- ✅ ChatContainer
- ✅ ChatHeader
- ✅ MinimizedChatBar
- ✅ ChatInput (screen share state)
- ✅ ScreenDisplay, ScreenPopover, ScreenFullScreen

### useChatMessages Used By:
- ✅ ChatInterface (primary)
- ✅ ChatMessages (message display)
- ✅ ChatInput (send handler)

### useChatIntelligence Used By:
- ✅ ChatInterface (primary)
- ✅ ChatMessages (context, terms)
- ✅ ChatSuggestions (suggestions)
- ✅ ChatTermsAcceptance (form handling)

### useRealtimeVoice Used By:
- ✅ ChatInterface (primary)
- ✅ ChatInput (voice state)
- ✅ VoiceDisplay, VoicePopover, VoiceFullScreen
- ✅ LiveTranscriptPanel
- ✅ VoiceButton

### useCamera Used By:
- ✅ ChatInterface (primary)
- ✅ ChatInput (camera state)
- ✅ CameraDisplay, CameraPopover, CameraFullScreen

### useUnifiedChat Used By:
- ✅ useChatMessages (internally)
- ✅ useConversationalIntelligence (deprecated, uses internally)

---

## Data Flow Diagrams

### Message Send Flow
```
User Input (ChatInput)
    ↓
useChatMessages.handleSendMessage()
    ↓
[Attachments?] → uploadAttachments() → /api/chat/attachments
    ↓
useUnifiedChat.sendMessage()
    ↓
POST /api/chat/unified (SSE)
    ↓
Stream chunks received
    ↓
Messages updated
    ↓
ChatMessages re-renders
```

### Voice Flow
```
User clicks VoiceButton
    ↓
useRealtimeVoice.startSession()
    ↓
WebSocket connects
    ↓
useMediaRecorderVoice.startRecording()
    ↓
Audio chunks → WebSocket
    ↓
Server responses:
  - transcript
  - audio
  - model_turn
    ↓
useChatMessages.appendVoiceMessage()
    ↓
VoiceDisplay + LiveTranscriptPanel update
```

### Camera Flow
```
User clicks camera button
    ↓
useCamera.startCamera()
    ↓
navigator.mediaDevices.getUserMedia()
    ↓
Stream renders in CameraDisplay
    ↓
Auto-capture timer
    ↓
useCamera.captureFrame()
    ↓
Canvas capture → compression
    ↓
POST /api/intelligence/webcam-analysis
    ↓
Analysis added to context
```

### Screen Share Flow
```
User clicks screen share
    ↓
useChatState.startScreenShare()
    ↓
navigator.mediaDevices.getDisplayMedia()
    ↓
Screen picker shown
    ↓
Stream captured
    ↓
ScreenDisplay shows preview
    ↓
DraggableVideoPlayer shows floating view
```

---

## Props Flow Map

### ChatInterface Props Flow

```
ChatInterface
│
├─→ ChatContainer
│   └── chatState: useChatState().chatState
│
├─→ ChatHeader
│   ├── isExpanded: chatState.isExpanded
│   ├── isMinimized: chatState.isMinimized
│   ├── onToggleMinimize: chatStateHook.toggleMinimize
│   ├── onToggleExpand: chatStateHook.toggleExpand
│   ├── onClose: chatStateHook.toggleChat
│   └── onToggleSettings: chatStateHook.toggleSettings
│
├─→ ChatMessages
│   ├── messages: messagesHook.messages
│   ├── enhancedMessages: messagesHook.enhancedMessages
│   ├── researchSummaries: messagesHook.researchSummaries
│   ├── isLoading: messagesHook.isLoading
│   ├── contextReady: intelligenceHook.contextReady
│   ├── currentContext: intelligenceHook.currentContext
│   ├── hasAcceptedTerms: intelligenceHook.hasAcceptedTerms
│   ├── onSendMessage: messagesHook.handleSendMessage
│   ├── aiElements: aiConfig
│   ├── artifacts: artifactCards
│   ├── transcriptEntries: transcriptEntries
│   └── terms props: intelligenceHook.*
│
└─→ ChatInput
    ├── inputValue: messagesHook.inputValue
    ├── isLoading: messagesHook.isLoading
    ├── isListening: chatState.isListening
    ├── voiceTranscript: audioHook.transcript
    ├── voicePartialTranscript: audioHook.partialTranscript
    ├── isVoiceActive: audioHook.isRecording
    ├── isVoiceProcessing: audioHook.isProcessing
    ├── isVoiceSupported: audioHook.isVoiceSupported
    ├── cameraState: chatState.isCameraActive
    ├── cameraStream: chatState.cameraStream
    ├── isScreenSharing: chatState.isScreenSharing
    ├── screenShareStream: chatState.screenShareStream
    ├── onInputChange: messagesHook.setInputValue
    ├── onSendMessage: messagesHook.handleSendMessage
    ├── onToggleVoice: toggleVoiceSession
    ├── onToggleCamera: handleToggleCamera
    ├── onToggleScreenShare: chatStateHook.toggleScreenShare
    └── ... (all other media/action handlers)
```

---

## State Architecture

### State Sources

| State | Hook | Storage | Persistence |
|-------|------|---------|-------------|
| UI State | useChatState | React state | None |
| Messages | useChatMessages → useUnifiedChat | React state + store | None |
| Intelligence | useChatIntelligence | React state | localStorage (terms) |
| Voice Session | useRealtimeVoice | React state | None |
| Camera | useCamera | React state | None |
| AI Config | useAIElements | React state | None |

### Global Stores

| Store | Location | Purpose |
|-------|----------|---------|
| **unified-chat-store** | `core/chat/state/unified-chat-store.ts` | Synced chat state |

---

## API Endpoints Map

| Endpoint | Method | Used By | Purpose |
|----------|--------|---------|---------|
| `/api/chat/unified` | POST (SSE) | useUnifiedChat | Main chat |
| `/api/chat/attachments` | POST | useChatMessages | File uploads |
| `/api/intelligence/session-init` | POST | useChatIntelligence | Init session |
| `/api/intelligence/suggestions` | POST | useChatIntelligence | Get suggestions |
| `/api/intelligence/webcam-analysis` | POST | useCamera | Analyze frames |
| `/api/research/initial-context` | POST | useChatIntelligence | Background research |
| `/api/usage/:sessionId` | GET | ChatInterface | Usage stats |
| `/api/export-summary` | POST | useChatMessages | PDF export |
| `ws://.../live` | WebSocket | useRealtimeVoice | Voice session |

---

## File Structure Tree

```
src/
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx ⭐ MAIN ENTRY
│   │   ├── components/
│   │   │   ├── ChatContainer.tsx
│   │   │   ├── ChatHeader.tsx
│   │   │   ├── ChatMessages.tsx ⭐ MESSAGE RENDERER
│   │   │   ├── ChatInput.tsx ⭐ INPUT HANDLER
│   │   │   ├── ChatSuggestions.tsx
│   │   │   ├── ChatTermsAcceptance.tsx
│   │   │   ├── LiveTranscriptPanel.tsx
│   │   │   ├── MinimizedChatBar.tsx
│   │   │   ├── ToolsMenu.tsx
│   │   │   ├── ActionsMenu.tsx
│   │   │   ├── VoiceButton.tsx
│   │   │   ├── VoiceWaveform.tsx
│   │   │   ├── SettingsDialog.tsx
│   │   │   ├── StatusIndicator.tsx
│   │   │   ├── MediaPopover.tsx
│   │   │   ├── MediaControlsOverlay.tsx
│   │   │   ├── DraggableVideoPlayer.tsx
│   │   │   ├── PermissionExplanationDialog.tsx
│   │   │   ├── BottomSheet.tsx
│   │   │   ├── voice/
│   │   │   │   ├── VoiceDisplay.tsx
│   │   │   │   ├── VoicePopover.tsx
│   │   │   │   └── VoiceFullScreen.tsx
│   │   │   ├── camera/
│   │   │   │   ├── CameraDisplay.tsx
│   │   │   │   ├── CameraPopover.tsx
│   │   │   │   └── CameraFullScreen.tsx
│   │   │   └── screen/
│   │   │       ├── ScreenDisplay.tsx
│   │   │       ├── ScreenPopover.tsx
│   │   │       └── ScreenFullScreen.tsx
│   │   ├── hooks/
│   │   │   ├── useChatState.ts ⭐
│   │   │   ├── useChatMessages.ts ⭐
│   │   │   ├── useChatIntelligence.ts ⭐
│   │   │   └── useConversationFlow.ts
│   │   ├── types/
│   │   │   └── chatTypes.ts
│   │   ├── constants/
│   │   │   └── chatConstants.ts
│   │   ├── SessionLimitWarning.tsx
│   │   └── ... (design tokens, etc.)
│   │
│   ├── ai-elements/
│   │   ├── core/
│   │   │   ├── message.tsx ⭐
│   │   │   ├── response.tsx
│   │   │   ├── conversation.tsx
│   │   │   └── loader.tsx
│   │   ├── reasoning/
│   │   │   ├── reasoning.tsx
│   │   │   ├── chain-of-thought.tsx
│   │   │   └── task.tsx
│   │   ├── sources/
│   │   │   ├── sources.tsx
│   │   │   ├── inline-citation.tsx
│   │   │   └── context.tsx
│   │   ├── tools/
│   │   │   ├── tool.tsx
│   │   │   └── branch.tsx
│   │   ├── content/
│   │   │   ├── artifact.tsx
│   │   │   ├── code-block.tsx
│   │   │   ├── image.tsx
│   │   │   └── web-preview.tsx
│   │   ├── interactive/
│   │   │   ├── actions.tsx
│   │   │   ├── suggestion.tsx
│   │   │   ├── prompt-input.tsx ⭐
│   │   │   └── open-in-chat.tsx
│   │   └── index.ts
│   │
│   └── meeting/
│       └── MeetingOverlay.tsx
│
├── hooks/
│   ├── useUnifiedChat.ts ⭐ CORE API
│   ├── useRealtimeVoice.ts ⭐ VOICE
│   ├── useMediaRecorderVoice.ts
│   ├── useCamera.ts ⭐ CAMERA
│   ├── useMicLevel.ts
│   ├── useAIElements.ts
│   ├── useMediaToggle.ts
│   ├── useMediaKeyboardShortcuts.ts
│   └── useConversationalIntelligence.ts (deprecated)
│
└── types/
    ├── chat-enhanced.ts ⭐
    └── attachments.ts
```

---

## Quick Command Reference

### Starting the App
```bash
pnpm dev:all          # Start everything
pnpm dev:all:clean    # Clean start
```

### Key Files to Modify

| Task | Files to Edit |
|------|---------------|
| **Add message feature** | ChatMessages.tsx, chat-enhanced.ts |
| **Add media feature** | ChatInput.tsx, useChatState.ts |
| **Add AI element** | ai-elements/*, ChatMessages.tsx |
| **Modify voice** | useRealtimeVoice.ts, VoiceDisplay.tsx |
| **Modify camera** | useCamera.ts, CameraDisplay.tsx |
| **Add hook** | hooks/*, ChatInterface.tsx |
| **Add API endpoint** | app/api/*, useUnifiedChat.ts |

---

**Document Version:** 1.0  
**For detailed information, see:** `CHAT_PIPELINE_ARCHITECTURE.md`

