# Chat UI Refactor Plan

## Goals

1. **Stabilize the production chat experience** by limiting rendered AI elements, consolidating controls, and aligning the live voice flow with the verified test implementation.
2. **Reduce cognitive and maintenance load** by decomposing the 1k-line `ChatInterface` and separating transport, analytics, and view-model responsibilities in the hooks layer.
3. **Preserve existing functionality** (voice, screen share, attachments, admin intelligence) while making incremental, verifiable changes that pass current tests.

## Guiding Principles

- No wholesale deletions; extract and refactor in small, reviewable steps.
- Keep the battle-tested AudioWorklet voice pipeline - it's production-ready and performs better than MediaRecorder.
- Default to a minimal AI-element bundle per message and require explicit opt-in for advanced panels.
- Keep desktop/mobile parity: single entry point for actions that adapts to viewport.
- Each slice ends with updated documentation (gap analysis, coherence plan) and smoke checks.

## Workstreams & Tasks

### 1. Shell Extraction & State Partitioning

- [x] Create `ChatShell` (layout wrapper) housing header, conversation, composer.
- [x] Move orchestration logic out of `ChatInterface.tsx` into focused hooks:
  - `useChatUsagePolling` (tracks `/api/usage` interval).
  - `useVoicePipeline` (wraps callbacks currently in `ChatInterface` around `useLiveApi`).
  - `useMediaSnapshots` (screen/webcam thumbnails, analyze handlers).
- [x] Reduce `ChatInterface` to wiring: instantiate hooks, pass props to shell.
- Tests/Validation: existing unit tests + manual voice/camera flow.

### 2. Hook Responsibilities

- [x] Split `useChatMessages` into:
  - transport (`useUnifiedChat`) — untouched,
  - analytics (`useChatAnalytics`) — conversation flow, safety logging,
  - messages (`useChatMessages`) — view-model for UI.
- [x] Ensure new hooks expose the same public API so downstream components compile.
- [x] Add targeted unit tests for the analytics hook (mock analytics/logging).

### 3. AI Element Budget & Insights Panel

- [x] Define `AI_ELEMENTS_DEFAULT` (e.g., reasoning + sources, inline citations).
- [x] Introduce `AI_ELEMENTS_ADVANCED` list rendered inside a collapsible "Insights" drawer per message.
- [x] Cap simultaneous elements (e.g., max 3 default; advanced hidden until expanded).
- [x] Update `ChatMessages` to respect new config; ensure dev warning when exceeding budget.
- [x] Validation: snapshot/visual check; ensure metadata without elements still renders gracefully.

### 4. Actions & Media Controls Consolidation

- [x] Design a unified `ChatActions` component with responsive rendering:
  - Desktop: popover anchored to `+` button.
  - Mobile: bottom sheet (reuse existing drawer pattern).
- [x] Route voice/camera/screen toggles through this component; remove duplicate buttons from header/conversation bar.
- [x] Ensure keyboard/a11y compliance (Tab order, ESC to close, 44px targets).
- Validation: update coherence doc, manual mobile/desktop smoke tests.

### 5. Voice Pipeline Alignment

- [x] AudioWorklet pipeline verified production-ready (see VOICE_PIPELINE_HISTORY_ANALYSIS.md)
- [x] Sample rate/PCM encoding confirmed matching server expectations (16kHz PCM16)
- [x] AudioPlayer adaptive buffering handles network latency and prevents crackling
- [x] Update `ChatInput` to rely on the unified voice toggle (no hidden drawers).
- [x] Confirm transcripts integrate with `useChatMessages` voice helpers.
- Validation: ✅ Current AudioWorklet implementation is stable, tested, and production-ready. No MediaRecorder port needed.

### 6. Cleanup & Documentation

- [x] Sweep tokens in touched components to use `src/components/chat/design-tokens.ts`.
- [x] Update `CHAT_UX_GAP_ANALYSIS.md` and `CHAT_UI_COHERENCE_PLAN.md` with changes.
- [x] Ensure `scripts/run-pre-deployment-tests.sh` covers new hooks/components.

## Timeline & Sequencing

1. Shell extraction & hook partitioning (Workstreams 1 + 2).
2. AI element budget (Workstream 3).
3. Actions consolidation (Workstream 4).
4. Voice pipeline alignment (Workstream 5).
5. Cleanup, docs, and final verification (Workstream 6).

Each step should merge independently with docs/tests updated so we can deploy between phases if needed.

## Risks & Mitigations

- **Regression in voice flow**: ✅ MITIGATED - AudioWorklet implementation is stable and production-ready (see VOICE_PIPELINE_HISTORY_ANALYSIS.md). MediaRecorder path was previously attempted and abandoned.
- **Performance hits from new drawer/components**: profile after each slice; enforce lazy loading for advanced AI elements.
- **Design drift**: collaborate with existing token system; avoid ad-hoc styles.

## Validation Checklist (per slice)

- `pnpm lint && pnpm test` (unit tests that remain enabled).
- Manual smoke: voice toggle, screen share, attachment upload, tool approval prompt.
- Update relevant documentation entries.
- Optional: preview build to ensure no layout regressions before Vercel deploy.
