# UI Duplication Consolidation - Execution Log

## Phase 0 – Validation
- [x] Review duplicated media toggle implementations (ChatInput, ActionsMenu, MinimizedChatBar, MediaControlsOverlay, ConversationBar) and document variant requirements.

## Phase 1 – Shared Primitive Design
- [x] Add centralized media metadata (icons, copy, shortcuts) under `src/config`.
- [x] Add reusable motion variant helpers under `src/lib`.
- [x] Scaffold shared UI primitives:
  - [x] `MediaToggle` component with inline/compact/chip/icon variants.
  - [x] `MediaStatusBadge` component with active/processing states.

## Phase 2 – Rollout (per component)
- [x] Replace ChatInput popover media buttons with `MediaToggle`.
- [x] Replace ActionsMenu bottom-sheet items with `MediaToggle`.
- [x] Replace MinimizedChatBar compact buttons/badges with shared primitives.
- [x] Replace MediaControlsOverlay badges and motion config.
- [x] Replace ConversationBar chips with shared primitives.

## Phase 3 – Voice / Modal Consolidation
- [x] Merge SVG waveform icon from orphaned chat VoiceButton into shared `ui/voice-button`.
- [x] Replace `VoiceWaveform` usage with `LiveWaveform` in VoiceFullScreen.
- [x] Extract shared `FullScreenModal` layout and reuse across voice/camera/screen.

## Verification
- [x] Run `pnpm type-check`.
- [ ] Manual smoke test voice/camera/screen toggles.
