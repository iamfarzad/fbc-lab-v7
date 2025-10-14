# Implementation Plan

## Overview
Comprehensive refactoring to eliminate DRY violations across the entire media handling system by creating shared utilities, hooks, and components for media toggle logic, permission handling, keyboard shortcuts, and mobile/desktop responsive behavior.

## Scope
This implementation will address duplication patterns identified across multiple components including ChatInput.tsx, ActionsMenu.tsx, VoiceLiveMode.tsx, CameraFullScreen.tsx, ScreenShareFullScreen.tsx, and other media-related components. The refactoring will create a unified media management system that can be reused across the entire codebase.

## Types
Single sentence defining the type system for unified media management.

Detailed type definitions for the media management system:

```typescript
// Media types enum
export enum MediaType {
  VOICE = 'voice',
  CAMERA = 'camera',
  SCREEN = 'screen'
}

// Media state interface
export interface MediaState {
  isActive: boolean;
  isInitializing: boolean;
  error?: string | null;
}

// Media toggle configuration
export interface MediaToggleConfig {
  type: MediaType;
  isActive: boolean;
  isProcessing?: boolean;
  isInitializing?: boolean;
  onToggle: () => Promise<void> | void;
  setFullScreenOpen?: (open: boolean) => void;
  isFullScreenOpen?: boolean;
}

// Keyboard shortcut configuration
export interface KeyboardShortcut {
  key: string;
  modifiers: ('ctrl' | 'meta' | 'shift' | 'alt')[];
  action: () => void;
  description: string;
}

// Media toggle result
export interface MediaToggleResult {
  success: boolean;
  error?: string;
  shouldShowPermission?: boolean;
}
```

## Files
Single sentence describing the file modifications required for the refactoring.

Detailed breakdown of file changes:

### New Files to Create:
- `src/hooks/useMediaToggle.ts` - Unified media toggle hook
- `src/hooks/useKeyboardShortcuts.ts` - Keyboard shortcut management hook
- `src/hooks/useMediaPermissions.ts` - Permission handling hook
- `src/utils/media-utils.ts` - Media utility functions
- `src/components/chat/components/MediaToggleButton.tsx` - Unified media button component
- `src/components/chat/components/MediaControlsProvider.tsx` - Context provider for media state
- `src/types/media.ts` - Media-related type definitions

### Existing Files to Modify:
- `src/components/chat/components/ChatInput.tsx` - Refactor to use new hooks and components
- `src/components/chat/components/ActionsMenu.tsx` - Use shared media toggle logic
- `src/components/chat/components/VoiceLiveMode.tsx` - Use shared mobile detection
- `src/components/chat/components/CameraFullScreen.tsx` - Use shared mobile detection
- `src/components/chat/components/ScreenShareFullScreen.tsx` - Use shared mobile detection
- `src/components/chat/components/VoicePopoverSection.tsx` - Use unified button component
- `src/components/chat/components/CameraPopoverSection.tsx` - Use unified button component
- `src/components/chat/components/ScreenPopoverSection.tsx` - Use unified button component

### Files to Consider for Future Updates:
- Any other components using window.innerWidth < 768 checks
- Components with duplicate keyboard shortcut logic
- Components with similar permission handling patterns

## Functions
Single sentence describing the function modifications needed.

Detailed breakdown of function changes:

### New Functions:
- `useMediaToggle(config: MediaToggleConfig)` - Hook for unified media toggle logic
- `useKeyboardShortcuts(shortcuts: KeyboardShortcut[])` - Hook for keyboard shortcut management
- `useMediaPermissions()` - Hook for handling media permissions
- `createMediaToggleHandler(config: MediaToggleConfig)` - Factory function for creating toggle handlers
- `isMobileDevice(breakpoint?: number)` - Utility function for mobile detection
- `waitForNextFrame()` - Utility function for requestAnimationFrame promise
- `handleMediaError(error: Error, type: MediaType, isMobile: boolean)` - Error handling utility

### Modified Functions:
- `handleVoiceButtonClick` in ChatInput.tsx - Replace with useMediaToggle hook
- `handleCameraButtonClick` in ChatInput.tsx - Replace with useMediaToggle hook
- `handleScreenButtonClick` in ChatInput.tsx - Replace with useMediaToggle hook
- `handleVoiceClick` in ActionsMenu.tsx - Use shared media toggle logic
- `handleCameraClick` in ActionsMenu.tsx - Use shared media toggle logic
- `handleScreenShareClick` in ActionsMenu.tsx - Use shared media toggle logic
- Keyboard shortcut handlers in ChatInput.tsx - Replace with useKeyboardShortcuts hook

### Removed Functions:
- Individual media button handlers in ChatInput.tsx (replaced by unified hook)
- Duplicate mobile detection logic across components
- Duplicate keyboard shortcut logic across components

## Classes
Single sentence describing the class modifications for the refactoring.

Detailed breakdown of class changes:

### New Classes:
- `MediaControlsProvider` - React context provider for media state management
- `MediaToggleButton` - Unified button component with consistent behavior
- `KeyboardShortcutRegistry` - Class for managing keyboard shortcuts

### Modified Classes:
- No existing classes require modification, but components will be refactored to use new hooks and utilities

### Removed Classes:
- No classes will be removed, but duplicate component logic will be consolidated

## Dependencies
Single sentence describing the dependency modifications required.

Details of new packages and integration requirements:

### New Dependencies:
- No new external dependencies required
- Will leverage existing React hooks and context API

### Existing Dependencies to Utilize:
- React hooks (useState, useEffect, useRef, useCallback)
- Existing UI components from @/components/ui
- Existing utility functions from @/lib/utils
- Lucide React icons for consistent iconography

### Integration Requirements:
- Ensure compatibility with existing media handling logic
- Maintain backward compatibility with current prop interfaces
- Integrate with existing error boundary system

## Testing
Single sentence describing the testing approach for the refactored media system.

Test file requirements and validation strategies:

### New Test Files:
- `src/hooks/__tests__/useMediaToggle.test.ts` - Test media toggle hook
- `src/hooks/__tests__/useKeyboardShortcuts.test.ts` - Test keyboard shortcuts hook
- `src/hooks/__tests__/useMediaPermissions.test.ts` - Test permissions hook
- `src/utils/__tests__/media-utils.test.ts` - Test utility functions
- `src/components/__tests__/MediaToggleButton.test.tsx` - Test unified button component

### Existing Test Modifications:
- Update tests for ChatInput.tsx to work with new hooks
- Update tests for ActionsMenu.tsx to work with shared logic
- Update integration tests for media workflows

### Test Coverage Requirements:
- Unit tests for all new hooks and utilities
- Integration tests for media toggle workflows
- Keyboard shortcut functionality tests
- Mobile/desktop responsive behavior tests
- Permission handling flow tests
- Error handling and edge case tests

## Implementation Order
Single sentence describing the implementation sequence for systematic refactoring.

Numbered steps showing the logical order of changes:

1. **Create Type Definitions** - Define all media-related types in src/types/media.ts
2. **Implement Utility Functions** - Create media-utils.ts with shared utility functions
3. **Build Core Hooks** - Implement useMediaToggle, useKeyboardShortcuts, and useMediaPermissions hooks
4. **Create Unified Components** - Build MediaToggleButton and MediaControlsProvider components
5. **Refactor ChatInput.tsx** - Replace duplicate handlers with new hooks and components
6. **Update ActionsMenu.tsx** - Integrate shared media toggle logic
7. **Update Full-Screen Components** - Replace duplicate mobile detection with shared utilities
8. **Update Popover Sections** - Integrate unified button component
9. **Add Comprehensive Tests** - Create test files for all new functionality
10. **Integration Testing** - Test end-to-end media workflows
11. **Documentation Updates** - Update component documentation and usage examples
12. **Performance Optimization** - Review and optimize bundle size and performance

This systematic approach ensures minimal disruption to existing functionality while eliminating code duplication and creating a maintainable, scalable media management system.
