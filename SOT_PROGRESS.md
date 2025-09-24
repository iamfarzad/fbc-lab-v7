# ✅ Migration Progress Checklist

Refer to `SOT_MIGRATION_PLAN.md` for detailed instructions. Tick off each item only after completing the validation steps noted in the SoT.

## 1. Align Build & Environment
- [x] 1.1 Update tsconfig paths (`@/*`, `@/src/*`) and set target ≥ ES2017
- [x] 1.2 Sync `.env.local` with FBC templates (env-template.txt, server-env-template.txt)
- [x] 1.3 Port shared utilities (zod shim, logger, supabase helper)
- [x] 1.4 Run `pnpm tsc --noEmit` and confirm only missing-module errors remain

## 2. Port Context & Supabase Layer
- [x] 2.1 Copy Supabase modules (server.ts, client.ts, vercel-replacements.ts)
- [x] 2.2 Copy context modules (storage, manager, schema, types, capabilities)
- [x] 2.3 Copy supporting types (`core/types/*` as needed)
- [ ] 2.4 Smoke test `/api/intelligence/context` with curl; ensure response without crashes

## 3. Port Intelligence Engine
- [x] 3.1 Copy full `core/intelligence` folder (providers, prompts, workflows, embeddings)
- [x] 3.2 Copy `core/validation` and `api/intelligence/handler.ts`
- [x] 3.3 Guard optional subsystems (embeddings, PDF/email) behind env checks
- [x] 3.4 Verify upgraded exports and run `pnpm tsc --noEmit`

## 4. Restore API Surface
- [ ] 4.1 Copy `app/api-utils/*`
- [ ] 4.2 Replace `/app/api/intelligence/*` routes with FBC versions
- [ ] 4.3 Add `/app/api/chat/unified/route.ts` and decide on legacy chat route
- [ ] 4.4 Exercise key endpoints (`session-init`, `intent`, `chat/unified`) via curl

## 5. Rewire Frontend Chat
- [ ] 5.1 Replace mock responses in `ChatInterface` with unified API calls
- [ ] 5.2 Integrate session-init/context refresh and streaming state handling
- [ ] 5.3 Validate suggestion chips hit `/api/intelligence/suggestions`
- [ ] 5.4 Manual QA: full chat flow updates Supabase context

## 6. Business Intelligence Extensions
- [ ] 6.1 Integrate `finalizeLeadSession` workflow and DB helpers (if infrastructure ready)
- [ ] 6.2 Restore admin intelligence services/routes/components
- [ ] 6.3 Re-enable PDF/email pipeline with documented toggles
- [ ] 6.4 Run targeted E2E tests or document deferrals

## 7. Documentation & Cleanup
- [ ] 7.1 Update `MIGRATION_TASKS.md`, `implementation_plan.md`, `PHASE_4_ANALYSIS.md`
- [ ] 7.2 Archive or sync other planning docs with SoT
- [ ] 7.3 Cross-reference `gemini-live-api.md` with new plan
- [ ] 7.4 Final `pnpm tsc`, `pnpm lint`, smoke tests, optional deploy dry run

> Update this checklist after each stage; don’t advance until all tasks in the current section are checked and validated.
