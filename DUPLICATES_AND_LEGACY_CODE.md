# Duplicates and Legacy Code Analysis

**Date:** 2025-01-17  
**Analysis Method:** Codebase search + grep + glob patterns

## 🚨 CRITICAL ISSUES

### 1. Deprecated Hook Still Available ⚠️
**File:** `src/hooks/useConversationalIntelligence.ts`  
**Status:** 🚨 **ACTIVE BUT DEPRECATED**  
**Issue:** Hook still exported and importable, shows warning but functional

```typescript:src/hooks/useConversationalIntelligence.ts
// 🚨 DEPRECATED: This is now a compatibility shim for useUnifiedChat
// TODO: Remove after deprecation window (2-3 days)
```

**Impact:**
- Developers can still import this hook
- Warning shown but code still runs
- Creates confusion about which hook to use

**Recommendation:** DELETE after confirming no active imports

---

## 🗑️ DELETED/NON-FUNCTIONAL CODE

### 1. Legacy Admin Chat Route ✅
**File:** `app/api/admin/chat/route.ts`  
**Status:** ✅ **Already disabled** - Returns 501 error  
**Content:**
```typescript
export function GET() {
  return respond.error('Legacy /api/admin/chat disabled. Use /api/chat/unified?mode=admin', 501)
}
```

**Recommendation:** DELETE - File serves no purpose

---

### 2. Legacy Chat Page Redirect ✅
**File:** `app/chat/page.tsx`  
**Status:** ✅ **Redirect only** - Just a redirect wrapper

**Recommendation:** Can keep for SEO/compatibility or DELETE if redirect handled elsewhere

---

## ⚠️ POTENTIAL DUPLICATES

### 1. Chat Intelligence Hooks
**Files:**
- `src/hooks/useConversationalIntelligence.ts` (DEPRECATED shim)
- `src/components/chat/hooks/useChatIntelligence.ts` (Active)
- `src/core/intelligence/conversational-intelligence.ts` (Core implementation)

**Analysis:**
- `useConversationalIntelligence` → Deprecated, should be removed
- `useChatIntelligence` → Component-specific hook for chat UI
- `ConversationalIntelligence` class → Core business logic

**Status:** ⚠️ Potential confusion, but different purposes

**Recommendation:**
1. DELETE `useConversationalIntelligence.ts` after confirming no imports
2. Keep `useChatIntelligence.ts` (component-specific)
3. Keep `conversational-intelligence.ts` (core logic)

---

### 2. Deprecated Model Names
**Pattern:** `FLASH_LEGACY` and hardcoded `gemini-2.5-flash`

**Files:**
- `src/config/constants.ts` - Defines `FLASH_LEGACY`
- `src/config/constants.js` - JS version
- `src/core/models.ts` - References `FLASH_LEGACY`

**Usage:**
- Found in: agent documentation, test scripts, architecture docs
- Should use: `GEMINI_MODELS.FLASH_LATEST` or `GEMINI_MODELS.DEFAULT_CHAT`

**Recommendation:**
1. Remove `FLASH_LEGACY` from constants
2. Update all references to use new model names
3. Update documentation to use new conventions

---

## 🔍 DUPLICATE HOOKS ANALYSIS

### Voice Hooks ✅ CLEAN
**Status:** No duplicates found

**Files:**
- `src/hooks/useRealtimeVoice.ts` ✅ (Active)
- `src/hooks/useMediaRecorderVoice.ts` ✅ (Helper, not standalone)
- `src/hooks/useWebSocketVoice.ts` ✅ (Already deleted per README)

**Confirmation:** README states `useWebSocketVoice.ts` already deleted ✅

---

### Chat Hooks
**Pattern:** Multiple chat/intelligence hooks

**Files:**
- `src/hooks/useUnifiedChat.ts` ✅ (Active, primary)
- `src/hooks/useConversationalIntelligence.ts` ⚠️ (Deprecated)
- `src/components/chat/hooks/useChatIntelligence.ts` ✅ (Component-specific)

**Analysis:**
- Different contexts (core, component, deprecated)
- `useUnifiedChat` is the primary hook
- `useChatIntelligence` is for chat components specifically

**Status:** ✅ Acceptable (different use cases)

---

### Live API Hooks
**Pattern:** Multiple Live API interfaces

**Files:**
- `src/hooks/useLiveApi.ts` ✅ (Client-facing API)
- `src/hooks/useRealtimeVoice.ts` ✅ (Voice-specific)
- `src/hooks/LiveApiProvider.tsx` ✅ (Context provider)

**Analysis:**
- Clear separation of concerns
- No duplication

**Status:** ✅ Clean architecture

---

## 📊 SUMMARY

### Critical Issues
1. **`useConversationalIntelligence`** - DELETE (deprecated but still importable)
2. **`app/api/admin/chat/route.ts`** - DELETE (already disabled)

### Medium Priority
1. Remove `FLASH_LEGACY` model references
2. Update hardcoded `gemini-2.5-flash` references
3. Update documentation with new model names

### Acceptable Duplicates
- Different context-specific hooks (core vs component)
- No true duplicates found

---

## 🎯 RECOMMENDED ACTIONS

### Immediate (High Priority)
1. **Search for imports of `useConversationalIntelligence`**
   ```bash
   grep -r "useConversationalIntelligence" src/
   ```

2. **If no imports found, DELETE:**
   - `src/hooks/useConversationalIntelligence.ts`

3. **DELETE:**
   - `app/api/admin/chat/route.ts`

### Short-term (Medium Priority)
1. Remove `FLASH_LEGACY` from constants
2. Update all hardcoded model references
3. Update documentation

### Verification
Before deleting files, verify:
```bash
# Check imports
grep -r "useConversationalIntelligence" .
grep -r "from.*useConversationalIntelligence" .

# Check API route usage
grep -r "/api/admin/chat" .
```

---

## ✅ COMPLIANCE CHECK

**Rule:** "When creating a unified solution, DELETE the old solutions in the SAME commit"

**Status:** ⚠️ **PARTIALLY VIOLATED**
- `useConversationalIntelligence` was deprecated but not deleted
- Legacy API routes exist but disabled

**Action Required:** Clean up deprecated code to maintain single source of truth

