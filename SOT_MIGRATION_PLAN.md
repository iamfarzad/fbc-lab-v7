# 📌 Source-of-Truth Migration Plan

This document replaces all other planning notes for the F.B/c intelligence migration. Every agent should follow this sequence exactly—no parallel workstreams, and do not skip validation between stages.

## 0. Baseline Status (do not modify)
- Project root: `/Users/farzad/fbc_lab_v7/multimodal-ai-webapp`
- Reference implementation: `/Users/farzad/FBC_masterV5`
- Gemini reference doc: `multimodal-ai-webapp/gemini-live-api.md`
- Current blockers: TypeScript alias mismatches, missing intelligence modules, chat UI still mocked

## 1. Align Build & Environment
1. Update `multimodal-ai-webapp/tsconfig.json`
   - Add `"@/*": ["./src/*"]` and `"@/src/*": ["./src/*"]` to `compilerOptions.paths`
   - Set `target` ≥ `ES2017` so FBC iteration patterns compile
2. Sync `.env.local` with the FBC templates (`FBC_masterV5/env-template.txt`, `server-env-template.txt`)
3. Copy shared polyfills/utilities
   - `FBC_masterV5/src/polyfills/zod-errors-compat.ts`
   - `FBC_masterV5/src/lib/logger.ts`
   - `FBC_masterV5/src/lib/supabase.ts`
4. Verify `pnpm tsc --noEmit` now fails ONLY on missing modules (expected) before continuing

**Validation:** run `pnpm tsc --noEmit`; ensure no downlevel errors remain.

## 2. Port Context & Supabase Layer
1. Copy the following into `multimodal-ai-webapp/src`:
   - `core/supabase/server.ts`, `core/supabase/client.ts`, `core/supabase/vercel-replacements.ts`
   - `core/context/context-storage.ts`, `context-manager.ts`, `context-schema.ts`, `context-types.ts`, `capabilities.ts`
   - Supporting types: `core/types/conversations.ts`, `core/types/index.ts`
2. Adjust imports if absolute root references differ (`@/src/...` is now mapped)
3. Run targeted smoke test: `curl http://localhost:3000/api/intelligence/context?sessionId=test-session`
   - Expect 200 with default context payload (or 404 if Supabase empty but request handled)

**Validation:** `pnpm tsc --noEmit` should pass context-related modules; record Supabase failures in log if env missing.

## 3. Port Intelligence Engine
1. Copy the full set from `FBC_masterV5/src/core/intelligence` (including `providers`, `prompts`, `workflows`, `embeddings`)
2. Bring `src/core/validation/*` and `src/api/intelligence/handler.ts`
3. Gate optional subsystems:
   - Wrap embeddings (`core/embeddings/*`) behind env checks so builds succeed without pgvector
   - Guard PDF/email workflow calls if dependencies not yet configured
4. Confirm `src/core/intelligence/index.ts` exports the upgraded service (keep `simple-service.ts` only for tests if necessary)

**Validation:** `pnpm tsc --noEmit`; unit test `researchLead` via `node --eval "require('./dist?...')"` once compiled.

## 4. Restore API Surface
1. Copy `FBC_masterV5/app/api-utils/*`
2. Replace `/app/api/intelligence/*` with FBC versions: `session-init`, `context`, `intent`, `suggestions`, `lead-research`, `education`, `analyze-image`
3. Add `/app/api/chat/unified/route.ts` and decide whether to keep the existing `/app/api/chat/route.ts` as lightweight fallback
4. Ensure rate limiting + headers align (e.g., `x-intelligence-session-id` required where documented)

**Validation:**
- `curl -X POST /api/intelligence/session-init`
- `curl -X POST /api/intelligence/intent`
- `curl -X POST /api/chat/unified` (non-stream mode for sanity)
- All should return JSON; log and address 4xx/5xx before moving on

## 5. Rewire Frontend Chat
1. Update `src/components/chat/ChatInterface.tsx`
   - Replace mock `setTimeout` reply with requests to `/api/chat/unified`
   - Add session bootstrapping (`session-init`) and context polling (`/api/intelligence/context`)
   - Honor streaming states exposed by AI SDK (maintain AI Elements features)
2. Remove unused hooks or adapt them to new message format (`UnifiedMessage`)
3. Validate suggestion chips tool into `/api/intelligence/suggestions`

**Validation:** manual run (`pnpm dev`); simulate full flow with work email and confirm Supabase context updates.

## 6. Business Intelligence Extensions
1. Integrate `core/workflows/finalizeLeadSession.ts` plus DB helpers once Supabase tables exist
2. Restore admin-facing services (`core/intelligence/admin-integration.ts`, admin routes/components) only after core chat is stable
3. Reconnect PDF/email pipeline (Puppeteer + pdf-lib) and make sure environment toggles are documented

**Validation:** targeted E2E tests (PDF generation, admin dashboards) or defer with TODO if infrastructure missing.

## 7. Documentation & Cleanup
1. Update `MIGRATION_TASKS.md`, `implementation_plan.md`, `PHASE_4_ANALYSIS.md` to reflect actual progress
2. Mark outdated docs (`GEMINI_LIVE_TASKS.md`, `CONSOLDATED_PROJECT_PLAN.md`) as archived or sync with this SoT
3. Ensure `gemini-live-api.md` references the new unified plan where relevant (model IDs, dependencies)
4. Add regression notes for any deferred features

**Validation:** final `pnpm tsc --noEmit`, `pnpm lint`, manual smoke tests, optional deployment dry run.

## 8. WebSocket Live Voice Infrastructure
1. Port the real-time server from `FBC_masterV5/server/live-server.ts` (plus helpers)
   - Ensure environment parity: `LIVE_SERVER_PORT`, `LIVE_SERVER_TLS`, `GOOGLE_GENAI_API_KEY`, etc.
   - Copy deployment scripts/guides (`WEBSOCKET_DEPLOYMENT_GUIDE.md`, Dockerfile) as references
2. Restore client voice stack
   - Hooks: `hooks/use-websocket-voice.ts`, `hooks/useGeminiLiveAudio.ts`, any audio utils they consume
   - UI integrations: re-enable voice toggle in chat, guard behind feature flag if backend missing
3. Infrastructure wiring
   - Update `.env.local` and docs with `NEXT_PUBLIC_LIVE_SERVER_URL`
   - Add middleware/CSP allowances for `wss://` endpoints if needed
   - Provide local dev script (`pnpm dev:local-ws`) and deployment instructions (Fly.io/Render)

**Validation:**
- Start the local live server (`pnpm dev:local-ws`) and verify handshake from chat client
- Confirm voice intents reach Gemini Live API (log output) or document sandbox restrictions
- Update SoT Progress with status + known blockers

---

👉 **Rule:** Do not advance to the next numbered section until all validation steps for the current stage pass. Record deviations directly in this file.
