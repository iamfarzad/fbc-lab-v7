# F.B/c AI Copilot - Production Feature Implementation Plan

## Overview

This plan includes **Day 0 UI/UX Audit** followed by 11 feature implementation days, each with its own branch and testing. UI/UX issues tracked in `/UI_UX_ISSUES.md` and fixed progressively.

**Codebase audit findings**:
- Multi-agent system exists (`src/core/agents/`) but feature-flagged (`ENABLE_MULTI_AGENT=false`)
- Context sharing partially implemented via `MultimodalContextManager`
- Visual capture hooks exist (`useCamera`, `useScreenShare`) but not integrated
- Upload analysis APIs created but not connected to UI
- Landing page components exist but need polish
- **UI/UX issues present** (to be catalogued Day 0)

> **Update (Oct 27, 2025):** The legacy floating ChatInterface widget under `src/components/chat/` has been retired. The `/live` voice-first interface is now the canonical chat surface. Any references to those legacy files in later sections remain for historical context only.

## Priority Order

1. **Day 0**: UI/UX Audit & Issue Tracking (FOUNDATION)
2. **Day 1**: AI-SDK Agents
3. **Day 2**: Context Sharing  
4. **Day 3**: Webcam/Screen-Share Analysis
5. **Day 4**: Upload Analysis Integration
6. **Day 5**: Landing Page Polish
7. **Days 6-11**: Remaining features
8. **Day 12**: Final UI/UX Polish Sprint

---

## Day 0: UI/UX Audit & Issue Tracking System

**Branch**: `feature/ui-ux-audit`
**Status**: IN PROGRESS

### Objective

Create comprehensive UI/UX audit and tracking system in `/UI_UX_ISSUES.md`. This becomes the single source of truth for all UI/UX improvements throughout the 12-day sprint.

### Implementation Steps

#### 1. Create UI/UX Issues Tracking File ✅

**New file**: `/UI_UX_ISSUES.md`

Structure:
```markdown
# F.B/c AI - UI/UX Issues & Improvements

## Issue Categories

### Critical (Blocks usability)
- [ ] Issue 1: Description | File: path/to/file.tsx | Fix Day: X

### High (Major impact)
- [ ] Issue 2: Description | File: path/to/file.tsx | Fix Day: X

### Medium (Noticeable but not blocking)
- [ ] Issue 3: Description | File: path/to/file.tsx | Fix Day: X

### Low (Polish & refinement)
- [ ] Issue 4: Description | File: path/to/file.tsx | Fix Day: X
```

#### 2. Audit Each Major Component

**Components to audit**:
- `src/components/chat/ChatInterface.tsx`
- `src/components/chat/components/ChatMessages.tsx`
- `src/components/chat/components/ChatInput.tsx`
- `src/components/chat/components/ChatActions.tsx`
- `src/components/Navigation.tsx`
- `src/components/HeroSection.tsx`
- All AI elements in `src/components/ai-elements/`
- Mobile responsiveness across all pages

**Audit checklist per component**:
- [ ] Spacing consistent with design system
- [ ] Mobile responsive (test 320px, 375px, 768px, 1024px)
- [ ] Touch targets ≥44px on mobile
- [ ] ARIA labels present
- [ ] Keyboard navigation works
- [ ] Loading states clear
- [ ] Error states helpful
- [ ] Color contrast ≥4.5:1
- [ ] Animations smooth (60fps)

#### 3. Test User Flows

**Critical flows to test**:
1. Landing page → Chat button → Chat opens
2. Accept terms → Start conversation → Get response
3. Upload file → See analysis → Continue chat
4. Start voice → Speak → Get voice response
5. Enable webcam → See capture indicator → Analysis appears
6. Mobile: All of above on iPhone/Android

#### 4. Create Cursor Rule for UI/UX ✅

**New file**: `/.cursor/rules/ui-ux-standards.mdc`

#### 5. Browser Testing Checklist

Test on:
- [ ] Chrome Desktop (latest)
- [ ] Safari Desktop (latest)
- [ ] Firefox Desktop (latest)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS 16+)
- [ ] Tablet (iPad)

### Deliverables

1. `/UI_UX_ISSUES.md` - Complete audit with 30-50 documented issues
2. `/.cursor/rules/ui-ux-standards.mdc` - Standards enforced by AI
3. `/.cursor/rules/production-roadmap.mdc` - Current day tracking
4. `docs/daily-logs/day-0-ui-audit.md` - Detailed audit results

### Success Criteria

- [ ] All major components audited
- [ ] Issues categorized by severity
- [ ] Each issue assigned to a day (1-12)
- [ ] Cursor rules created for ongoing enforcement
- [ ] Test results documented

---

## File Structure

```
fbc_lab_v7/
├── PRODUCTION_ROADMAP.md           ← This file
├── UI_UX_ISSUES.md                 ← Issue tracker (Day 0)
├── .cursor/rules/
│   ├── production-roadmap.mdc      ← Current day focus (Day 0)
│   └── ui-ux-standards.mdc         ← UI/UX standards (Day 0)
└── docs/
    └── daily-logs/
        ├── day-0-ui-audit.md       ← Audit results
        └── ...
```

## Quick Commands

```bash
# View full roadmap
cat PRODUCTION_ROADMAP.md | less

# View UI/UX issues
cat UI_UX_ISSUES.md | grep "^\- \[ \]"  # Incomplete
cat UI_UX_ISSUES.md | grep "^\- \[x\]"  # Complete

# View specific day
grep -A 50 "Day 1:" PRODUCTION_ROADMAP.md

# Check progress
grep -c "^\- \[x\]" UI_UX_ISSUES.md
```
