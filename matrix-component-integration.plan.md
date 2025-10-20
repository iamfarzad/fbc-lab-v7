## Matrix + ElevenLabs Integration Plan

> **Goal:** Replace ad‑hoc showcase experiments with a production‑ready integration of ElevenLabs UI components (Matrix, Orb, MicSelector, VoicePicker, AudioPlayer, ShimmeringText) across the voice-enabled experiences in F.B/c. The final experience must feel native to the brand, respect the existing chat architecture, and satisfy performance + accessibility constraints.

---

### 1. Scope & Success Criteria
- **Include:** voice-enabled chat surfaces (`src/components/chat`, `app/voice-test`, `app/test/elevenlabs-showcase`), supporting hooks (`src/hooks`), UI primitives (`src/components/ui`), audio pipeline libs (`src/lib/audio*`), and F.B/c specific branding assets.
- **Exclude (for now):** server-side audio generation, admin dashboards, PDF exporter, legacy experiments under `public/test-*`.
- **Definition of Done:**
  1. ElevenLabs visualizers (Matrix/Orb) drive from real session audio where available, with graceful degradation to simulated data.
  2. Voice picker + mic selector live within existing chat header/tooling without layout regression.
  3. Showcase route remains as design reference, but mirrors the production styling.
  4. Lighthouse performance ≥ 90 on desktop for `/` and `/voice-test`.
  5. Accessibility checks (axe) report zero critical issues related to the new components.

---

### 2. Current State Diagnosis (as of 2025-01-?)
- Showcase page duplicates logic and styling that should live in shared modules.
- Simulated audio hook (`useElevenLabsAudio`) is mesh with dummy data; no contract for real stream input.
- Matrix and Orb props diverge from ElevenLabs docs (ad-hoc palettes, mixed naming like `speaking` vs `talking`).
- Theme handling spams hard-coded classes instead of using design tokens from `app/globals.css` and `tailwind.config.mjs`.
- No consistent state machine: chat pipeline, mic level detection, Orb/Matrix indicator, and VoiceButton each track state separately.
- Testing coverage is missing for new hooks; existing e2e voice flows do not assert visuals.

_(Diagnosis confirmed by inspecting `app/test/elevenlabs-showcase/page.tsx`, `src/components/showcase/*`, `src/hooks/useElevenLabsAudio.ts`, `src/components/ui/matrix.tsx`, `src/components/ui/orb.tsx`.)_

---

### 3. Design & Experience Guardrails
1. **Brand Palette:** Align Matrix/Orb colors with tokens in `tailwind.config.mjs` (`brand.primary`, `brand.orange`, `terminal.green`). No inline hex values except when mapping ElevenLabs defaults.
2. **Motion Principles:** Limit idle animations to ≤ 24 fps unless reacting to audio input; use requestAnimationFrame cancelation for hidden components.
3. **State Vocabulary:** Standardize on `idle | listening | processing | speaking` across chat, Orb, Matrix, and transcripts.
4. **Accessibility:** Provide aria-live regions for transcription updates, titles/aria-label for visualizers, and maintain focus order when mic selector opens.
5. **Responsive Layout:** Orb and Matrix must stack under 768px; avoid fixed pixel widths. Leverage CSS grid utilities already used in `ChatHeader.tsx`.

---

### 4. Experience Blueprint
- **Tri-lane layout:** Rebuild chat shell as a responsive 3-lane canvas (`context · conversation · live modalities`). On ≥1280px, use CSS grid (`grid-cols-[minmax(18rem,22rem)_minmax(30rem,1fr)_minmax(18rem,24rem)]`). Collapse to 2 lanes on tablets, stacked on mobile. Persist layout scaffolding in `ChatContainer.tsx`.
- **Conversation lane (center):** Drive all transcript rendering through Vercel AI Elements:
  - Wrap scrollable area with `<Conversation>` + `<ConversationContent>` for stick-to-bottom behaviour.
  - Render user/assistant turns with `<Message>` variants, leveraging `@/types/core` `Message` shape. Use `<Response>` for assistant outputs so auto-rendered tools/sources appear natively.
  - Inline assistant thinking via `<Reasoning>` components in expandable accordions, styled with F.B/c terminal accent.
- **Input deck (bottom of center lane):** Compose Vercel `<PromptInput>` with custom `VoiceButton`, ElevenLabs `MicSelector`, `VoicePicker`, and quick action buttons from `interactive/suggestion`. Provide split keyboard/mic modes with feature-flag toggles.
- **Live modalities lane (right):** Housing ElevenLabs Matrix/Orb visualizers (`MatrixVisualizer`, `OrbVisualizer`, `HybridVisualizer`), audio levels, and media previews (screen share, artifacts). Include collapsible panels for `PerformanceMonitor`, transcripts, and upcoming tool outputs. Integrate `ShimmeringText` for status copy.
- **Context lane (left):** Surface session intel (ConversationBar, NextSteps, artifacts) with Vercel `Sources` and `Tool` components. Include drag-and-drop region for files and camera/screen capture controls using custom F.B/c modules.
- **State ribbon:** At the top of conversation lane, add a slim ribbon showing agent state (`idle/listening/processing/speaking`) reflected in Orb + Matrix + typography. Color derived from design tokens and mirrored in `StatusIndicator`.
- **Motion system:** Adopt tiered animation: micro (button hover < 150ms), voice reactive (Matrix/Orb real-time), contextual (panel transitions via `framer-motion` spring). Pause expensive animations when tab is hidden or telemetry `source === 'simulated'`.
- **Accessibility & theming:** Ensure each lane declares landmarks (`aside`, `main`, `section`), use `aria-live="polite"` for transcripts, and respect `prefers-reduced-motion`. Themes sourced from Tailwind tokens; terminal theme triggered by `.monochrome` root class without duplicating markup.

---

### 5. Integration Strategy
1. **Architect shared audio context.** Centralize audio stream metrics in a single hook (`useVoiceTelemetry`) that wraps existing `useRealtimeVoice` + ElevenLabs websocket data. This feeds Matrix/Orb props and existing waveform component.
2. **Compose visualization layer.** Refactor Matrix/Orb wrappers into `src/components/chat/voice-visualizers/` with a unified prop contract (audio data, agent state, theme).
3. **Embed controls.** Merge MicSelector + VoicePicker into chat’s tools menu (`src/components/chat/components/ToolsMenu.tsx`) with lazy loading to limit initial bundle impact.
4. **Pilot in `/voice-test`.** Replace the current `VoiceWaveform` + placeholder UI with the new stack, verifying with simulated data toggle.
5. **Promote to production.** Upgrade `ChatHeader` + `VoiceButton` flows to use the shared context, then retire redundant components (`live-waveform.tsx`, legacy audio utils) after side-by-side validation.

---

### 6. Implementation Phases

#### Phase 0 – Audit & Canvas Reset (1–2 days)
- Catalogue all ElevenLabs-related files (see `MATRIX_COMPONENT_REFERENCE.md` companion doc) and mark for keep/remove.
- Remove commented imports and dead code in `app/test/elevenlabs-showcase/page.tsx`.
- Snapshot current chat UI for regression comparison (Playwright screenshot).
- Set up feature flag (e.g., `ELEVENLABS_UI_V2`) using existing `src/lib/featureFlags` pattern if available. Otherwise add lean util.
- Deliverable: PR with cleanup + feature flag scaffolding; CI green.

#### Phase 1 – Layout & Conversation Foundation (3–4 days)
- Implement tri-lane grid in `ChatContainer.tsx` with responsive breakpoints and safe-area support.
- Swap message rendering in `ChatMessages.tsx` to use Vercel AI Elements (`Conversation`, `Message`, `Response`, `ConversationScrollButton`).
- Refactor `ChatHeader.tsx` to align with new state ribbon and prepare slots for voice visualizers (behind flag).
- Add regression tests for layout (Playwright viewports 360/768/1280) and update snapshots.
- Deliverable: Feature-flagged layout switch with unchanged voice functionality.

#### Phase 2 – Voice Telemetry & Visual Layer (3–4 days)
- Implement `useVoiceTelemetry` hook:
  - Aggregates RMS volume, frequency buckets, speaking state.
  - Exposes `source: 'live' | 'simulated'` and memoized `levels`.
  - Provides React context provider consumed by visualizers & controls.
- Update `useElevenLabsAudio` to delegate to telemetry; keep backwards compatible signature to avoid churn.
- Build `MatrixVisualizer`, `OrbVisualizer`, `HybridVisualizer` under `src/components/chat/voice-visualizers/`, with palette resolver using design tokens.
- Unit tests with Jest (mock RAF + telemetry context).
- Deliverable: Showcase route (`/test/elevenlabs-showcase`) renders new visualizers driven by telemetry simulator.

#### Phase 3 – Input & Tool Composition (4–5 days)
- Compose new prompt deck: Vercel `<PromptInput>` + voice toggle + quick actions + attachments rail.
- Embed MicSelector + VoicePicker within `ToolsMenu.tsx`, lazy-loaded via dynamic import.
- Integrate telemetry context into `VoiceButton.tsx`, `VoiceWaveform.tsx` (or replacement), and Chat header ribbon.
- Replace legacy waveform with Matrix (listening/processing) and Orb (speaking). Remove duplicates per `.cursorrules`.
- Update `/voice-test` to use full stack for QA.
- Deliverable: Voice + text input unified, manual test checklist run.

#### Phase 4 – Context & Modalities Lane (3 days)
- Populate left/right lanes with session intel, tool outputs, media previews using Vercel AI Elements (`Sources`, `Tool`, `Artifact`, `WebPreview`).
- Wire `PerformanceMonitor`, transcripts, and state chips; ensure collapse behaviours & keyboard support.
- Integrate `ShimmeringText` statuses and finalize animation timings (respecting reduced motion).
- Deliverable: Three-lane experience complete behind feature flag, design review sign-off.

#### Phase 5 – Polish & Validation (2–3 days)
- Theming QA across light/dark/terminal; update snapshots for `ThemeShowcase`.
- Axe accessibility audit + keyboard navigation validation.
- Lighthouse/Next bundle analyzer to confirm no regressions (> +75KB JS).
- Update docs (`VOICE_ARCHITECTURE.md`, `CHAT_UI_COHERENCE_PLAN.md`) and remove deprecated components.
- Deliverable: Sign-off review, flag flipped, launch checklist completed.

---

### 7. Testing & QA Strategy
- **Unit:** hooks (`useVoiceTelemetry`, `useElevenLabsAudio`), visualizer render logic (enzyme/react-testing-library).
- **Integration:** Playwright flows for `/voice-test` verifying state transitions, screenshot diffs for matrix/orb states.
- **Performance:** `scripts/run-pre-deployment-tests.sh` plus custom script to sample FPS via `PerformanceMonitor` component in headless mode.
- **Manual:** Follow `VOICE_TESTING_GUIDE.md` + new checklist for theme parity and device matrix (desktop, tablet, mobile).

---

### 8. Dependencies & Risks
- **Dependencies:** Stable ElevenLabs SDK version already in repo (`package.json`), realtime voice API availability, design tokens finalization.
- **Risks:** Audio stream API changes, browser autoplay restrictions, regression in existing voice tests.
- **Mitigations:** Keep simulated mode for offline QA, guard new experiences with feature flag, maintain legacy waveform until Phase 3 sign-off.

---

### 9. Deliverables & Tracking
- Epic in Linear/Jira: _“Matrix UI Integration”_ with Phase-based sub-tasks.
- Weekly demo builds captured in `PLAYWRIGHT_REPORT` artifacts.
- Documentation updates stored under `/docs/voice` (create if absent).
- Companion reference: `MATRIX_COMPONENT_REFERENCE.md` (file/filepath/hook inventory).

---

### 10. Immediate Next Actions
1. Approve this plan.
2. Run cleanup PR (Phase 0) removing dead code in showcase + set feature flag scaffolding.
3. Start telemetry hook implementation with simulated + real data adapters.

Once approved, the plan replaces the prior attempt wholesale. All implementation will follow the phases above with explicit review gates per phase.

links if you want to analzye any documents 
https://github.com/vercel/ai-elements

https://ai-sdk.dev/elements/overview

https://ui.elevenlabs.io/docs/components
