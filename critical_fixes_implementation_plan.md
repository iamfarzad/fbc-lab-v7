# Implementation Plan

[Overview]
Fix critical production issues blocking the user workflow on www.farzadbayat.com including voice feature errors, PDF export failures, and broken booking links.

This implementation addresses three critical issues discovered during end-to-end testing that prevent users from completing the full consultation workflow: voice interactions triggering error pages, PDF summary exports not downloading, and booking links leading to 404 errors. Based on git history analysis, these issues were introduced during a media architecture overhaul, serverless migration, and partial booking system migration from Calendly to Cal.com. These fixes are essential for converting website visitors into consulting leads.

[Types]  
Define error handling types and session management interfaces for robust error recovery.

Detailed type definitions for voice session state management, PDF generation response types, and booking link configuration:
```typescript
interface VoiceSessionState {
  isActive: boolean
  connectionId: string | null
  error: string | null
  isProcessing: boolean
  retryCount: number
}

interface PdfGenerationResponse {
  success: boolean
  pdfBuffer?: Uint8Array
  error?: string
  downloadUrl?: string
}

interface BookingConfiguration {
  calendlyUrl: string
  calComUrl: string
  fallbackUrl: string
  isEnabled: boolean
  provider: 'calendly' | 'cal.com'
}
```

[Files]
Single sentence describing the file modifications needed across voice, PDF, booking, and logging components.

Detailed breakdown:
- New files to be created (with full paths and purpose)
  - `src/components/error-boundaries/VoiceErrorBoundary.tsx` - Enhanced error boundary for voice features
  - `src/config/booking.ts` - Centralized booking configuration
  - `src/lib/pdf-client.ts` - Client-side PDF download helper
- Existing files to be modified (with specific changes)  
  - `src/hooks/useRealtimeVoice.ts` - Add better error handling and session recovery
  - `app/api/export-summary/route.ts` - Fix PDF generation for serverless environments
  - `src/components/chat/artifacts/CalendarWidget.tsx` - Update with configurable booking URL
  - `src/components/chat/components/ChatHeader.tsx` - Add booking URL configuration
  - `src/components/chat/SessionLimitWarning.tsx` - Update booking link
  - `app/api/logs/ingest/route.ts` - Add CORS headers and better error handling
- Files to be deleted or moved
  - None identified
- Configuration file updates
  - `.env.production` - Add booking URL configuration

[Functions]
Single sentence describing the function modifications needed for error handling and user experience improvements.

Detailed breakdown:
- New functions (name, signature, file path, purpose)
  - `handleVoiceSessionError(error: string, retryCount: number): void` in `src/hooks/useRealtimeVoice.ts` - Centralized error handling with retry logic
  - `downloadPdfFromBuffer(buffer: Uint8Array, filename: string): void` in `src/lib/pdf-client.ts` - Client-side PDF download functionality
  - `validateBookingUrl(url: string): boolean` in `src/config/booking.ts` - URL validation for booking links
- Modified functions (exact name, current file path, required changes)
  - `sendRealtimeInput` in `src/hooks/useRealtimeVoice.ts` - Add session validation before sending
  - `generatePdfWithPuppeteer` in `src/core/pdf-generator-puppeteer.ts` - Fix serverless file handling
  - `window.open(url, '_blank')` in CalendarWidget.tsx - Replace with configurable URL
- Removed functions (name, file path, reason, migration strategy)
  - None identified

[Classes]
Single sentence describing class modifications for enhanced error boundaries and PDF generation.

Detailed breakdown:
- New classes (name, file path, key methods, inheritance)
  - `VoiceErrorBoundary` in `src/components/error-boundaries/VoiceErrorBoundary.tsx` - React error boundary with retry functionality and user-friendly error messages
- Modified classes (exact name, file path, specific modifications)
  - `LogBuffer` in `app/api/logs/ingest/route.ts` - Add rate limiting and better error handling
- Removed classes (name, file path, replacement strategy)
  - None identified

[Dependencies]
Single sentence describing dependency modifications for PDF generation and error handling.

Details of new packages, version changes, and integration requirements:
- No new dependencies required - using existing pdf-lib and puppeteer packages
- Update environment configuration to support serverless PDF generation
- Ensure CORS headers are properly configured for API routes

[Testing]
Single sentence describing testing approach for validating all critical user workflows.

Test file requirements, existing test modifications, and validation strategies:
- Create integration tests for voice session lifecycle
- Test PDF generation and download functionality
- Validate booking links open correctly
- Test error recovery scenarios
- Add end-to-end tests for complete user workflow

[Implementation Order]
Single sentence describing the implementation sequence to minimize user impact.

Numbered steps showing the logical order of changes to minimize conflicts and ensure successful integration:
1. Fix booking system migration - complete migration from Calendly to Cal.com (highest priority - blocks user conversion)
2. Enhance voice session error handling and recovery (prevents user frustration)
3. Fix PDF export functionality for serverless environments (completes user workflow)
4. Improve logs API error handling and CORS configuration (better debugging)
5. Add comprehensive error boundaries and user feedback (improves user experience)
6. Create integration tests to prevent regressions (ensures stability)
