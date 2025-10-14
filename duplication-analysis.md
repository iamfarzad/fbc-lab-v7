# Code Duplication Analysis - FBC Lab v7

## Overview
This document maps all identified duplication patterns across the entire codebase, focusing on media handling, mobile detection, permission management, and related functionality.

## 1. Media Button Handler Duplicates

### Location: `src/components/chat/components/ChatInput.tsx`

#### Duplication Pattern: Media Toggle Handlers
**Files:** ChatInput.tsx (lines ~95-200)
**Pattern:** Three nearly identical handler functions with same logic structure

**handleVoiceButtonClick** (Lines ~95-130):
```typescript
const handleVoiceButtonClick = async () => {
  if (isTogglingVoiceRef.current) return;
  setIsActionsMenuOpen(false);
  isTogglingVoiceRef.current = true;
  
  try {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      setIsVoiceFullScreenOpen(!isVoiceFullScreenOpen);
      if (!isVoiceActive) {
        setPendingPermission('voice');
        return;
      }
    } else {
      const willOpen = activePopover !== 'voice';
      if (willOpen && !isVoiceActive) {
        setPendingPermission('voice');
        return;
      }
      setActivePopover(willOpen ? 'voice' : null);
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    await onToggleVoice();
  } catch (error) {
    console.error('🎤 [ChatInput] Voice toggle error:', error);
    if (window.innerWidth < 640) setIsVoiceFullScreenOpen(false);
    else setActivePopover(null);
  } finally {
    setTimeout(() => { isTogglingVoiceRef.current = false; }, 500);
  }
};
```

**handleCameraButtonClick** (Lines ~132-165):
```typescript
const handleCameraButtonClick = async () => {
  const isMobile = window.innerWidth < 768;
  setIsActionsMenuOpen(false);
  
  if (isMobile) {
    setIsCameraFullScreenOpen(!isCameraFullScreenOpen);
    if (!cameraState) {
      setPendingPermission('camera');
      return;
    }
  } else {
    const willOpen = activePopover !== 'camera';
    if (willOpen && !cameraState) {
      setPendingPermission('camera');
      return;
    }
    setActivePopover(willOpen ? 'camera' : null);
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  
  try {
    await onToggleCamera();
  } catch (error) {
    console.error('Camera toggle error:', error);
    if (isMobile) setIsCameraFullScreenOpen(false);
    else if (window.innerWidth >= 640) setActivePopover(null);
  }
};
```

**handleScreenButtonClick** (Lines ~167-200):
```typescript
const handleScreenButtonClick = async () => {
  setIsActionsMenuOpen(false);
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    setIsScreenFullScreenOpen(!isScreenFullScreenOpen);
    if (!isScreenSharing) {
      setPendingPermission('screen');
      return;
    }
  } else {
    const willOpen = activePopover !== 'screen';
    if (willOpen && !isScreenSharing) {
      setPendingPermission('screen');
      return;
    }
    setActivePopover(willOpen ? 'screen' : null);
    await new Promise(resolve => requestAnimationFrame(resolve));
  }

  try {
    await onToggleScreenShare();
  } catch (error) {
    console.error('Screen share toggle error:', error);
    if (isMobile) setIsScreenFullScreenOpen(false);
    else setActivePopover(null);
  }
};
```

**Duplicate Elements:**
- Mobile detection: `window.innerWidth < 768` (3x)
- Actions menu closing: `setIsActionsMenuOpen(false)` (3x)
- Full-screen toggle logic (3x)
- Popover management logic (3x)
- Permission setting: `setPendingPermission(type)` (3x)
- requestAnimationFrame: `await new Promise(resolve => requestAnimationFrame(resolve))` (3x)
- Error handling pattern (3x)
- Console error logging (3x)

---

## 2. Mobile Detection Duplicates

### Pattern: `window.innerWidth < 768` Check

**Files and Locations:**
1. **src/components/chat/components/ChatInput.tsx**
   - Line ~102: `const isMobile = window.innerWidth < 768;`
   - Line ~138: `const isMobile = window.innerWidth < 768;`
   - Line ~172: `const isMobile = window.innerWidth < 768;`
   - Line ~192: `if (window.innerWidth < 640) setIsVoiceFullScreenOpen(false);`

2. **src/components/chat/components/VoiceLiveMode.tsx**
   - Multiple instances: `window.innerWidth >= 768`
   - Line ~?: `return window.innerWidth >= 768;`
   - Line ~?: `return window.innerWidth >= 768;`
   - Line ~?: `const mobile = window.innerWidth < 768;`
   - Line ~?: `setShowTranscript(window.innerWidth >= 768);`

3. **src/components/chat/components/CameraFullScreen.tsx**
   - Line ~?: `const handleResize = () => setIsMobile(window.innerWidth < 768);`

4. **src/components/chat/components/ScreenShareFullScreen.tsx**
   - Line ~?: `const handleResize = () => setIsMobile(window.innerWidth < 768);`

5. **src/components/chat/components/ActionsMenu.tsx**
   - Uses `useIsMobile()` hook (proper implementation)

**Breakpoint Inconsistencies:**
- Most use `768px`
- Some use `640px` (ChatInput.tsx error handling)
- Some use `>= 768px` (reverse logic)

---

## 3. requestAnimationFrame Duplicates

### Pattern: Animation Frame Waiting

**Files and Locations:**
1. **src/components/chat/components/ChatInput.tsx**
   - Line ~118: `await new Promise(resolve => requestAnimationFrame(resolve));`
   - Line ~155: `await new Promise(resolve => requestAnimationFrame(resolve));`
   - Line ~186: `await new Promise(resolve => requestAnimationFrame(resolve));`
   - Line ~241: `await new Promise(resolve => requestAnimationFrame(resolve));`

**Total Count:** 4 identical instances

---

## 4. Keyboard Shortcut Duplicates

### Location: `src/components/chat/components/ChatInput.tsx`

**Pattern: Keyboard Event Handling** (Lines ~270-300)

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl/Cmd + M = Toggle microphone/voice
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault();
      if (isVoiceActive || activePopover !== 'voice') {
        setPendingPermission('voice');
      }
    }
    // Ctrl/Cmd + Shift + C = Toggle camera
    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'c') {
      e.preventDefault();
      if (cameraState || activePopover !== 'camera') {
        setPendingPermission('camera');
      }
    }
    // Ctrl/Cmd + Shift + S = Toggle screen share
    else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 's') {
      e.preventDefault();
      if (isScreenSharing || activePopover !== 'screen') {
        setPendingPermission('screen');
      }
    }
    // ESC = Close active popover
    else if (e.key === 'Escape' && activePopover) {
      e.preventDefault();
      closePopover();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [activePopover, isVoiceActive, cameraState, isScreenSharing]);
```

**Duplicate Elements:**
- Modifier key checking: `(e.ctrlKey || e.metaKey)` (3x)
- Event prevention: `e.preventDefault()` (4x)
- Permission setting pattern (3x)
- Similar conditional logic (3x)

---

## 5. Permission Handling Duplicates

### Pattern: Permission State Management

**Files and Locations:**
1. **src/components/chat/components/ChatInput.tsx**
   - State: `const [pendingPermission, setPendingPermission] = useState<'voice' | 'camera' | 'screen' | null>(null);`
   - Handler: Lines ~202-230 (handlePermissionAccept)
   - Used in: All three media button handlers

2. **Permission Accept Handler** (Lines ~202-230):
```typescript
const handlePermissionAccept = async () => {
  const permissionType = pendingPermission;
  setPendingPermission(null);
  
  if (!permissionType) return;
  
  setActivePopover(permissionType);
  await new Promise(resolve => requestAnimationFrame(resolve));
  
  try {
    if (permissionType === 'voice') await onToggleVoice();
    else if (permissionType === 'camera') await onToggleCamera();
    else if (permissionType === 'screen') await onToggleScreenShare();
  } catch (error) {
    console.error('Permission request failed:', error);
    setActivePopover(null);
  }
};
```

**Duplicate Elements:**
- Permission type checking (3x)
- Function calling pattern (3x)
- Error handling (similar to media handlers)

---

## 6. Full-Screen State Management Duplicates

### Pattern: Full-Screen State Variables and Handlers

**Files and Locations:**
1. **src/components/chat/components/ChatInput.tsx**
   ```typescript
   const [isVoiceFullScreenOpen, setIsVoiceFullScreenOpen] = useState(false);
   const [isCameraFullScreenOpen, setIsCameraFullScreenOpen] = useState(false);
   const [isScreenFullScreenOpen, setIsScreenFullScreenOpen] = useState(false);
   ```

2. **Full-Screen Toggle Pattern:**
   - Voice: `setIsVoiceFullScreenOpen(!isVoiceFullScreenOpen)`
   - Camera: `setIsCameraFullScreenOpen(!isCameraFullScreenOpen)`
   - Screen: `setIsScreenFullScreenOpen(!isScreenFullScreenOpen)`

3. **Full-Screen Close Pattern:**
   - Voice: `setIsVoiceFullScreenOpen(false)`
   - Camera: `setIsCameraFullScreenOpen(false)`
   - Screen: `setIsScreenFullScreenOpen(false)`

4. **ActionsMenu Props:**
   ```typescript
   onOpenVoiceFullScreen={() => setIsVoiceFullScreenOpen(true)}
   onOpenCameraFullScreen={() => setIsCameraFullScreenOpen(true)}
   onOpenScreenFullScreen={() => setIsScreenFullScreenOpen(true)}
   ```

---

## 7. Popover Management Duplicates

### Pattern: Popover State and Actions

**Files and Locations:**
1. **src/components/chat/components/ChatInput.tsx**
   ```typescript
   const [activePopover, setActivePopover] = useState<'voice' | 'camera' | 'screen' | null>(null);
   ```

2. **Popover Toggle Pattern:**
   ```typescript
   const willOpen = activePopover !== 'voice';
   setActivePopover(willOpen ? 'voice' : null);
   ```

3. **Popover Auto-Open Logic** (Lines ~65-85):
   ```typescript
   useEffect(() => {
     if ((isVoiceActive || isVoiceProcessing) && !activePopover) {
       setActivePopover('voice');
     } else if (cameraState && !activePopover) {
       setActivePopover('camera');
     } else if (isScreenSharing && !activePopover) {
       setActivePopover('screen');
     }
   }, [isVoiceActive, isVoiceProcessing, cameraState, isScreenSharing, activePopover]);
   ```

4. **Popover Auto-Close Logic** (Lines ~87-95):
   ```typescript
   useEffect(() => {
     if (activePopover === 'voice' && !isVoiceActive && !isVoiceProcessing) {
       setActivePopover(null);
     } else if (activePopover === 'camera' && !cameraState) {
       setActivePopover(null);
     } else if (activePopover === 'screen' && !isScreenSharing) {
       setActivePopover(null);
     }
   }, [activePopover, isVoiceActive, isVoiceProcessing, cameraState, isScreenSharing]);
   ```

---

## 8. Error Handling Duplicates

### Pattern: Try-Catch with Console Error

**Files and Locations:**
1. **src/components/chat/components/ChatInput.tsx**
   ```typescript
   try {
     await onToggleVoice();
   } catch (error) {
     console.error('🎤 [ChatInput] Voice toggle error:', error);
     // Cleanup logic
   }
   ```

2. **Similar Pattern in Camera and Screen handlers**

**Duplicate Elements:**
- Try-catch structure (3x)
- Console error logging (3x)
- Cleanup pattern (3x)

---

## 9. ActionsMenu Media Handler Duplicates

### Location: `src/components/chat/components/ActionsMenu.tsx`

**Pattern: Mobile Detection and Handler Logic**

**handleVoiceClick** (Lines ~80-90):
```typescript
const handleVoiceClick = () => {
  if (isMobile && onOpenVoiceFullScreen) {
    onOpenVoiceFullScreen();
  } else {
    onToggleVoice?.();
  }
  onClose();
};
```

**handleCameraClick** (Lines ~92-102):
```typescript
const handleCameraClick = () => {
  if (isMobile && onOpenCameraFullScreen) {
    onOpenCameraFullScreen();
  } else {
    onToggleCamera?.();
  }
  onClose();
};
```

**handleScreenShareClick** (Lines ~104-114):
```typescript
const handleScreenShareClick = () => {
  if (isMobile && onOpenScreenFullScreen) {
    onOpenScreenFullScreen();
  } else {
    onToggleScreenShare?.();
  }
  onClose();
};
```

**Duplicate Elements:**
- Mobile detection pattern (3x)
- Full-screen vs toggle logic (3x)
- onClose() call (3x)

---

## 10. Escape Key Handler Duplicates

### Pattern: Escape Key for Closing Modals

**Files and Locations:**
1. **src/components/chat/components/ChatInput.tsx**
   ```typescript
   else if (e.key === 'Escape' && activePopover) {
     e.preventDefault();
     closePopover();
   }
   ```

2. **src/components/chat/components/BottomSheet.tsx**
   ```typescript
   document.addEventListener('keydown', handleEscape);
   ```

3. **src/components/chat/components/CameraFullScreen.tsx**
   ```typescript
   document.addEventListener('keydown', handleEscape);
   ```

4. **src/components/chat/components/ScreenShareFullScreen.tsx**
   ```typescript
   document.addEventListener('keydown', handleEscape);
   ```

5. **src/components/chat/components/VoiceLiveMode.tsx**
   ```typescript
   document.addEventListener('keydown', handleEscape);
   ```

---

## 11. Media State Management Duplicates

### Pattern: Similar State Variables Across Components

**Voice State:**
- `isVoiceActive`, `isVoiceProcessing`, `isVoiceInitializing`
- `voiceError`, `voiceTranscript`, `voicePartialTranscript`

**Camera State:**
- `cameraState`, `isCameraInitializing`
- `cameraError`, `cameraStream`

**Screen State:**
- `isScreenSharing`, `isScreenShareInitializing`
- `screenShareError`, `screenShareStream`, `screenThumbnail`

---

## 12. Console Logging Duplicates

### Pattern: Console Error Logging with Prefixes

**Files and Locations:**
1. **src/components/chat/components/ChatInput.tsx**
   ```typescript
   console.error('🎤 [ChatInput] Voice toggle error:', error);
   console.error('Camera toggle error:', error);
   console.error('Screen share toggle error:', error);
   console.error('Permission request failed:', error);
   ```

**Duplicate Elements:**
- Console.error calls (4x)
- Error logging pattern (4x)
- Different prefixes but same structure

---

## Summary of Duplication Impact

### Total Duplicate Instances:
- **Mobile Detection:** 8+ instances
- **requestAnimationFrame:** 4 instances  
- **Media Button Handlers:** 3 nearly identical functions
- **Keyboard Shortcuts:** 3 similar shortcut handlers
- **Full-Screen State:** 3 state variables + handlers
- **Popover Management:** Multiple similar patterns
- **Error Handling:** 4+ similar try-catch blocks
- **Permission Handling:** 3+ similar patterns
- **ActionsMenu Handlers:** 3 nearly identical functions
- **Escape Key Handlers:** 5+ similar implementations

### Code Maintenance Issues:
1. **High Coupling:** Changes to mobile detection logic require updates in 8+ places
2. **Inconsistency Risk:** Breakpoint values differ (640px vs 768px)
3. **Testing Burden:** Similar logic needs testing in multiple places
4. **Bug Propagation:** Fixes need to be applied across multiple files
5. **Code Bloat:** Estimated 200+ lines of duplicate code

### Recommended Refactoring Priority:
1. **High Priority:** Media button handlers (most complex duplication)
2. **High Priority:** Mobile detection (most frequent duplication)
3. **Medium Priority:** Keyboard shortcuts (consolidate into registry)
4. **Medium Priority:** Permission handling (unified flow)
5. **Low Priority:** Console logging (standardize utility)

This analysis provides the foundation for systematic refactoring while maintaining existing functionality.
