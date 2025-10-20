## Matrix Component Reference

Central inventory of all files, hooks, and routes involved in the ElevenLabs Matrix + Orb integration. Use this as the source of truth while rebuilding the experience.

---

### 1. Routes & Entry Points
- `app/test/elevenlabs-showcase/page.tsx` – demo surface that renders the showcase sections; should stay in sync with production styling.
- `app/voice-test/page.tsx` – QA route for voice capture; will host feature-flagged integration before promotion.
- `app/page.tsx`, `src/components/chat/ChatContainer.tsx` – production chat entry points where final integration will live.

---

### 2. Core UI Components
- `src/components/ui/matrix.tsx` – ElevenLabs Matrix implementation (pattern rendering, VU meter mode); exports `Frame`, `digits`, helpers.
- `src/components/ui/orb.tsx` – ElevenLabs Orb visualization (agent state glow, manual input/output props).
- `src/components/ui/mic-selector.tsx` – Device picker control; consumes media device list hook.
- `src/components/ui/voice-picker.tsx` – ElevenLabs voice selection dropdown.
- `src/components/ui/audio-player.tsx` – Lightweight audio playback UI; used for sample previews.
- `src/components/ui/shimmering-text.tsx` – Text animation utility leveraged in hero/banner states.
- `src/components/ui/live-waveform.tsx` – Legacy waveform visual; reference for graceful migration.
- `src/components/ui/index.ts` – Barrel export for the above primitives; must stay updated when wrappers are created.

---

### 3. Showcase Layer
- `src/components/showcase/ShowcaseHero.tsx` – Current animated hero (Matrix patterns); to be refactored to share assets.
- `src/components/showcase/VisualizationComparison.tsx` – Side-by-side Matrix/Orb demo.
- `src/components/showcase/VoiceStateDemo.tsx` – State transitions between idle/listening/processing/speaking.
- `src/components/showcase/HybridDemo.tsx` – Composite visualizer layout.
- `src/components/showcase/FullVoiceInterfaceDemo.tsx` – End-to-end voice interface example.
- `src/components/showcase/ThemeShowcase.tsx` – Theme switching example for light/dark/terminal.
- `src/components/showcase/PerformanceMonitor.tsx` – FPS + frame timing overlay.
- `src/components/showcase/ShowcaseSection.tsx` – Generic section wrapper used by the showcase page.
- `src/components/showcase/index.ts` – Re-exports for the showcase components.

---

### 4. Hooks & State
- `src/hooks/useElevenLabsAudio.ts` – Current simulated data hook; to be replaced or extended by `useVoiceTelemetry`.
- `src/hooks/useRealtimeVoice.ts` – Realtime voice capture + ElevenLabs streaming client hook.
- `src/hooks/useMicLevel.ts` – Utility for microphone level tracking (legacy waveform).
- `src/hooks/useUnifiedChat.ts`, `src/hooks/useChatMessages.ts` – Provide chat state needed when embedding controls in header/body.
- **To add:** `src/hooks/useVoiceTelemetry.ts` – planned consolidated telemetry hook (see integration plan).

---

### 5. Supporting Libraries
- `src/lib/elevenlabs-patterns.ts` – F.B/c Matrix letter patterns + palette definitions.
- `src/lib/audio-utils.ts`, `src/lib/audio-recorder.ts`, `src/lib/audio/audio-worklets/*` – Underlying audio processing helpers.
- `server/live-server.ts`, `app/api/chat/unified/route.ts` – Active voice WebSocket endpoint and unified chat route for Live API wiring.

---

### 6. Chat Surface Components
- `src/components/chat/components/ChatHeader.tsx` – Primary target for visualizers + controls.
- `src/components/chat/components/VoiceButton.tsx` – Controls mic start/stop; will consume telemetry states.
- `src/components/chat/components/VoiceWaveform.tsx` – Candidate for replacement with Matrix VU meter.
- `src/components/chat/components/ToolsMenu.tsx` – Dropdown location for mic/voice pickers.
- `src/components/chat/ChatInterface.tsx`, `ChatContainer.tsx` – Layout wrappers ensuring responsive alignment.

---

### 7. Documentation & Guides
- `VOICE_ARCHITECTURE.md`, `VOICE_PIPELINE_SOURCE_OF_TRUTH.md`, `VOICE_TESTING_GUIDE.md` – Existing voice documentation to update after integration.
- `CHAT_UI_COHERENCE_PLAN.md` – Chat design constraints; ensure alignment when embedding new components.

---

**Maintenance:** Update this reference whenever new files are introduced or responsibilities shift. The document should always map to the latest integration architecture described in `matrix-component-integration.plan.md`.
