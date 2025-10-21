# Comprehensive Changelog — Oct 21, 2025

Scope: All notable changes completed and pushed on 2025-10-21 across Live Voice, Chat UI, config/env, routes, tests, and documentation.

## Summary
- Voice/Live: Introduced a shared, evented WebSocket client, integrated with the voice hook and chat pipeline; added live status UX and client dev logging.
- UI: Polished Chat input/actions, added booking CTA and inline PDF preview.
- Config/Env: Centralized WS/model configuration; added tests around env and Live client.
- Routes: Health and dev log endpoints validated; unified chat route intact.
- Stability/Perf: Logging hardening, recursion guard for log capture, Turbopack enabled.
- Tests/Docs: Agent smoke tests, Jest mocks, comprehensive test and compliance reports.

## Deployment & Environment
- Vercel (Production)
  - `NEXT_PUBLIC_LIVE_SERVER_URL` must be set to `wss://fb-consulting-websocket.fly.dev`.
  - Optional: `NEXT_PUBLIC_CLIENT_LIVE_LOG=1` to POST client events to `/api/dev/log`.
- Fly.io (Live WebSocket Server)
  - Secret: `GEMINI_API_KEY` must be configured (`fly secrets set GEMINI_API_KEY=...`).
- Health endpoints
  - Public: `https://www.farzadbayat.com/api/health` → 200 JSON including `ws` and default `model`.
  - Fly: `https://fb-consulting-websocket.fly.dev/health` → `OK`.

## Live WebSocket & Voice Pipeline
- Evented client for server-managed Live WS
  - `src/core/live/client.ts`: WebSocket client using `WEBSOCKET_CONFIG.URL` and `sendRealtimeInput()`; emits `connected`, `session_started`, `input_transcript`, `output_transcript`, `audio`, `turn_complete`, `tool_call`, `tool_result`, and errors. Dev logs to `/api/dev/log` when enabled.
- Voice hook integration
  - `src/hooks/useRealtimeVoice.ts`: Accepts an external `LiveClientWS`, wires transcripts, turn-complete, tool calls, and clean stop.
  - `src/components/chat/hooks/useVoicePipeline.ts`: Shares a single `LiveClientWS` across the view, updates listening state, appends transcripts, and finalizes assistant messages reliably.
- Status UX
  - `src/components/chat/components/ChatHeader.tsx`: Mobile/desktop status indicator surfaces Live state (connected/active) for visibility.

## Chat UI Updates
- `src/components/chat/components/ChatInput.tsx`: Toolbar overflow/positioning fixes; preserves editing during voice.
- `src/components/chat/components/ChatActions.tsx`: Popover z-index/position improvements.
- `src/components/chat/ChatInterface.tsx`: Booking CTA bar; inline PDF preview artifact for summaries.
- Streaming safety: Prevents sending while streaming in `useChatMessages.ts` to avoid duplicates.

## Config & Models
- Centralized configuration (no hardcoded URLs/models)
  - `src/config/constants.ts`: `WEBSOCKET_CONFIG` (prod/dev URL resolver), `GEMINI_MODELS`, `LIVE_API_CONFIG.METHOD_NAME = 'sendRealtimeInput'`.
- Model usage is imported from constants; Live client and retry logic reference `GEMINI_MODELS` consistently.

## Routes & Health/Dev Logging
- Health: `app/api/health/route.ts` — returns env/WS/model info for quick diagnostics.
- Dev Logs: `app/api/dev/log/route.ts` — accepts client-side Live events when `NEXT_PUBLIC_CLIENT_LIVE_LOG=1`.
- Unified Chat: `app/api/chat/unified/route.ts` — remains the single chat HTTP entrypoint.

## Stability, Ops & Performance
- Logging hardening
  - `src/lib/jsonl-logger.ts`: Writes JSONL logs to a prod-safe temp path.
- Recursion guard
  - `src/lib/browser-log-capture.ts`: Prevents infinite loops by guarding internal logging.
- Turbopack, cleanup
  - Faster dev pipeline; removed unused dependencies; general cleanup and flags alignment.

## Tests & Tooling
- Unit tests
  - Config/env + Live client: Validates URL normalization, secure WS in prod, and client event routing.
- Agent smoke tests
  - Coverage for closer, summary, admin, proposal, retargeting agents.
- Jest mocks
  - Stubs for `@vercel/kv` and `ai` to avoid ESM/network in tests.

## Documentation Added/Updated
- `TEST_RESULTS.md`, `TESTING_COMPLETE.md`, `COMPREHENSIVE_TEST_SUMMARY.md` — comprehensive results and coverage status.
- `RULES_COMPLIANCE_REPORT.md` — verification against repository rules.
- Voice/Live architecture docs: `VOICE_ARCHITECTURE.md`, `VOICE_SYSTEM_SUMMARY.md`, `VOICE_PIPELINE_SOURCE_OF_TRUTH.md`, `VOICE_STACK_ANALYSIS.md`, `VOICE_REGRESSION_ANALYSIS.md`.
- Live fixes: `GEMINI_LIVE_API_FIXES.md`.
- Environment/cleanup/optimization: `ENVIRONMENT_CLEANUP_SUMMARY.md`, `CLEANUP_GUIDE.md`, `OPTIMIZATION_SUMMARY.md`.

## Manual Validation (Live Page)
Key scenarios to verify on production:
- Health checks return expected WS URL and default model.
- Voice: mic permission prompt → `session_started` → transcripts (partial→final) → audio frames and assistant chunks; clean stop.
- Screen/webcam: frames stream during active voice; fallback analysis works without voice.
- Tools: calendar/chart artifacts render responsively; export/email endpoints succeed.
- No uncaught errors; WS frames show `connected`, `setup_complete`, `input_transcript`, `audio`.
(See `MANUAL_TESTING_GUIDE.md` and the focused checklist provided in the last session.)

## Large Cleanups & Cautions
- A large cleanup commit removed many files (mostly obsolete/duplicated). Action: verify no production features were unintentionally removed and that all references resolved post-cleanup.
- Ongoing typing migration: a number of `any` usages remain; prefer adding `// TODO: migrate` and addressing incrementally.

## Known Issues / Next Steps
- Consider adding a dev-only “Live Debug” banner showing Live state transitions (connected/session/audio/turn_complete/error) for rapid triage.
- Continue migrating `any` to concrete types from `src/types/core.ts`.
- Split future Live/voice commits into subsystem-scoped changes for clearer history.

## Commit Summary (Today)
- docs: Add comprehensive test results documentation (`f009e658`)
- test: Add unit tests for config/env and LiveClientWS (`3ff65f05`)
- chore: Add shiki to devDependencies (`82f59ac8`)
- fix: Add production-friendly logging support (`fdd4a31f`)
- feat: Add mobile live status indicator to ChatHeader (`1e961dc5`)
- feat: Add external liveClient support to useRealtimeVoice hook (`d42557b1`)
- feat(live): Share LiveClientWS; add status badge and dev log endpoint (`cc0664f0`)
- test(agents): Add all-agents smoke tests (`0e5c3aa3`)
- test(jest): Stub @vercel/kv and ai to avoid ESM/network (`8a321563`)
- feat: Booking CTA bar + inline PDF preview (`a171d10b`)
- chore: Save loop fixes/flags; defer booking CTA; large cleanup (`137caaff`)
- fix: Finalize exit detection integration (no docs deleted) (`7cd069fa`)
- chore: Align env checks and typing with .cursorrules (`ff6349f8`)
- perf: Enable Turbopack and remove unused dependencies (`5d6e8237`)
- fix: Recursion guard in browser-log-capture.ts (`2f7b13ab`)
- fix: Prevent message send during streaming; dep fix (`c3e81df4`)
- fix: Overflow-visible for PromptInputToolbar (`ad7cdf1c`)
- fix: ChatActions popover positioning and z-index (`b439ab52`)
- feat: Vercel Analytics integration (`c124de3d`)
- Revert: native AI SDK reasoning streaming with shimmer (`f016d646`)

---
Owner: Farzad — Branch `main` at `f009e658`. For earlier history, see `git log` and `git_analysis_report.md`.
