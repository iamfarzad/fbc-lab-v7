**Purpose**
- Create a single, actionable plan for untangling the chat UI into a coherent, responsive, and accessible design across desktop and handheld devices.
- Track what is already implemented, what remains, and how we will validate completion.

**Status**
- In progress. Initial wiring for HTTP tool-calls → UI approvals is complete, mobile gating for draggable overlays is in place, and tokens have been consolidated to a single source of truth (compat layer provided).

**Rules Alignment (Enforced + Planned)**
- Critical Never Rules
  - Do not delete files without explicit approval. Current approach: deprecate/disable legacy surfaces (drawers, banners, draggable overlays) but keep code paths intact until approved for deletion.
  - No duplicates in active UI: single Conversation Bar controls the surface; legacy triggers are gated off.
- Consolidation Pattern
  - Unified surface implemented; legacy components are gated. Pending: removal only after user approval to satisfy “delete old in same commit” while respecting “never delete without permission”.
- Configuration & Models
  - No hardcoded URLs or model names in client code; use `WEBSOCKET_CONFIG` and `GEMINI_MODELS` from `src/config/constants.ts`.
- API Routes
  - Unified chat route kept at `app/api/chat/unified/route.ts`; no duplicate routes introduced.
- Hooks Pattern
  - Voice uses only `src/hooks/useRealtimeVoice.ts`. No alt voice hooks referenced.
- React Components
  - Functional TS components. ForwardRef remains for input; no behavior change planned until approved. Mobile-first layout enforced.
- Documentation Standards
  - This plan documents decisions, risk, and validation; follow-up docs will note any exceptions and their rationale.

**Scope**
- Affects the chat shell and its subsystems: Header, Messages, Composer, Media controls, visual previews (camera/screen), tool-call approvals, tokens, accessibility, and mobile-first ergonomics.

**Completed Work (So Far)**
- SSE tool-calls → UI approvals in HTTP chat path.
  - Client now parses `tool_call` events and surfaces them in messages via `metadata.toolCall`.
  - Approval prompt renders in the message list and bridges to real UI actions (voice, screen share, webcam).
  - Key refs: `src/hooks/useUnifiedChat.ts:200`, `src/components/chat/components/ChatMessages.tsx:544`, `src/components/chat/ToolApprovalPrompt.tsx:32`.
- Mobile-first gating for draggable overlays.
  - Draggable video overlays are disabled on small screens to avoid UI overlap.
  - Key refs: `src/components/chat/ChatInterface.tsx:971`, `src/components/chat/components/DraggableVideoPlayer.tsx:20`.
- Token consolidation (single source of truth) with compat export.
  - Central tokens: `src/components/chat/design-tokens.ts:193`.
  - Compat + utilities: `src/components/chat/tokens/design-tokens.ts:8` (`combineTokens`), with de-facto re-exporting and migration path.

**What’s Not Done Yet**
- Unify media controls into one mobile-first Media Drawer (bottom sheet on handheld; popover on desktop).
- Consolidate actions behind a single “Actions” control (+) in the Composer and minimize duplication in Header.
- Calm streaming state: replace banners/toasts with subtle inline indicators near the Composer.
- Accessibility polish: focus traps, ESC to close, TAB ordering, visible focus, minimum touch size.
- Theme hygiene: move ad-hoc monochrome/utility mixes to semantic tokens and data-theme CSS variables.
- Visual preview strategy: decide on steady “frame streaming” vs. “lightweight CONTEXT_UPDATE summaries” and implement one path cleanly.
- Token sweep: replace scattered raw Tailwind class fragments with token-backed semantics in high-traffic components.

**File-By-File Scope Analysis**
- `src/hooks/useUnifiedChat.ts:58`
  - Adds parsing for SSE `tool_call` events; stores under `metadata.toolCall` for rendering.
  - Remaining: unify event type handling (`text`, `tool`, `multimodal`, `tool_call`) behind a stable internal shape; ensure robust error handling for malformed payloads.
- `src/components/chat/components/ChatMessages.tsx:544`
  - Renders `ToolApprovalPrompt` when `metadata.toolCall` exists; supports approve/decline callbacks.
  - Remaining: a11y (focus management on prompt open/close), consistent spacing/semantics via tokens, optional virtualization for long lists (later phase).
- `src/components/chat/ToolApprovalPrompt.tsx:32`
  - Encapsulates the approval UI (clear accept/decline actions).
  - Remaining: a11y labels, consistent keyboard shortcuts (Enter to approve, Esc to close), and 44px targets.
- `src/components/chat/ChatInterface.tsx:971`
  - Bridges approvals to actual toggles (voice/screen/camera). Gates `DraggableVideoPlayer` on mobile.
  - Remaining: centralize media controls behind a single “Actions” entry; introduce a unified Media Drawer on handheld.
- `src/components/chat/components/DraggableVideoPlayer.tsx:20`
  - Floating preview for camera/screen on desktop.
  - Remaining: ensure it’s off by default and opt-in for “Advanced” users; apply consistent z-index and shadow tokens.
- `src/components/chat/design-tokens.ts:193`
  - Central source of truth for tokens (colors, radii, spacing, animation, shadows, z-index).
  - Remaining: expand semantic color roles (surface, muted, destructive, success, warning) and expose a few utility helpers for consistent spacing.
- `src/components/chat/tokens/design-tokens.ts:8`
  - Re-exports compat and provides `combineTokens`. Marked for gradual retirement after migration.
  - Remaining: codebase sweep to migrate imports to the central token file, then remove this forwarder.

**Design System Principles**
- One shell, clear regions: Header, Messages, Composer, Media.
- Single visual language: semantic tokens only, no ad-hoc utility overrides.
- Mobile-first: full-screen chat; bottom-sheet Media Drawer on handheld.
- Predictable controls: single “Actions” entry (+) that reveals media + utilities.
- Calm UI: inline micro-statuses instead of banners/toasts.
- Accessibility: 44px targets, visible focus, keyboardable drawers/popovers, aria-live for streaming content.

**Phased Roadmap**
- Phase 1: Shell + Actions Unification
  - Add a single “Actions” button to the Composer; retire duplicated media toggles in Header.
  - Show media options (Voice, Camera, Screen, Upload, Export, Schedule) from one entry point.
  - Token sweep for Header/Composer structure.
  - Acceptance: mobile and desktop operate from a single Actions entry; no duplicated controls elsewhere.
- Phase 2: Media Drawer (Handheld) / Popover (Desktop)
  - Implement a bottom-sheet Media Drawer with tabs (Voice, Camera, Screen) on handheld.
  - Keep popover on desktop; ensure ESC/Tab handling and labeled controls.
  - Acceptance: drawer traps focus; ESC closes; minimum 44px targets; live previews render reliably.
- Phase 3: Streaming Status Calm-Down
  - Move streaming indicators to a subtle one-line status above the Composer.
  - Gate toasts to first-time capture only; subsequent status is inline.
  - Acceptance: no persistent banners; single-line indicator clearly reflects streaming state.
- Phase 4: Theme Hygiene & Tokens
  - Introduce data-theme and CSS variables (including monochrome theme) and eliminate ad-hoc class conditionals.
  - Expand semantic tokens; remove raw Tailwind color fragments in core components.
  - Acceptance: tokens drive styles; theme switch does not require component-level conditionals.
- Phase 5: A11y Polish
  - Focus order, focus rings, keyboard shortcuts (Enter approve; Esc dismiss), aria-live for assistant stream.
  - Acceptance: all interactive elements meet 44px, focus is visible, drawers/popovers are accessible.
- Phase 6: Performance Hygiene
  - Memoize heavy components; consider list virtualization for long chats; throttle visual previews.
  - Acceptance: no jank on mobile; rendering stays smooth during streams.

**Acceptance Criteria (Roll-Up)**
- Mobile: full-screen chat; single Actions control; unified Media Drawer; no draggable overlays.
- Desktop: optional draggable overlays (off by default); Actions popover; consistent tokens.
- Approvals: tool-call prompts appear inline; approve triggers correct toggle and opens media panel.
- A11y: focus trap, ESC close, 44px targets, visible focus, aria-live on streaming assistant content.
- Tokens: central file usage only; no duplicate token sources; semantic colors and spacing.

**Validation Steps**
- Tool-call approvals (HTTP chat):
  - Ask: “Let’s talk by voice.” → approve → voice session toggles and media panel opens.
  - Ask: “Let me show you my screen.” → approve → screen picker and preview flow.
  - Ask: “Turn on the camera.” → approve → webcam preview starts.
- Mobile checks:
  - Narrow viewport < 768px: no draggable overlays; Media Drawer opens from Actions.
- Accessibility checks:
  - Keyboard navigate Actions and Drawer; TAB cycles within, ESC closes; focus always visible.

**Risks & Mitigations**
- Media Drawer complexity on handheld
  - Mitigation: use a single focus-trapped dialog implementation with tabs; reuse existing preview components.
- Token migration regressions
  - Mitigation: migrate component-by-component with visual spot checks; keep compat export until sweep completes.
- Over-notification fatigue
  - Mitigation: consolidate statuses inline and gate toasts to first-time capture.

**Rollback Plan**
- If Media Drawer causes regressions, temporarily re-enable prior popovers on mobile (feature flag per viewport) while fixing.
- If token refactors regress visuals, flip imports back to compat export and re-run component sweeps incrementally.

**Decisions Log**
- Keep HTTP tool-call approvals inline in message list; avoid global modals for core flow clarity.
- Favor single “Actions” entry-point to minimize scattered controls and cognitive load.
- Disable draggable overlays on handheld; keep desktop-only and off by default.

**Key References**
- `src/hooks/useUnifiedChat.ts:200`
- `src/components/chat/components/ChatMessages.tsx:544`
- `src/components/chat/ToolApprovalPrompt.tsx:32`
- `src/components/chat/ChatInterface.tsx:971`
- `src/components/chat/components/DraggableVideoPlayer.tsx:20`
- `src/components/chat/design-tokens.ts:193`
- `src/components/chat/tokens/design-tokens.ts:8`
**Rule-Driven Tasks (Next)**
- A11y sweep: ensure 44px minimum on all tappables (header controls too), visible focus rings, ESC/Tab behavior for popovers; aria-live confined to streaming blocks only.
- Token sweep: remove ad-hoc class fragments in ChatHeader/ChatMessages/ChatInput; ensure all use `src/components/chat/design-tokens.ts`.
- Config audit: verify no hardcoded URLs/models in production code; tests/docs may retain examples but should mention `WEBSOCKET_CONFIG` in notes.
- Hooks audit: confirm only `useRealtimeVoice` used for voice; remove any imports of deprecated hooks if present (with approval).
- API route audit: ensure one unified chat route per feature and consistent error schemas.
- Voice UX: clearer error messages and retry instruction when WebSocket server isn’t running; point to `pnpm dev:all` per environment-setup.

