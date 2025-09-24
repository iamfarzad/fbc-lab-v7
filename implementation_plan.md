# Implementation Plan

This document outlines the detailed plan for migrating features from FBC_masterV5 to the multimodal-ai-webapp, with a strong emphasis on testing each phase thoroughly before proceeding.

[Overview]
Migrate the Intelligence System, PDF Generation System, and Admin Dashboard from FBC_masterV5 to multimodal-ai-webapp in three distinct phases.

The migration will involve copying core logic modules, API routes, UI components, and necessary dependencies from the source project (`/Users/farzad/FBC_masterV5/`) to the target project (`multimodal-ai-webapp/`). Each phase will be followed by comprehensive testing to ensure the migrated components function correctly and integrate properly within the existing target application. The plan prioritizes establishing a working intelligence system first, followed by PDF capabilities, and finally the admin dashboard. The existing chat interface in `multimodal-ai-webapp` will be preserved, and the new intelligence APIs will be available as distinct endpoints.

[Types]
This section details new or modified type definitions, interfaces, and data structures.

**New Types (from FBC_masterV5, to be migrated):**
- `src/core/intelligence/` will contain types related to conversational intelligence, lead research, role detection, intent detection, and tool suggestions. These are likely internal to the modules but may expose interfaces.
- `src/core/context/` will contain types for context management, such as `ContextSchema`, `MultimodalContext`, `Capabilities`, and `ContextStorage` interfaces.
- `src/types/chat-enhanced.ts` and `src/types/index.ts` in the target may need to be augmented with types from `FBC_masterV5/src/types/` (e.g., `intelligence.ts`, `lead.ts`, `conversations.ts`) if the new intelligence system requires them at the application level.

**Modified Types:**
- The `EnhancedChatMessage` in `multimodal-ai-webapp/src/types/chat-enhanced.ts` might need to be extended if the new intelligence system provides additional metadata that needs to be passed through the existing chat interface, although this is not the primary integration path for Phase 1.

[Files]
This section details all file modifications, including new files, changes to existing files, and deletions.

**New Files to be Created (Copied from FBC_masterV5):**

*Phase 1: Intelligence System Foundation*
- `multimodal-ai-webapp/src/core/intelligence/conversational-intelligence.ts`
- `multimodal-ai-webapp/src/core/intelligence/lead-research.ts`
- `multimodal-ai-webapp/src/core/intelligence/role-detector.ts`
- `multimodal-ai-webapp/src/core/intelligence/intent-detector.ts`
- `multimodal-ai-webapp/src/core/intelligence/tool-suggestion-engine.ts`
- `multimodal-ai-webapp/src/core/intelligence/index.ts` (if it acts as an export barrel)
- `multimodal-ai-webapp/src/core/context/context-storage.ts`
- `multimodal-ai-webapp/src/core/context/context-manager.ts`
- `multimodal-ai-webapp/src/core/context/context-schema.ts`
- `multimodal-ai-webapp/src/core/context/context-types.ts`
- `multimodal-ai-webapp/src/core/context/multimodal-context.ts`
- `multimodal-ai-webapp/src/core/context/capabilities.ts`
- `multimodal-ai-webapp/src/core/intelligence/providers/search/google-grounding.ts`
- `multimodal-ai-webapp/src/core/intelligence/providers/enrich/company-normalizer.ts`
- `multimodal-ai-webapp/src/core/intelligence/providers/enrich/person-normalizer.ts`
- `multimodal-ai-webapp/src/core/intelligence/prompts/greeting.md`
- `multimodal-ai-webapp/src/core/intelligence/prompts/intent.md`
- `multimodal-ai-webapp/src/core/intelligence/prompts/tool_suggestions.md`
- `multimodal-ai-webapp/app/api/intelligence/session-init/route.ts`
- `multimodal-ai-webapp/app/api/intelligence/lead-research/route.ts`
- `multimodal-ai-webapp/app/api/intelligence/intent/route.ts`
- `multimodal-ai-webapp/app/api/intelligence/suggestions/route.ts`
- `multimodal-ai-webapp/app/api/intelligence/context/route.ts`
- `multimodal-ai-webapp/src/hooks/useConversationalIntelligence.ts` (Note: This is a deprecated shim and will not function without the unified system)
- `multimodal-ai-webapp/src/hooks/useIdempotency.ts`

*Phase 2: PDF Generation System*
- `multimodal-ai-webapp/lib/pdf-generator.ts`
- `multimodal-ai-webapp/app/api/send-pdf-summary/route.ts`
- `multimodal-ai-webapp/app/api/export-summary/route.ts`

*Phase 3: Admin Dashboard*
- `multimodal-ai-webapp/app/admin/page.tsx`
- `multimodal-ai-webapp/app/admin/login/page.tsx`
- `multimodal-ai-webapp/src/components/admin/AdminDashboard.tsx`
- `multimodal-ai-webapp/src/hooks/useAdminAuth.ts`
- `multimodal-ai-webapp/src/hooks/useAdminChat.ts`
- All API routes under `multimodal-ai-webapp/app/api/admin/` (e.g., `stats/route.ts`, `users/route.ts`, etc. - specific files to be copied from `FBC_masterV5/app/api/admin/`)

**Existing Files to be Modified:**
- `multimodal-ai-webapp/package.json`: Add new dependencies required by the migrated components.
- `multimodal-ai-webapp/.env.local`: Add new environment variables required for configuration (Supabase, Google Search, PDF, Email, Admin).
- `multimodal-ai-webapp/src/types/index.ts` or `multimodal-ai-webapp/src/types/chat-enhanced.ts`: Potentially augment with new types from the migrated system if necessary for application-level consumption.

**Files to be Deleted or Moved:**
- None are planned for deletion in this migration. The goal is to add new capabilities.

**Configuration File Updates:**
- `multimodal-ai-webapp/package.json`: Update `dependencies` and `devDependencies`.
- `multimodal-ai-webapp/.env.local`: Add environment variables.

[Functions]
This section details new and modified functions.

**New Functions (from FBC_masterV5, to be migrated):**

*Phase 1: Intelligence System Foundation*
*Core Intelligence Functions (in `src/core/intelligence/` files):*
- Functions for initializing conversational intelligence sessions.
- Functions for performing lead research based on email or other identifiers.
- Functions for detecting user roles from conversation context.
- Functions for determining user intent from messages.
- Functions for suggesting relevant tools or actions.
- Functions for integrating with external search (Google) and data enrichment services.

*Core Context Functions (in `src/core/context/` files):*
- Functions for storing, retrieving, and managing conversation context.
- Functions for handling multimodal context data.
- Functions for managing session capabilities.

*API Route Handlers (in `app/api/intelligence/*/route.ts`):*
- `POST /api/intelligence/session-init`: Initializes a new intelligence session.
- `POST /api/intelligence/lead-research`: Triggers lead research for a given identifier.
- `POST /api/intelligence/intent`: Analyzes text to determine user intent.
- `POST /api/intelligence/suggestions`: Provides tool/action suggestions based on context.
- `POST /api/intelligence/context`: Manages session context (get/set).

*Hook Functions (in `src/hooks/`):*
- `useConversationalIntelligence()`: Provides state and functions for interacting with the intelligence system (deprecated shim).
- `useIdempotencyKey(prefix: string): string`: Generates unique keys for requests.

*Phase 2: PDF Generation System*
*PDF Functions (in `lib/pdf-generator.ts`):*
- Functions for generating PDF reports from conversation summaries or data.
- Functions for styling and formatting PDFs.
- Functions for handling PDF generation with or without Puppeteer.

*API Route Handlers (in `app/api/send-pdf-summary/route.ts` and `app/api/export-summary/route.ts`):*
- `POST /api/send-pdf-summary`: Generates and emails a PDF summary of a session.
- `POST /api/export-summary`: Generates and provides a downloadable PDF summary.

*Phase 3: Admin Dashboard*
*Admin Component Functions (in `src/components/admin/AdminDashboard.tsx`):*
- Functions for rendering admin analytics, user management, and system monitoring.
- Functions for handling admin-specific interactions.

*Admin Hook Functions (in `src/hooks/useAdminAuth.ts` and `src/hooks/useAdminChat.ts`):*
- `useAdminAuth()`: Handles admin authentication, login, logout.
- `useAdminChat()`: Provides functionality for admins to view/interact with user chats.

*Admin API Route Handlers (in `app/api/admin/*/route.ts`):*
- Various `GET` and `POST` handlers for admin functionalities like fetching stats, managing users, etc.

**Modified Functions:**
- No existing functions in `multimodal-ai-webapp` are planned for direct modification. The new systems will be added alongside existing ones.

**Removed Functions:**
- No existing functions are planned for removal.

[Classes]
This section details new and modified classes.

**New Classes (from FBC_masterV5, to be migrated):**
*Phase 1: Intelligence System Foundation*
- Classes within `src/core/intelligence/` and `src/core/context/` for encapsulating logic (e.g., `ConversationalIntelligenceEngine`, `LeadResearcher`, `IntentDetector`, `ContextManager`, `ContextStorage`). The specific class names will be determined by the source files.

*Phase 2: PDF Generation System*
- Classes within `lib/pdf-generator.ts` for PDF document creation and manipulation (e.g., `PDFReportGenerator`).

*Phase 3: Admin Dashboard*
- Classes within `src/components/admin/AdminDashboard.tsx` for the admin dashboard React component.
- Potential utility classes within admin-related hooks or API routes for data handling.

**Modified Classes:**
- No existing classes in `multimodal-ai-webapp` are planned for direct modification.

**Removed Classes:**
- No existing classes are planned for removal.

[Dependencies]
This section details new dependencies and version changes.

**New Packages to be Added (via `pnpm add`):**
*Phase 1: Intelligence System Foundation*
- `@supabase/supabase-js`: For interacting with Supabase services (likely for context storage or user data).
- `pgvector`: For vector database operations, if used by the intelligence system.
- `crypto-js`: For cryptographic utilities, potentially used by `useIdempotency` or context management.
- `jsonwebtoken`: For JWT handling, possibly for admin or session authentication.
- `lru-cache`: For caching mechanisms within the intelligence or context systems.
- `date-fns`: For date manipulation utilities.
- `react-hook-form`: If any admin or intelligence UI components use it.
- `recharts`: If admin dashboards include charts.
- `nodemailer`: If the system sends emails (more relevant for Phase 2, but might be a base dep).
- `ical-generator`: If calendar events are generated.
- `puppeteer`: If PDF generation or other browser automation is needed (more relevant for Phase 2).
- `pdf-lib`: For PDF generation (more relevant for Phase 2).

*Phase 2: PDF Generation System*
- `puppeteer`: For server-side PDF generation if the `pdf-generator.ts` uses it.
- `pdf-lib`: Already listed, but confirmed for PDF operations.
- `nodemailer`: For sending PDF summaries via email.

*Phase 3: Admin Dashboard*
- (Dependencies are likely covered by Phase 1 and 2, or are already present like `recharts`).

**Version Changes:**
- No specific version changes for existing dependencies are anticipated unless conflicts arise during the `pnpm add` process for new packages. The existing `ai`, `@ai-sdk/google`, etc., will be maintained for the current chat system.

**Integration Requirements:**
- New dependencies must be compatible with the existing Next.js 14, React 19, and TypeScript environment.
- Environment variables for new services (Supabase, Google Search API, SMTP) must be configured in `.env.local`.

[Testing]
This section details the testing approach for each phase.

**Test File Requirements:**
- While no specific test files are being migrated, each phase requires manual and automated testing of its components.
- New test files *could* be created in the future (e.g., `tests/intelligence.test.ts`, `tests/pdf-generation.test.ts`) but are out of scope for this migration plan.

**Existing Test Modifications:**
- No existing test files in `multimodal-ai-webapp` are planned for modification.

**Validation Strategies (Per Phase):**

*Phase 1: Intelligence System Foundation Testing:*
1.  **Dependency Installation:** Ensure `pnpm install` completes without errors after adding new dependencies.
2.  **Environment Variables:** Verify that the application starts with the new environment variables in `.env.local` (even if placeholder values).
3.  **API Endpoint Functionality:**
    - Use `curl` or Postman to test each new `/api/intelligence/*` endpoint.
    - `POST /api/intelligence/session-init`: Check for successful session creation and response structure.
    - `POST /api/intelligence/lead-research`: Verify it processes input and returns research data (mocked if external services are not configured).
    - `POST /api/intelligence/intent`: Test intent detection with various text inputs.
    - `POST /api/intelligence/suggestions`: Check for relevant tool suggestions based on context.
    - `POST /api/intelligence/context`: Test context storage and retrieval.
4.  **Error Handling:** Test endpoints with malformed requests or missing data to ensure graceful error handling.
5.  **Core Module Integration:** The API tests inherently test the integration of the `src/core/intelligence` and `src/core/context` modules.
6.  **Hook Functionality (Basic):** While `useConversationalIntelligence` is a shim, `useIdempotencyKey` can be unit tested for key generation uniqueness.

*Phase 2: PDF Generation System Testing:*
1.  **API Endpoint Functionality:**
    - `POST /api/send-pdf-summary`: Test with a valid session ID. Verify PDF generation (check for file creation or email sending logs if SMTP is configured). If SMTP is not configured, test PDF generation part only.
    - `POST /api/export-summary`: Test with a valid session ID. Verify it returns a downloadable PDF.
2.  **PDF Content:** Inspect generated PDFs for correct content, formatting, and structure.
3.  **Error Handling:** Test with invalid session IDs or data that cannot be summarized.

*Phase 3: Admin Dashboard Testing:*
1.  **Page Access:**
    - Verify `/admin` redirects to `/admin/login` if not authenticated.
    - Test login functionality with correct and incorrect credentials.
    - Verify access to `/admin` after successful login.
2.  **Dashboard Functionality:**
    - Check if the admin dashboard loads without errors.
    - Verify that analytics, user lists, or other admin-specific data are displayed (data might be mocked if full backend isn't live).
3.  **Admin API Endpoints:**
    - Test all `/api/admin/*` endpoints for correct responses, ensuring they are protected and require authentication.
4.  **Admin Chat Interface (if applicable):** Test the functionality provided by `useAdminChat`.

[Implementation Order]
This section describes the logical sequence of implementation steps.

Numbered steps showing the logical order of changes to minimize conflicts and ensure successful integration.

1.  **Phase 1: Intelligence System Foundation**
    1.1. **Setup Core Directories:** Create `multimodal-ai-webapp/src/core/intelligence`, `multimodal-ai-webapp/src/core/context`, `multimodal-ai-webapp/app/api/intelligence`, and any necessary subdirectories.
    1.2. **Copy Core Intelligence Files:** Copy all `.ts` files from `/Users/farzad/FBC_masterV5/src/core/intelligence/` to `multimodal-ai-webapp/src/core/intelligence/`.
    1.3. **Copy Core Context Files:** Copy all `.ts` files from `/Users/farzad/FBC_masterV5/src/core/context/` to `multimodal-ai-webapp/src/core/context/`.
    1.4. **Copy Intelligence API Routes:** Copy all `route.ts` files from `/Users/farzad/FBC_masterV5/app/api/intelligence/` to their corresponding locations in `multimodal-ai-webapp/app/api/intelligence/`.
    1.5. **Copy Hooks:** Copy `useConversationalIntelligence.ts` and `useIdempotency.ts` from `/Users/farzad/FBC_masterV5/hooks/` to `multimodal-ai-webapp/src/hooks/`.
    1.6. **Install Dependencies:** Run `pnpm add @supabase/supabase-js pgvector puppeteer pdf-lib nodemailer ical-generator recharts date-fns react-hook-form lru-cache crypto-js jsonwebtoken` in `multimodal-ai-webapp/`.
    1.7. **Update Environment Variables:** Add required Phase 1 environment variables to `multimodal-ai-webapp/.env.local`.
    1.8. **Resolve Import Path Issues:** Review all copied files and correct any import paths that are now incorrect due to the new project structure.
    1.9. **Type Checking:** Run `pnpm run build` or `tsc --noEmit` to identify and resolve any TypeScript errors.
    1.10. **Test Phase 1:**
        - Start the development server: `pnpm dev`.
        - Test all `/api/intelligence/*` endpoints using `curl` or a similar tool as per the testing strategy.
        - Verify logs for any runtime errors.
        - Ensure the existing chat interface (`/api/chat/route.ts`) still functions.
    1.11. **Update MIGRATION_TASKS.md:** Mark Phase 1 tasks as completed.

2.  **Phase 2: PDF Generation System**
    2.1. **Setup PDF Directories:** Create `multimodal-ai-webapp/lib/` (if it doesn't exist) and `multimodal-ai-webapp/app/api/send-pdf-summary/`, `multimodal-ai-webapp/app/api/export-summary/`.
    2.2. **Copy PDF Generation Files:** Copy `lib/pdf-generator.ts` from `/Users/farzad/FBC_masterV5/` to `multimodal-ai-webapp/lib/`.
    2.3. **Copy PDF API Routes:** Copy `route.ts` files from `/Users/farzad/FBC_masterV5/app/api/send-pdf-summary/` and `/Users/farzad/FBC_masterV5/app/api/export-summary/` to their corresponding locations in `multimodal-ai-webapp/app/api/`.
    2.4. **Install Additional Dependencies (if any):** Most should be covered in Phase 1. Run `pnpm add` for any specific missing ones.
    2.5. **Update Environment Variables:** Add required Phase 2 environment variables (e.g., `PDF_USE_PUPPETEER`, SMTP settings) to `multimodal-ai-webapp/.env.local`.
    2.6. **Resolve Import Path Issues:** Review copied PDF files and correct import paths.
    2.7. **Type Checking:** Run `pnpm run build` or `tsc --noEmit`.
    2.8. **Test Phase 2:**
        - Start the development server: `pnpm dev`.
        - Test `/api/send-pdf-summary` and `/api/export-summary` endpoints.
        - Verify PDF generation (inspect output files or email sending logs).
    2.9. **Update MIGRATION_TASKS.md:** Mark Phase 2 tasks as completed.

3.  **Phase 3: Admin Dashboard**
    3.1. **Setup Admin Directories:** Create `multimodal-ai-webapp/app/admin/`, `multimodal-ai-webapp/app/admin/login/`, `multimodal-ai-webapp/src/components/admin/`, and `multimodal-ai-webapp/app/api/admin/`.
    3.2. **Copy Admin Page Files:** Copy `page.tsx` files from `/Users/farzad/FBC_masterV5/app/admin/` and `/Users/farzad/FBC_masterV5/app/admin/login/` to `multimodal-ai-webapp/app/admin/` and `multimodal-ai-webapp/app/admin/login/` respectively.
    3.3. **Copy Admin Component Files:** Copy `AdminDashboard.tsx` from `/Users/farzad/FBC_masterV5/components/admin/` to `multimodal-ai-webapp/src/components/admin/`.
    3.4. **Copy Admin Hooks:** Copy `useAdminAuth.ts` and `useAdminChat.ts` from `/Users/farzad/FBC_masterV5/hooks/` to `multimodal-ai-webapp/src/hooks/`.
    3.5. **Copy Admin API Routes:** Copy all API route files from `/Users/farzad/FBC_masterV5/app/api/admin/` to `multimodal-ai-webapp/app/api/admin/`.
    3.6. **Install Additional Dependencies (if any):** Most should be covered.
    3.7. **Update Environment Variables:** Add required Phase 3 environment variables (e.g., `ADMIN_EMAIL`, `ADMIN_PASSWORD`) to `multimodal-ai-webapp/.env.local`.
    3.8. **Resolve Import Path Issues:** Review all copied admin files and correct import paths.
    3.9. **Type Checking:** Run `pnpm run build` or `tsc --noEmit`.
    3.10. **Test Phase 3:**
        - Start the development server: `pnpm dev`.
        - Test admin login flow.
        - Test access to `/admin` page.
        - Test functionality within the admin dashboard.
        - Test all `/api/admin/*` endpoints for authentication and response.
    3.11. **Update MIGRATION_TASKS.md:** Mark Phase 3 tasks as completed.

4.  **Final Tasks**
    4.1. **End-to-End Testing:** Conduct a full test of the application, including existing features and all newly migrated features.
    4.2. **Code Review and Refactoring:** Perform a final code review. Refactor any duplicated code or improve integration points if necessary.
    4.3. **Update Documentation:** Update `README.md` or other relevant documentation in `multimodal-ai-webapp` to reflect the new features and any new configuration requirements.
    4.4. **Commit Changes:** Commit all changes for the migration.
