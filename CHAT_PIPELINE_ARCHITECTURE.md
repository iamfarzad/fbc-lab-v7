# Chat Pipeline Architecture - Complete Component Categorization

> **Generated:** October 14, 2025  
> **Purpose:** Comprehensive mapping of all chat components, their connections, hooks, and functions

---

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Component Categories](#component-categories)
3. [Hook Dependencies](#hook-dependencies)
4. [Data Flow](#data-flow)
5. [Type System](#type-system)

---

## Core Architecture

### Entry Point
**ChatInterface** (`src/components/chat/ChatInterface.tsx`)
- **Role:** Main orchestrator component
- **State Management:** Aggregates all hooks
- **Key Responsibilities:**
  - Session initialization
  - Hook orchestration
  - Media state coordination
  - Context management

---

## Component Categories

### 1. CONTAINER & LAYOUT COMPONENTS

#### 1.1 ChatContainer
**File:** `src/components/chat/components/ChatContainer.tsx`

**Purpose:** Manages chat window states (minimized, normal, expanded)

**Props:**
- `chatState` - Current chat state object
- `children` - React children to render

**Functions:**
- `getContainerClasses()` - Computes responsive CSS classes based on state

**Styling Logic:**
- Mobile-first responsive design
- Safe area insets for mobile devices
- Desktop floating window with shadows
- Monochrome theme overrides

**Connections:**
- Receives state from `useChatState` hook
- Wraps all chat UI components

---

#### 1.2 ChatHeader
**File:** `src/components/chat/components/ChatHeader.tsx`

**Purpose:** Top bar with controls and status

**Props:**
- `isExpanded`, `isMinimized` - Layout state
- `onToggleMinimize`, `onToggleExpand`, `onClose` - Action handlers
- `onToggleSettings` - Settings dialog control

**Features:**
- Window control buttons (minimize, expand, close)
- Settings access
- Responsive layout adjustments

**Connections:**
- Connected to `chatStateHook` actions
- Triggers state changes in parent

---

#### 1.3 MinimizedChatBar
**File:** `src/components/chat/components/MinimizedChatBar.tsx`

**Purpose:** Compact view when chat is minimized

**Features:**
- Shows unread count
- Quick expand button
- Status indicators

**Connections:**
- Controlled by `chatState.isMinimized`
- Triggers expand via `toggleMinimize()`

---

### 2. MESSAGE DISPLAY COMPONENTS

#### 2.1 ChatMessages
**File:** `src/components/chat/components/ChatMessages.tsx`

**Purpose:** Main message rendering engine

**Props:**
```typescript
{
  messages: ChatMessage[]
  enhancedMessages: EnhancedChatMessage[]
  researchSummaries: ResearchSummary[]
  isLoading: boolean
  contextReady: boolean
  currentContext: Context
  hasAcceptedTerms: boolean
  onSendMessage: (message: string) => void
  aiElements: AIElementConfig
  isExpanded: boolean
  isMinimized: boolean
  artifacts: StreamedArtifact[]
  transcriptEntries: TranscriptEntry[]
  name, email, agreed // Terms acceptance
  onNameChange, onEmailChange, onAgreedChange
  onAcceptTerms: () => void
}
```

**Key Functions:**
- `renderMessage()` - Renders individual message with AI elements
- `renderArtifacts()` - Displays research/code artifacts
- `renderTranscripts()` - Shows voice conversation entries
- `renderEmptyState()` - Welcome screen with suggestions

**AI Elements Integration:**
- Uses `Message`, `MessageContent`, `MessageAvatar` from ai-elements
- Renders `Reasoning`, `Sources`, `Tools`, `CodeBlock`
- Displays `ChainOfThought`, `Context`, `Tasks`
- Shows `InlineCitation`, `Image`, `WebPreview`

**Connections:**
- Receives data from `useChatMessages` hook
- Uses `useChatIntelligence` for context
- Integrates with `useArtifacts` for artifact cards

---

#### 2.2 Message Components (AI Elements)

##### Message Core (`src/components/ai-elements/core/message.tsx`)
- **Message** - Wrapper with role-based styling
- **MessageContent** - Content container with variants (flat/elevated)
- **MessageAvatar** - User/assistant avatar display

##### Reasoning (`src/components/ai-elements/reasoning/`)
- **Reasoning** - Collapsible reasoning display
- **ReasoningTrigger** - Toggle button
- **ReasoningContent** - Reasoning text content
- **ChainOfThought** - Step-by-step reasoning
- **ChainOfThoughtHeader** - CoT title
- **ChainOfThoughtStep** - Individual step
- **ChainOfThoughtContent** - Step details

##### Sources (`src/components/ai-elements/sources/`)
- **Sources** - Citation display
- **SourcesTrigger** - Show sources button
- **SourcesContent** - Source list
- **Source** - Individual citation
- **Context** - Contextual information display
- **InlineCitation** - Inline reference markers

##### Code & Tools (`src/components/ai-elements/`)
- **CodeBlock** - Syntax highlighted code
- **CodeBlockCopyButton** - Copy to clipboard
- **Tool** - Tool execution display
- **ToolHeader**, **ToolContent**, **ToolInput**, **ToolOutput**

##### Content (`src/components/ai-elements/content/`)
- **Artifact** - Rich content cards
- **Image** - Image display with lazy loading
- **WebPreview** - URL preview cards

##### Interactive (`src/components/ai-elements/interactive/`)
- **Actions** - Action button groups
- **Suggestion** - Quick suggestion chips
- **PromptInput** - Advanced input component (used in ChatInput)

---

### 3. INPUT & INTERACTION COMPONENTS

#### 3.1 ChatInput
**File:** `src/components/chat/components/ChatInput.tsx`

**Purpose:** Message input with multimodal controls

**Props:**
```typescript
{
  inputValue: string
  isLoading: boolean
  isListening: boolean
  voiceTranscript: string
  voicePartialTranscript: string
  voiceError: string | null
  isVoiceActive: boolean
  isVoiceProcessing: boolean
  isVoiceSupported: boolean
  isVoiceInitializing: boolean
  cameraState: boolean
  isCameraInitializing: boolean
  isScreenSharing: boolean
  isScreenShareInitializing: boolean
  cameraStream: MediaStream | null
  screenShareStream: MediaStream | null
  screenThumbnail: string | null
  cameraError: string | null
  screenShareError: string | null
  availableCameras: number
  onInputChange: (value: string) => void
  onSendMessage: (payload: SendMessagePayload) => void
  onToggleVoice: () => void
  onToggleCamera: () => void
  onToggleScreenShare: () => void
  onSwitchCamera: () => void
  onToggleSettings: () => void
  isExpanded: boolean
  isMinimized: boolean
  onOpenMeeting: () => void
  onExportSummary: () => void
  sessionIdForExport: string
  autoOpenPopover: string | null
  onAutoOpenPopoverHandled: () => void
}
```

**Key Functions:**
- `handleSubmit()` - Processes message send with attachments
- `getPlaceholder()` - Dynamic placeholder text
- Attachment handling via `usePromptInputAttachments`

**Subcomponents Used:**
- `PromptInput` (AI Elements) - Main input wrapper
- `PromptInputTextarea` - Auto-resizing textarea
- `PromptInputToolbar` - Action buttons
- `VoiceButton` - Voice control
- `ToolsMenu` - Media controls menu
- `ActionsMenu` - Additional actions

**Media Integration:**
- `VoicePopover` / `VoiceFullScreen` - Voice UI
- `CameraPopover` / `CameraFullScreen` - Camera UI
- `ScreenPopover` / `ScreenFullScreen` - Screen share UI
- `MediaPopover` - Unified media control

**Connections:**
- Receives all state from `ChatInterface`
- Calls `messagesHook.handleSendMessage()`
- Integrates with `useMediaToggle`, `useMediaKeyboardShortcuts`

---

#### 3.2 ChatSuggestions
**File:** `src/components/chat/components/ChatSuggestions.tsx`

**Purpose:** Quick suggestion chips

**Props:**
- `suggestions: string[]`
- `contextReady: boolean`
- `currentContext: Context`
- `onSendMessage: (text: string) => void`

**Features:**
- Context-aware suggestions
- Click to send message
- Smooth animations

**Connections:**
- Rendered in `ChatMessages` empty state
- Uses suggestions from `useChatIntelligence`

---

#### 3.3 ChatTermsAcceptance
**File:** `src/components/chat/components/ChatTermsAcceptance.tsx`

**Purpose:** Terms of service acceptance form

**Props:**
- `name`, `email`, `agreed`
- `onNameChange`, `onEmailChange`, `onAgreedChange`
- `onAcceptTerms: () => void`

**Features:**
- Email validation
- Consent checkbox
- Name collection

**Connections:**
- Managed by `useChatIntelligence`
- Triggers session initialization on acceptance

---

### 4. MEDIA COMPONENTS

#### 4.1 Voice Components

##### VoiceButton (`src/components/chat/components/VoiceButton.tsx`)
- Dedicated voice toggle button
- Shows recording state
- Mic level indicator integration

##### VoiceDisplay (`src/components/chat/components/voice/VoiceDisplay.tsx`)
- Shows transcript text
- Partial transcript (real-time)
- Error display
- Processing indicator

##### VoicePopover (`src/components/chat/components/voice/VoicePopover.tsx`)
- Popover view of voice UI
- Quick access from input bar

##### VoiceFullScreen (`src/components/chat/components/voice/VoiceFullScreen.tsx`)
- Full-screen voice interface
- Enhanced visualization
- Transcript history

##### VoiceWaveform (`src/components/chat/components/VoiceWaveform.tsx`)
- Audio visualization
- Real-time waveform
- Mic level display

**Voice Hook Connection:**
- All connected to `useRealtimeVoice` hook
- Receive transcript updates via callbacks
- Control recording state

---

#### 4.2 Camera Components

##### CameraDisplay (`src/components/chat/components/camera/CameraDisplay.tsx`)
- Video preview
- Capture controls
- Device switching

##### CameraPopover (`src/components/chat/components/camera/CameraPopover.tsx`)
- Compact camera view
- Quick toggle

##### CameraFullScreen (`src/components/chat/components/camera/CameraFullScreen.tsx`)
- Full camera interface
- Advanced controls

**Camera Hook Connection:**
- Connected to `useCamera` hook
- Stream management
- Capture handling

---

#### 4.3 Screen Share Components

##### ScreenDisplay (`src/components/chat/components/screen/ScreenDisplay.tsx`)
- Screen preview
- Stop controls

##### ScreenPopover (`src/components/chat/components/screen/ScreenPopover.tsx`)
- Compact screen view

##### ScreenFullScreen (`src/components/chat/components/screen/ScreenFullScreen.tsx`)
- Full screen share view

**Screen Share Hook Connection:**
- Managed by `useChatState`
- Uses `startScreenShare()`, `stopScreenShare()`

---

#### 4.4 Media Control Components

##### MediaPopover (`src/components/chat/components/MediaPopover.tsx`)
- Unified media control panel
- Shows all active media
- Quick toggles

##### MediaControlsOverlay (`src/components/chat/components/MediaControlsOverlay.tsx`)
- Floating media controls
- Always accessible
- Minimal UI

##### DraggableVideoPlayer (`src/components/chat/components/DraggableVideoPlayer.tsx`)
- Draggable video window
- Picture-in-picture style
- Resizable

**Connections:**
- Integrates all media states
- Uses `useMediaToggle` for interactions

---

### 5. SUPPORTING COMPONENTS

#### 5.1 LiveTranscriptPanel
**File:** `src/components/chat/components/LiveTranscriptPanel.tsx`

**Purpose:** Real-time voice transcript display

**Props:**
- `isVisible: boolean`
- `transcripts: TranscriptEntry[]`
- `className?: string`

**Features:**
- Auto-scroll to latest
- User/assistant differentiation
- Partial transcript highlighting

**Connections:**
- Receives data from `useRealtimeVoice`
- Rendered conditionally in `ChatInterface`

---

#### 5.2 SessionLimitWarning
**File:** `src/components/chat/SessionLimitWarning.tsx`

**Purpose:** Usage limit notifications

**Props:**
- `sessionId: string`
- `usage: UsageData`

**Features:**
- Token usage display
- Warning thresholds
- Upgrade prompts

**Connections:**
- Fetches usage from `/api/usage/${sessionId}`
- Polled every 10 seconds

---

#### 5.3 StatusIndicator
**File:** `src/components/chat/components/StatusIndicator.tsx`

**Purpose:** Connection status display

**Features:**
- Online/offline indicator
- Processing state
- Error state

---

#### 5.4 SettingsDialog
**File:** `src/components/chat/components/SettingsDialog.tsx`

**Purpose:** Chat settings configuration

**Features:**
- AI element toggles
- Theme selection
- Preferences

**Connections:**
- Controlled by `chatState.showSettings`
- Uses `useAIElements` for configuration

---

#### 5.5 PermissionExplanationDialog
**File:** `src/components/chat/components/PermissionExplanationDialog.tsx`

**Purpose:** Explains media permissions

**Features:**
- Permission guides
- Troubleshooting
- Browser-specific instructions

---

#### 5.6 ToolsMenu
**File:** `src/components/chat/components/ToolsMenu.tsx`

**Purpose:** Media tools dropdown menu

**Features:**
- Voice toggle
- Camera toggle
- Screen share toggle
- File upload

---

#### 5.7 ActionsMenu
**File:** `src/components/chat/components/ActionsMenu.tsx`

**Purpose:** Additional chat actions

**Features:**
- Export summary
- Open meeting
- Settings

---

#### 5.8 BottomSheet
**File:** `src/components/chat/components/BottomSheet.tsx`

**Purpose:** Mobile bottom sheet component

**Features:**
- Swipeable modal
- Mobile-optimized

---

### 6. MEETING & INTEGRATION COMPONENTS

#### 6.1 MeetingOverlay
**File:** `src/components/meeting/MeetingOverlay.tsx`

**Purpose:** Cal.com integration overlay

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `calLink?: string`

**Features:**
- Embedded calendar booking
- Context-aware meeting scheduling

**Connections:**
- Triggered by meeting keywords in messages
- Uses `CHAT_CONSTANTS.MEETING_KEYWORDS`

---

## Hook Dependencies

### 1. useChatState
**File:** `src/components/chat/hooks/useChatState.ts`

**Purpose:** Core chat UI state management

**State:**
```typescript
{
  isOpen: boolean
  isMinimized: boolean
  isExpanded: boolean
  isScreenSharing: boolean
  isCameraActive: boolean
  isListening: boolean
  showSettings: boolean
  screenShareStream: MediaStream | null
  cameraStream: MediaStream | null
  screenShareError: string | null
  cameraError: string | null
  isCameraInitializing: boolean
  isScreenShareInitializing: boolean
}
```

**Functions:**
- `toggleChat()` - Open/close chat
- `toggleMinimize()` - Toggle minimized state
- `toggleExpand()` - Toggle expanded state
- `toggleScreenShare()` - Start/stop screen share
- `toggleSettings()` - Show/hide settings
- `setListening(boolean)` - Update voice state
- `startScreenShare()` - Initialize screen sharing
- `stopScreenShare()` - Stop and cleanup screen share

**Dependencies:**
- Uses `navigator.mediaDevices.getDisplayMedia` for screen capture
- Toast notifications for errors

---

### 2. useChatMessages
**File:** `src/components/chat/hooks/useChatMessages.ts`

**Purpose:** Message management and sending logic

**State:**
```typescript
{
  messages: ChatMessage[]
  enhancedMessages: EnhancedChatMessage[]
  researchSummaries: ResearchSummary[]
  isLoading: boolean
  inputValue: string
  sessionId: string
}
```

**Functions:**
- `handleSendMessage(payload)` - Send text/attachments
- `handleExportSummary(request)` - Export PDF summary
- `updateChatContext(context)` - Update context
- `appendVoiceUserMessage(text)` - Add voice message
- `appendVoiceAssistantChunk(chunk)` - Stream voice response
- `finalizeVoiceAssistantMessage()` - Complete voice message
- `exportVoiceTranscript()` - Export voice data
- `uploadAttachments(files)` - Handle file uploads

**Key Logic:**
- Uses `useUnifiedChat` internally for HTTP transport
- Converts unified messages to chat messages
- Extracts enhanced metadata (sources, reasoning, tools, etc.)
- Manages research summaries
- Handles attachments via `/api/chat/attachments`
- Integrates conversation flow tracking
- Safety category detection

**Dependencies:**
- `useUnifiedChat` - Core chat API integration
- `useConversationFlow` - Conversation analytics
- `uploadAttachments` - File upload handler

---

### 3. useChatIntelligence
**File:** `src/components/chat/hooks/useChatIntelligence.ts`

**Purpose:** AI context and personalization

**State:**
```typescript
{
  contextReady: boolean
  currentContext: { company, person } | null
  hasAcceptedTerms: boolean
  suggestions: string[]
  agreed: boolean
  name: string
  email: string
  sessionId: string
}
```

**Functions:**
- `handleTermsAcceptance()` - Process terms acceptance
- `initialiseSession()` - Initialize AI session
- `fetchSuggestions()` - Get personalized suggestions

**Key Logic:**
- Terms acceptance stored in localStorage
- Triggers background research on acceptance
- Initializes usage limits
- Fetches context from `/api/intelligence/session-init`
- Gets suggestions from `/api/intelligence/suggestions`

**Dependencies:**
- Usage limiter initialization
- Background research API

---

### 4. useRealtimeVoice
**File:** `src/hooks/useRealtimeVoice.ts`

**Purpose:** Real-time voice communication

**State:**
```typescript
{
  session: VoiceSession | null
  isSocketReady: boolean
  isSessionActive: boolean
  isProcessing: boolean
  transcript: string
  partialTranscript: string
  modelReplies: string[]
  error: string | null
  isRecording: boolean
  isVoiceSupported: boolean
}
```

**Functions:**
- `startSession()` - Begin voice session
- `stopSession()` - End voice session
- `sendMessage(message)` - Send WebSocket message
- `toggleRecording()` - Start/stop recording

**Key Components:**
- WebSocket connection to live server
- Audio streaming queue for playback
- Media recorder integration via `useMediaRecorderVoice`
- Server event handling (setup, audio, transcript, tools, etc.)
- Auto-reconnect logic

**Server Events Handled:**
- `session_started` - Session initialization
- `audio` - Audio playback data
- `transcript` - User speech recognition
- `model_turn` - Assistant response chunks
- `turn_complete` - Response finished
- `tool_call`, `tool_result` - Tool execution
- `error` - Error handling

**Dependencies:**
- `useMediaRecorderVoice` - Audio recording
- `AudioStreamingQueue` - Audio playback
- WebSocket server connection

---

### 5. useCamera
**File:** `src/hooks/useCamera.ts`

**Purpose:** Camera capture and streaming

**State:**
```typescript
{
  isActive: boolean
  isInitializing: boolean
  stream: MediaStream | null
  error: string | null
  availableDevices: MediaDeviceInfo[]
  currentDeviceId: string
}
```

**Functions:**
- `startCamera(deviceId?)` - Start camera with device selection
- `stopCamera()` - Stop and cleanup camera
- `switchCamera()` - Switch between cameras
- `captureFrame()` - Capture single frame
- `startAutoCapture()` - Begin auto-capture timer
- `stopAutoCapture()` - Stop auto-capture
- `sendToVoiceSession(imageData)` - Send frame to voice session

**Key Features:**
- Auto-capture with configurable interval (default 12s)
- Frame compression with quality control
- Black frame detection and retry logic
- Analysis integration via `/api/intelligence/webcam-analysis`
- Real-time input to voice session (prototype pattern)
- Device enumeration and switching
- Metrics tracking (capture count, failures, avg time)

**Dependencies:**
- `navigator.mediaDevices.getUserMedia`
- Canvas API for frame capture

---

### 6. useUnifiedChat
**File:** `src/hooks/useUnifiedChat.ts`

**Purpose:** Core unified chat API integration

**State:**
```typescript
{
  messages: UnifiedMessage[]
  isLoading: boolean
  isStreaming: boolean
  error: Error | null
  context: UnifiedContext
}
```

**Functions:**
- `sendMessage(content)` - Send message via HTTP
- `addMessage(message)` - Add message locally
- `setMessages(messages)` - Replace all messages
- `updateContext(context)` - Update context
- `regenerate(messageId)` - Regenerate response
- `stop()` - Abort current request
- `resumeStream(runId)` - Resume interrupted stream
- `addToolResult(toolCallId, result)` - Add tool execution result
- `clearError()` - Clear error state

**Key Features:**
- HTTP-based chat (no WebSocket for text chat)
- Server-Sent Events (SSE) for streaming
- Message normalization
- Store synchronization via `unified-chat-store`
- Abort controller for request cancellation
- Tool result handling

**API Integration:**
- POST `/api/chat/unified` - Main chat endpoint
- Streaming response parsing
- Context propagation

---

### 7. useMediaRecorderVoice
**File:** `src/hooks/useMediaRecorderVoice.ts`

**Purpose:** Audio recording with format conversion

**State:**
```typescript
{
  isSupported: boolean
  isRecording: boolean
  isProcessing: boolean
  error: string | null
}
```

**Functions:**
- `startRecording(options)` - Begin audio capture
- `stopRecording()` - End capture
- `resetRecording()` - Clear state

**Key Features:**
- Tries AudioWorklet first (PCM16 @ 16kHz)
- Falls back to MediaRecorder (WebM)
- Real-time chunk delivery via callback
- Sample rate conversion
- MIME type detection

**Dependencies:**
- AudioWorklet for PCM encoding
- MediaRecorder API
- Audio resampling utilities

---

### 8. useConversationFlow
**File:** `src/components/chat/hooks/useConversationFlow.ts`

**Purpose:** Conversation analytics and categorization

**Analyzes:**
- Message intent and categories
- Conversation depth
- Topic coverage
- Engagement patterns

**Returns:**
```typescript
{
  coverageOrder: Array<{ category, firstTurnIndex, firstMessageId, firstTimestamp }>
  firstUserTimestamp: number | null
}
```

**Categories Detected:**
- Greeting, question, statement, request
- Technical vs. business topics
- Intent signals (meeting, pricing, etc.)

---

### 9. useAIElements
**File:** `src/hooks/useAIElements.ts`

**Purpose:** AI element configuration management

**Manages:**
- Show/hide reasoning
- Show/hide sources
- Show/hide code blocks
- Enable citations, tasks, reactions, etc.

**Returns:** `AIElementConfig` object

---

### 10. Supporting Hooks

#### useMediaToggle (`src/hooks/useMediaToggle.ts`)
- Generic media toggle logic
- Permission checking
- Error handling

#### useMediaKeyboardShortcuts (`src/hooks/useMediaKeyboardShortcuts.ts`)
- Keyboard shortcuts for media
- Ctrl+M (voice), Ctrl+K (camera), Ctrl+Shift+S (screen)

#### useMicLevel (`src/hooks/useMicLevel.ts`)
- Microphone level monitoring
- Audio analyser integration
- Real-time level updates

---

## Data Flow

### 1. Message Send Flow

```
User types message
    ↓
ChatInput.onSubmit()
    ↓
useChatMessages.handleSendMessage()
    ↓
uploadAttachments() [if files present]
    ↓
useUnifiedChat.sendMessage()
    ↓
POST /api/chat/unified
    ↓
SSE stream response
    ↓
Message chunks streamed to UI
    ↓
ChatMessages renders updates
```

### 2. Voice Conversation Flow

```
User clicks voice button
    ↓
useRealtimeVoice.startSession()
    ↓
WebSocket connects to live server
    ↓
useMediaRecorderVoice.startRecording()
    ↓
Audio chunks captured
    ↓
Sent via WebSocket to server
    ↓
Server sends back:
  - transcript (user speech)
  - audio (assistant response)
  - model_turn (text chunks)
    ↓
useChatMessages.appendVoiceUserMessage()
useChatMessages.appendVoiceAssistantChunk()
    ↓
ChatMessages displays transcript
VoiceDisplay shows real-time updates
LiveTranscriptPanel shows history
    ↓
User stops voice
    ↓
useRealtimeVoice.stopSession()
    ↓
useChatMessages.finalizeVoiceAssistantMessage()
```

### 3. Camera Capture Flow

```
User clicks camera button
    ↓
useCamera.startCamera()
    ↓
Permission requested
    ↓
Stream starts
    ↓
Auto-capture timer begins (12s interval)
    ↓
useCamera.captureFrame()
    ↓
Canvas renders video frame
    ↓
Compression and format conversion
    ↓
POST /api/intelligence/webcam-analysis
    ↓
Analysis returned
    ↓
useChatMessages.updateChatContext()
    ↓
Optional: sendToVoiceSession() for real-time
```

### 4. Screen Share Flow

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
DraggableVideoPlayer displays stream
    ↓
ScreenDisplay shows preview
    ↓
Track 'ended' event listener attached
    ↓
User stops or stream ends
    ↓
useChatState.stopScreenShare()
    ↓
Cleanup and state reset
```

### 5. Terms Acceptance Flow

```
First visit
    ↓
ChatMessages shows ChatTermsAcceptance
    ↓
User fills name, email, agrees
    ↓
useChatIntelligence.handleTermsAcceptance()
    ↓
localStorage.setItem('fbc-terms-accepted', 'true')
    ↓
useChatIntelligence.initialiseSession()
    ↓
POST /api/intelligence/session-init
    ↓
Usage limits initialized
    ↓
Background research triggered
    ↓
Context ready, suggestions fetched
    ↓
ChatMessages shows suggestions
```

---

## Type System

### Core Types

#### ChatMessage (`src/components/chat/types/chatTypes.ts`)
```typescript
interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  type?: 'text' | 'voice' | 'image' | 'screen'
  metadata?: Record<string, any>
}
```

#### EnhancedChatMessage (`src/types/chat-enhanced.ts`)
```typescript
interface EnhancedChatMessage extends ChatMessage {
  metadata?: {
    sources?: Source[]
    reasoning?: string
    chainOfThought?: ChainOfThought
    codeBlocks?: CodeBlock[]
    toolInvocations?: ToolInvocation[]
    researchSummary?: ResearchSummary
    attachments?: ChatAttachment[]
    tasks?: Task[]
    images?: Image[]
    inlineCitations?: InlineCitation[]
    contextUsage?: ContextUsage
    webPreview?: WebPreview
    followUp?: string
  }
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error'
  isStreaming?: boolean
  error?: string
}
```

#### ChatState (`src/components/chat/types/chatTypes.ts`)
```typescript
interface ChatState {
  isOpen: boolean
  isMinimized: boolean
  isExpanded: boolean
  isScreenSharing: boolean
  isCameraActive: boolean
  isListening: boolean
  showSettings: boolean
  screenShareStream: MediaStream | null
  cameraStream: MediaStream | null
  screenShareError: string | null
  cameraError: string | null
  isCameraInitializing?: boolean
  isScreenShareInitializing?: boolean
}
```

#### UnifiedMessage (`src/core/chat/unified-types.ts`)
```typescript
interface UnifiedMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  type: 'text' | 'tool' | 'data'
  metadata?: Record<string, any>
}
```

#### UnifiedContext (`src/core/chat/unified-types.ts`)
```typescript
interface UnifiedContext {
  sessionId?: string
  enhancedResearch?: boolean
  conversationFlow?: ConversationFlowState
  attachments?: ChatAttachment[]
  multimodalData?: {
    audioData?: string
    imageData?: string
    screenData?: string
  }
  [key: string]: any
}
```

---

## Component Interaction Map

```
ChatInterface (Main Orchestrator)
├── ChatContainer
│   ├── ChatHeader
│   │   └── SettingsDialog
│   ├── ChatMessages
│   │   ├── ChatTermsAcceptance (conditional)
│   │   ├── ChatSuggestions (conditional)
│   │   ├── Message Components (AI Elements)
│   │   │   ├── Message
│   │   │   ├── MessageContent
│   │   │   ├── MessageAvatar
│   │   │   ├── Reasoning / ChainOfThought
│   │   │   ├── Sources / InlineCitation
│   │   │   ├── CodeBlock
│   │   │   ├── Tool
│   │   │   ├── Artifact
│   │   │   ├── Image
│   │   │   └── Task
│   │   ├── LiveTranscriptPanel (conditional)
│   │   └── SessionLimitWarning
│   └── ChatInput
│       ├── PromptInput (AI Elements)
│       │   ├── PromptInputTextarea
│       │   ├── PromptInputToolbar
│       │   └── PromptInputAttachments
│       ├── VoiceButton
│       ├── ToolsMenu
│       │   ├── VoicePopover / VoiceFullScreen
│       │   ├── CameraPopover / CameraFullScreen
│       │   └── ScreenPopover / ScreenFullScreen
│       └── ActionsMenu
├── DraggableVideoPlayer (floating)
├── MediaControlsOverlay (floating)
├── MeetingOverlay (conditional)
└── MinimizedChatBar (conditional)
```

---

## Hook Dependency Graph

```
ChatInterface
├── useChatState
│   └── Manages: UI state, screen share
├── useChatMessages
│   ├── useUnifiedChat
│   │   └── Calls: /api/chat/unified
│   ├── useConversationFlow
│   └── uploadAttachments → /api/chat/attachments
├── useChatIntelligence
│   └── Calls: /api/intelligence/*
├── useRealtimeVoice
│   ├── useMediaRecorderVoice
│   ├── AudioStreamingQueue
│   └── WebSocket: live server
├── useCamera
│   └── Calls: /api/intelligence/webcam-analysis
├── useAIElements
│   └── Manages: AI element config
└── useArtifacts (AI SDK)
    └── Manages: Artifact cards
```

---

## Key Constants & Configuration

### CHAT_CONSTANTS (`src/components/chat/constants/chatConstants.ts`)

```typescript
CHAT_CONSTANTS = {
  DEFAULT_SUGGESTIONS: string[]
  MEETING_KEYWORDS: string[]
  AUDIO: {
    TARGET_VOICE_SAMPLE_RATE: 16000
    VAD_SILENCE_TIMEOUT: 2500
  }
  ANIMATION: {
    FADE_IN: 0.3
    SLIDE_IN: 0.3
    BOUNCE: 0.5
  }
  UI: {
    CHAT_WIDTH: { NORMAL, EXPANDED, MINIMIZED }
    CHAT_HEIGHT: { NORMAL, EXPANDED, MINIMIZED }
  }
  COLORS: { ... }
  STYLING: {
    CONTAINER, CARD, GLASS
    BUTTON_*, MESSAGE_*
    HOVER_*, FOCUS_RING
    FONT_*
  }
  ICONS: { SMALL, MEDIUM, LARGE }
}
```

---

## API Endpoints Used

### Chat & Messages
- `POST /api/chat/unified` - Main chat endpoint (SSE streaming)
- `POST /api/chat/attachments` - File uploads

### Intelligence & Context
- `POST /api/intelligence/session-init` - Initialize session
- `POST /api/intelligence/suggestions` - Get suggestions
- `POST /api/intelligence/webcam-analysis` - Analyze camera frames
- `POST /api/research/initial-context` - Background research

### Usage & Analytics
- `GET /api/usage/:sessionId` - Get token usage

### Export
- `POST /api/export-summary` - Generate PDF summary

### WebSocket
- `ws://localhost:3001/live` (dev) - Voice live server
- `wss://production-domain/live` (prod)

---

## State Management Architecture

### Local State (Hook-based)
- **useChatState** - UI state (minimize, expand, media)
- **useChatMessages** - Message list and input
- **useChatIntelligence** - AI context and terms
- **useRealtimeVoice** - Voice session state
- **useCamera** - Camera stream state

### Global State (Store-based)
- **unified-chat-store** - Synced chat state across components
  - Used by `useUnifiedChat`
  - Enables cross-component access
  - Reset on unmount

### Persistent State
- **localStorage**
  - `fbc-terms-accepted` - Terms acceptance flag
  - `intelligence-session-id` - Session persistence

---

## Performance Optimizations

### Memoization
- `useMemo` for message transformations
- `useCallback` for stable function references
- `React.memo` for AI element components

### Lazy Loading
- Dynamic imports for heavy components
- Code splitting by route

### Resource Management
- Cleanup of media streams on unmount
- WebSocket auto-reconnect with exponential backoff
- Audio queue management for smooth playback

### Rendering
- Virtual scrolling for long message lists (future)
- Debounced input changes
- Throttled mic level updates

---

## Error Handling

### Component-Level
- Error boundaries wrap media components
- Graceful degradation for unsupported features

### Hook-Level
- Try-catch in async operations
- Error state in hooks
- Toast notifications for user feedback

### Network-Level
- Abort controllers for request cancellation
- Retry logic for failed uploads
- WebSocket reconnection

---

## Accessibility

### Keyboard Navigation
- Tab navigation support
- Keyboard shortcuts (Ctrl+M, Ctrl+K, etc.)
- Focus management

### Screen Readers
- ARIA labels on interactive elements
- Role attributes for semantic HTML
- Alt text for images

### Visual
- High contrast mode support
- Monochrome theme option
- Responsive text sizing

---

## Testing Strategy

### Unit Tests
- Hook behavior testing
- Utility function testing
- Type validation

### Integration Tests
- Message send/receive flow
- Media permission handling
- Voice session lifecycle

### E2E Tests (Playwright)
- `tests/chat.spec.ts` - Chat interface
- `tests/voice.spec.ts` - Voice functionality
- `tests/camera.spec.ts` - Camera capture
- `tests/screen-share.spec.ts` - Screen sharing

---

## Future Refactoring Considerations

### Potential Improvements
1. **Extract Media Management** - Unified media hook combining voice, camera, screen
2. **Message Store** - Dedicated store for message history
3. **Component Consolidation** - Merge similar media components
4. **Type Safety** - Stricter typing for metadata
5. **State Machine** - Use XState for complex state transitions
6. **Virtual Scrolling** - For very long conversations
7. **Service Workers** - Offline support and caching

### Known Technical Debt
- Mixed state management patterns (hooks + store)
- Some duplicate logic in media components
- Complex prop drilling in ChatInterface
- AI element metadata extraction could be cleaner

---

## Development Workflow

### Adding a New Component
1. Create component in appropriate category folder
2. Define props interface
3. Connect to relevant hooks
4. Add to ChatInterface if needed
5. Update this documentation

### Adding a New Hook
1. Create hook file in `src/hooks/` or `src/components/chat/hooks/`
2. Define return type
3. Implement logic with cleanup
4. Connect to components
5. Update dependency graph

### Adding a New AI Element
1. Create component in `src/components/ai-elements/`
2. Follow existing patterns (Trigger, Content, etc.)
3. Add to metadata type in `chat-enhanced.ts`
4. Integrate in ChatMessages rendering
5. Add configuration option to useAIElements

---

**Document Version:** 1.0  
**Last Updated:** October 14, 2025  
**Maintainer:** Development Team

