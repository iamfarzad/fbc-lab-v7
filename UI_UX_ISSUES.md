# F.B/c AI - UI/UX Issues & Improvements

**Status**: Day 0 Audit in Progress  
**Last Updated**: October 24, 2025

## Summary

- **Total Issues**: 35+ UI/UX issues identified and prioritized
- **Critical**: 3 issues (ALL FIXED ✅)
- **High**: 8 issues (Major impact on usability)
- **Medium**: 12 issues (Noticeable but not blocking)
- **Low**: 12 issues (Polish & refinement)

> **Legacy Note (Oct 27, 2025):** The floating ChatInterface widget and its supporting components were fully removed in favor of the dedicated `/live` experience. Historical items in this document that reference `src/components/chat/ChatInterface.tsx` (and related child components) are retained for audit history only and no longer reflect active code paths.

---

## Issue Categories

### Critical (Blocks usability) - ALL FIXED ✅

#### CRIT-001: Chat Container Mobile Safe Area Issues
- **Description**: Chat container doesn't properly handle mobile notches and bottom bars on iOS
- **File**: `src/components/chat/components/ChatContainer.tsx:20-23`
- **Issue**: Using `safe-area-inset-top` and `safe-area-inset-bottom` classes but may not be properly configured
- **Impact**: Content may be hidden behind notch or home indicator on iOS devices
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [x] Fixed - Added proper env() CSS functions for all safe areas

#### CRIT-002: Terms Acceptance Not Keyboard Accessible
- **Description**: Terms acceptance form may not be fully keyboard navigable
- **File**: `src/components/chat/components/ChatTermsAcceptance.tsx`
- **Issue**: Need to verify Tab key navigation and Enter key submission work
- **Impact**: Users relying on keyboard navigation cannot accept terms
- **Fix Day**: 7 (Accessibility)
- **Status**: [x] Fixed - Added form submission, keyboard handlers, ARIA attributes, and proper focus management

#### CRIT-003: Voice Session Toggle No Loading Feedback
- **Description**: When toggling voice session, no immediate visual feedback before connection
- **File**: `src/components/chat/ChatInterface.tsx` (voice toggle handler)
- **Issue**: User clicks voice button but doesn't know if anything is happening for 1-2 seconds
- **Impact**: User confusion, may click multiple times
- **Fix Day**: 1 (AI-SDK Agents + Voice UI)
- **Status**: [x] Fixed - Added immediate feedback, error handling, and enhanced AI voice state indicators

---

### High (Major impact)

#### HIGH-001: Navigation Button Touch Targets
- **Description**: 8 navigation buttons have 0x0 dimensions on mobile, completely unusable
- **File**: `src/components/Navigation.tsx`
- **Issue**: Navigation buttons `[SERVICES]`, `[ABOUT]`, `[WORKSHOPS]`, `[CONTACT]` not visible on mobile
- **Impact**: Mobile users cannot access main navigation
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### HIGH-002: Chat Header Height Issues
- **Description**: Chat header only 36px height (below 44px minimum)
- **File**: `src/components/chat/components/ChatHeader.tsx`
- **Issue**: Header height too small for proper touch accessibility
- **Impact**: Poor touch accessibility, cramped layout
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### HIGH-003: Missing ARIA Labels
- **Description**: 8/8 navigation buttons lack ARIA labels
- **File**: `src/components/Navigation.tsx`
- **Issue**: All navigation buttons missing `aria-label` attributes
- **Impact**: Screen reader users cannot navigate
- **Fix Day**: 7 (Accessibility)
- **Status**: [ ] Not Fixed

#### HIGH-004: Chat Input Accessibility
- **Description**: Chat input lacks proper labeling
- **File**: `src/components/chat/components/ChatInput.tsx`
- **Issue**: Input field missing `aria-label` or associated label
- **Impact**: Screen reader users cannot understand input purpose
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### HIGH-005: Voice Button Accessibility
- **Description**: Voice button lacks ARIA label
- **File**: `src/components/chat/components/ConversationBar.tsx`
- **Issue**: Voice control button missing `aria-label`
- **Impact**: Screen reader users cannot identify voice controls
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### HIGH-006: Messages Area Scroll Issues
- **Description**: Messages area not properly scrollable
- **File**: `src/components/chat/components/ChatMessages.tsx`
- **Issue**: Messages container lacks proper overflow handling
- **Impact**: Long conversations become unusable
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### HIGH-007: Mobile Safe Area Implementation
- **Description**: Safe area classes present but not applying padding
- **File**: `src/components/chat/components/ChatContainer.tsx`
- **Issue**: CSS classes present but `paddingTop: "0px", paddingBottom: "0px"`
- **Impact**: Content hidden behind iOS notches despite classes
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### HIGH-008: Small Touch Targets
- **Description**: 23/36 buttons below 44px minimum on mobile
- **File**: Various components
- **Issue**: Many buttons too small for mobile touch
- **Impact**: Poor mobile usability
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

---

### Medium (Noticeable but not blocking)

#### MED-001: Chat Container Layout
- **Description**: Container dimensions not optimal for mobile
- **File**: `src/components/chat/components/ChatContainer.tsx`
- **Issue**: 420px width, 500px height on 375px viewport
- **Impact**: Poor mobile experience
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### MED-002: Button Text Accessibility
- **Description**: Many buttons have "No text" content
- **File**: Various components
- **Issue**: Icon-only buttons without labels
- **Impact**: Users cannot understand button purpose
- **Fix Day**: 7 (Accessibility)
- **Status**: [ ] Not Fixed

#### MED-003: Chat Interface Spacing
- **Description**: Inconsistent spacing between elements
- **File**: `src/components/chat/components/`
- **Issue**: Visual hierarchy problems
- **Impact**: Poor visual hierarchy
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### MED-004: Mobile Navigation Hidden
- **Description**: Desktop navigation buttons hidden on mobile
- **File**: `src/components/Navigation.tsx`
- **Issue**: Services, About, Workshops, Contact not accessible on mobile
- **Impact**: Users cannot access main navigation
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### MED-005: Chat Prompt Buttons
- **Description**: Prompt buttons have inconsistent sizing
- **File**: `src/components/chat/components/ChatMessages.tsx`
- **Issue**: Chat suggestion buttons inconsistent
- **Impact**: Poor visual hierarchy
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### MED-006: Voice Controls Layout
- **Description**: Voice controls not properly aligned
- **File**: `src/components/chat/components/ConversationBar.tsx`
- **Issue**: Voice session buttons layout issues
- **Impact**: Confusing user interface
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### MED-007: Chat Header Branding
- **Description**: Chat header shows "F•B" instead of full branding
- **File**: `src/components/chat/components/ChatHeader.tsx`
- **Issue**: Inconsistent branding display
- **Impact**: Inconsistent branding
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### MED-008: Mobile Chat Positioning
- **Description**: Chat positioning not optimal for mobile
- **File**: `src/components/chat/components/ChatContainer.tsx`
- **Issue**: Mobile chat layout needs improvement
- **Impact**: Poor mobile user experience
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### MED-009: Button State Indicators
- **Description**: Buttons lack clear active/disabled states
- **File**: Various components
- **Issue**: Button states not clearly indicated
- **Impact**: User confusion about button state
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### MED-010: Chat Input Placeholder
- **Description**: Chat input shows "John Doe" instead of proper placeholder
- **File**: `src/components/chat/components/ChatInput.tsx`
- **Issue**: Input placeholder confusing
- **Impact**: Confusing user experience
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### MED-011: Mobile Menu Button
- **Description**: Mobile menu button lacks proper labeling
- **File**: `src/components/Navigation.tsx`
- **Issue**: Mobile menu button missing ARIA label
- **Impact**: Mobile navigation unclear
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### MED-012: Chat Actions Layout
- **Description**: Chat actions not properly organized
- **File**: `src/components/chat/components/ChatActions.tsx`
- **Issue**: Voice, camera, screen share buttons layout
- **Impact**: Confusing user interface
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

---

### Low (Polish & refinement)

#### LOW-001: Visual Hierarchy
- **Description**: Inconsistent text sizing and spacing
- **File**: Various components
- **Issue**: Text hierarchy not consistent
- **Impact**: Poor visual hierarchy
- **Fix Day**: 12 (Final Polish)
- **Status**: [ ] Not Fixed

#### LOW-002: Animation Consistency
- **Description**: Inconsistent animation timing
- **File**: Various components
- **Issue**: Animation timing varies
- **Impact**: Jarring user experience
- **Fix Day**: 12 (Final Polish)
- **Status**: [ ] Not Fixed

#### LOW-003: Color Contrast
- **Description**: Some text may not meet WCAG AA standards
- **File**: Various components
- **Issue**: Color contrast needs testing
- **Impact**: Accessibility concerns
- **Fix Day**: 7 (Accessibility)
- **Status**: [ ] Not Fixed

#### LOW-004: Loading States
- **Description**: Inconsistent loading indicators
- **File**: Various components
- **Issue**: Loading states not consistent
- **Impact**: User confusion during loading
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### LOW-005: Error States
- **Description**: Error messages not user-friendly
- **File**: Various components
- **Issue**: Error handling needs improvement
- **Impact**: Poor error handling
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### LOW-006: Success Feedback
- **Description**: Success actions lack clear feedback
- **File**: Various components
- **Issue**: Success states not clear
- **Impact**: User uncertainty
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### LOW-007: Mobile Typography
- **Description**: Text sizing not optimized for mobile
- **File**: Various components
- **Issue**: Mobile text sizing
- **Impact**: Poor mobile readability
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### LOW-008: Desktop Layout
- **Description**: Desktop layout could be more efficient
- **File**: Various components
- **Issue**: Desktop space usage
- **Impact**: Wasted screen space
- **Fix Day**: 12 (Final Polish)
- **Status**: [ ] Not Fixed

#### LOW-009: Icon Consistency
- **Description**: Icons not consistent across components
- **File**: Various components
- **Issue**: Icon usage inconsistent
- **Impact**: Visual inconsistency
- **Fix Day**: 12 (Final Polish)
- **Status**: [ ] Not Fixed

#### LOW-010: Spacing System
- **Description**: Inconsistent spacing throughout
- **File**: Various components
- **Issue**: Spacing not systematic
- **Impact**: Poor visual hierarchy
- **Fix Day**: 12 (Final Polish)
- **Status**: [ ] Not Fixed

#### LOW-011: Focus Indicators
- **Description**: Focus indicators not consistent
- **File**: Various components
- **Issue**: Focus states inconsistent
- **Impact**: Keyboard navigation unclear
- **Fix Day**: 7 (Accessibility)
- **Status**: [ ] Not Fixed

#### LOW-012: Component Consistency
- **Description**: Similar components look different
- **File**: Various components
- **Issue**: Component styling inconsistent
- **Impact**: Inconsistent user experience
- **Fix Day**: 12 (Final Polish)
- **Status**: [ ] Not Fixed
- **Impact**: Looks cramped on some devices, too spacious on others
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### HIGH-002: Message List Doesn't Preserve Scroll Position on New Message
- **Description**: When new message arrives, scroll position may jump unexpectedly
- **File**: `src/components/chat/components/ChatMessages.tsx`
- **Issue**: No smooth scroll behavior or scroll position preservation
- **Impact**: User loses reading position, jarring experience
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### HIGH-003: No Visual Indicator for Multimodal Context Active
- **Description**: When webcam/screen share is capturing, no persistent indicator showing
- **File**: `src/components/chat/ChatInterface.tsx`
- **Issue**: User doesn't know if visual analysis is happening
- **Impact**: Confusion about what AI can "see"
- **Fix Day**: 3 (Webcam/Screen-Share Analysis)
- **Status**: [ ] Not Fixed

#### HIGH-004: Chat Actions Overflow on Small Mobile Screens
- **Description**: Voice, camera, screen share buttons may overflow on 320px width
- **File**: `src/components/chat/components/ChatActions.tsx`
- **Issue**: Too many buttons in single row without wrapping or scrolling
- **Impact**: Buttons cut off or unusable on small screens
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### HIGH-005: Loading States Don't Show Skeleton UI
- **Description**: When messages are loading, just shows blank space
- **File**: `src/components/chat/components/ChatMessages.tsx`
- **Issue**: No skeleton loader, just empty state
- **Impact**: Appears broken or slow
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### HIGH-006: Error Messages Not Actionable
- **Description**: Errors like "Failed to send message" don't suggest next steps
- **File**: Multiple components with error handling
- **Issue**: Generic error messages without retry button or specific action
- **Impact**: User stuck, doesn't know what to do
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### HIGH-007: File Upload Progress Not Visible
- **Description**: When uploading file, no progress indicator
- **File**: `src/components/chat/hooks/useChatMessages.ts:106-134`
- **Issue**: Upload happens but user sees nothing until complete/error
- **Impact**: Appears frozen, user may refresh
- **Fix Day**: 4 (Upload Analysis Integration)
- **Status**: [ ] Not Fixed

---

### Medium (Noticeable but not blocking)

#### MED-001: Chat Width Jumps on Expand/Collapse
- **Description**: Transition between normal and expanded width not smooth
- **File**: `src/components/chat/ChatInterface.tsx`
- **Issue**: Using different width classes without smooth transition
- **Impact**: Jarring visual jump
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### MED-002: Placeholder Text Too Generic
- **Description**: "Ask about AI consulting..." doesn't adapt to context
- **File**: `src/components/chat/components/ChatInput.tsx:340`
- **Issue**: Same placeholder regardless of conversation stage or modality
- **Impact**: Missed opportunity for guidance
- **Fix Day**: 1 (AI-SDK Agents)
- **Status**: [ ] Not Fixed

#### MED-003: Avatar/Icon Sizes Inconsistent
- **Description**: User and assistant avatars may be different sizes
- **File**: `src/components/chat/components/ChatMessages.tsx`
- **Issue**: Need to verify consistent sizing across message types
- **Impact**: Visual inconsistency
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### MED-004: Focus Indicators Not Visible Enough
- **Description**: Keyboard focus outline hard to see in dark mode
- **File**: Global CSS / component styles
- **Issue**: Default focus ring too subtle
- **Impact**: Keyboard users lose track of focus
- **Fix Day**: 7 (Accessibility)
- **Status**: [ ] Not Fixed

#### MED-005: Animation Frame Rate Drops on Low-End Devices
- **Description**: Chat open/close animation stutters on older phones
- **File**: `src/components/chat/ChatInterface.tsx` (framer-motion)
- **Issue**: Complex animations without GPU optimization
- **Impact**: Poor performance perception
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### MED-006: Timestamp Formatting Not Localized
- **Description**: Message timestamps may show in wrong timezone or format
- **File**: `src/components/chat/components/ChatMessages.tsx`
- **Issue**: No timezone detection or locale-aware formatting
- **Impact**: Confusing timestamps for international users
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### MED-007: Color Contrast Issues in Muted States
- **Description**: Muted text may not meet WCAG AA 4.5:1 contrast
- **File**: Multiple components using `text-muted-foreground`
- **Issue**: Need to verify contrast ratios
- **Impact**: Hard to read for users with vision impairments
- **Fix Day**: 7 (Accessibility)
- **Status**: [ ] Not Fixed

#### MED-008: No Confirmation Before Closing Chat with Unsent Message
- **Description**: User types message, closes chat, message lost
- **File**: `src/components/chat/ChatInterface.tsx`
- **Issue**: No warning about unsent content
- **Impact**: Data loss, user frustration
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

---

### Low (Polish & refinement)

#### LOW-001: Chat Button FAB Position Shifts on Scroll
- **Description**: Floating action button (chat button) may shift slightly on scroll
- **File**: Navigation or landing page
- **Issue**: Fixed positioning may not be truly fixed
- **Impact**: Minor visual distraction
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### LOW-002: Hover States Missing on Some Buttons
- **Description**: Not all interactive elements show hover feedback
- **File**: Various components
- **Issue**: Some buttons lack hover:bg- classes
- **Impact**: Unclear what's clickable
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### LOW-003: Tooltip Delays Too Long
- **Description**: Hover tooltips take 1+ second to appear
- **File**: Components using tooltip
- **Issue**: Default delay too long for good UX
- **Impact**: Users don't wait to see tooltips
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### LOW-004: Emoji Picker Would Improve Input
- **Description**: No way to add emojis easily in messages
- **File**: `src/components/chat/components/ChatInput.tsx`
- **Issue**: Feature gap
- **Impact**: Less expressive messaging
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### LOW-005: Keyboard Shortcuts Not Documented
- **Description**: Users don't know about Cmd+K, Escape, etc.
- **File**: No help/shortcuts modal
- **Issue**: Hidden power features
- **Impact**: Missed efficiency gains
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### LOW-006: Chat History Search Missing
- **Description**: No way to search through past messages
- **File**: ChatMessages component
- **Issue**: Feature gap for long conversations
- **Impact**: Hard to find previous information
- **Fix Day**: 11 (Future enhancement)
- **Status**: [ ] Not Fixed

---

## Component-Specific Issues

### ChatInterface.tsx
- CRIT-003: Voice toggle loading
- HIGH-002: Scroll position preservation
- HIGH-003: Multimodal indicator
- MED-001: Width transition
- MED-008: Unsaved message warning

### ChatMessages.tsx  
- HIGH-002: Scroll behavior
- HIGH-005: Skeleton loaders
- MED-003: Avatar consistency
- MED-006: Timestamp formatting

### ChatInput.tsx
- HIGH-001: Spacing consistency
- MED-002: Context-aware placeholder
- LOW-004: Emoji picker

### ChatActions.tsx
- HIGH-004: Button overflow on small screens

### ChatContainer.tsx
- CRIT-001: Safe area handling

### ChatTermsAcceptance.tsx
- CRIT-002: Keyboard accessibility

---

## Category Breakdown

### Layout & Spacing
- HIGH-001, MED-001, LOW-001

### Responsive Design  
- CRIT-001, HIGH-001, HIGH-004

### Accessibility (ARIA, keyboard nav)
- CRIT-002, MED-004, MED-007

### Loading States & Feedback
- CRIT-003, HIGH-005, HIGH-007

### Error Handling UI
- HIGH-006

### Mobile Experience
- CRIT-001, HIGH-001, HIGH-004, MED-005

### Animation & Transitions
- MED-001, MED-005

### Component Consistency
- MED-003, LOW-002

### Voice UI Feedback
- CRIT-003

### Multimodal Indicators
- HIGH-003

---

## Testing Status

### Browser Testing
- [ ] Chrome Desktop (latest)
- [ ] Safari Desktop (latest)  
- [ ] Firefox Desktop (latest)
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS 16+)
- [ ] Tablet (iPad)

### Screen Size Testing
- [ ] 320px (iPhone SE)
- [ ] 375px (iPhone 12/13)
- [ ] 768px (iPad Portrait)
- [ ] 1024px (iPad Landscape)
- [ ] 1440px (Desktop)

### User Flow Testing
- [ ] Landing → Chat button → Opens
- [ ] Accept terms → Chat → Response
- [ ] Upload file → Analysis → Continue
- [ ] Voice → Speak → Response  
- [ ] Webcam → Indicator → Analysis
- [ ] Mobile versions all above

---

## Priority Matrix (By Day)

- **Day 1** (AI-SDK Agents): CRIT-003, HIGH-002, HIGH-005, HIGH-006, MED-002
- **Day 3** (Webcam/Screen): HIGH-003
- **Day 4** (Upload): HIGH-007
- **Day 5** (Landing Polish): CRIT-001, HIGH-001, HIGH-004, LOW-001
- **Day 7** (Accessibility): CRIT-002, MED-004, MED-007
- **Day 12** (Final Polish): MED-001, MED-003, MED-005, MED-006, MED-008, LOW-002, LOW-003, LOW-004, LOW-005
- **Future**: LOW-006

#### LOW-007: Action Buttons Too Small on Touch Devices
- **Description**: Action buttons in AI elements are 20px (size-5) but should be 44px minimum
- **File**: `src/components/ai-elements/interactive/actions.tsx:38`
- **Issue**: `size-5` class creates 20px button, below 44px touch target minimum
- **Impact**: Hard to tap on mobile devices
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### LOW-008: Tooltip Delay Too Long (200ms)
- **Description**: Tooltip shows after 200ms which is slow for immediate feedback
- **File**: `src/components/ai-elements/interactive/actions.tsx:54`
- **Issue**: `delayDuration={200}` could be reduced to 100ms
- **Impact**: Users don't see helpful tooltips quickly enough
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### LOW-009: Navigation Anchor Links May Not Work on All Browsers
- **Description**: Navigation uses `scrollIntoView({ behavior: 'smooth' })` which isn't fully supported
- **File**: `src/components/Navigation.tsx:24`
- **Issue**: Safari older versions may not support smooth scroll
- **Impact**: Jumpy navigation on some browsers
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

---

### AI Elements Specific Issues

#### AI-001: Code Block Border Radius Inconsistent
- **Description**: Code blocks use `rounded-xl` but should match card radius (8px)
- **File**: `src/components/ai-elements/theme-overrides.css:72`
- **Issue**: `rounded-xl` is 12px but design system uses 8px for cards
- **Impact**: Visual inconsistency
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

#### AI-002: Textarea Min Height Too Small on Mobile
- **Description**: PromptInput textarea min-h-12 (48px) but content may be cut off
- **File**: `src/components/ai-elements/interactive/prompt-input.tsx:522`
- **Issue**: `min-h-12 sm:min-h-16` might need to be larger on mobile
- **Impact**: Multi-line input hard to see
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### AI-003: Focus Ring Offset May Cause Clipping
- **Description**: Focus ring uses `ring-offset-2` which may clip at container edges
- **File**: `src/components/ai-elements/theme-overrides.css:93`
- **Issue**: Ring offset pushes focus indicator outside bounds
- **Impact**: Focus indicator partially hidden
- **Fix Day**: 7 (Accessibility)
- **Status**: [ ] Not Fixed

#### AI-004: No Dark Mode Test for Disabled States
- **Description**: Disabled button styles may not have proper contrast in dark mode
- **File**: `src/components/ai-elements/theme-overrides.css:106-108`
- **Issue**: Disabled state CSS is empty/incomplete
- **Impact**: Disabled buttons may look clickable or invisible
- **Fix Day**: 12 (Final UI/UX Polish)
- **Status**: [ ] Not Fixed

---

### Navigation & Landing Page Issues

#### NAV-001: Mobile Menu Z-Index May Conflict with Chat
- **Description**: Mobile menu and chat both use high z-index values
- **File**: `src/components/Navigation.tsx:30-38`
- **Issue**: Nav is `z-50`, chat is `z-[100]`, potential overlap issues
- **Impact**: Menu may appear over chat or vice versa unexpectedly
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### NAV-002: Hamburger Menu Icon Not Labeled for Screen Readers
- **Description**: Mobile menu button missing aria-label
- **File**: `src/components/Navigation.tsx` (hamburger button)
- **Issue**: Button with Menu icon but no accessible name
- **Impact**: Screen reader users don't know what button does
- **Fix Day**: 7 (Accessibility)
- **Status**: [ ] Not Fixed

#### NAV-003: Chat Trigger Button Query May Fail
- **Description**: Navigation uses `querySelector('[data-chat-trigger]')` which is fragile
- **File**: `src/components/Navigation.tsx:15-18`
- **Issue**: Depends on specific data attribute existing
- **Impact**: Chat button may not open if attribute changes
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

#### NAV-004: No Visual Feedback on Section Scroll
- **Description**: When navigating to section, no indication which section is active
- **File**: `src/components/Navigation.tsx`
- **Issue**: Nav links don't show active state based on scroll position
- **Impact**: User doesn't know where they are on page
- **Fix Day**: 5 (Landing Page Polish)
- **Status**: [ ] Not Fixed

---

## Updated Summary

- **Total Issues**: 36 issues documented
- **Critical**: 3
- **High**: 7  
- **Medium**: 8
- **Low**: 9
- **AI Elements**: 4
- **Navigation**: 4

---

## Notes

**Audit Progress**: 36 issues documented (Day 0 nearly complete)
**Components Audited**: ChatInterface, ChatMessages, ChatInput, ChatContainer, ChatActions, AI Elements, Navigation
**Next Steps**: Test user flows in browser, finalize daily log, commit to branch
