# Duplicate & Legacy Code - Feature Comparison Analysis

**Date:** 2025-01-17  
**Purpose:** Compare duplicates/legacy code with current implementations to preserve best features

---

## 1. Agent UI Adapter Hooks - FEATURE COMPARISON

### Current: `useAgentUIAdapter.ts` (113 lines)
**Features:**
- ✅ Full LiveApi integration (startSession, stopSession, pauseMicrophone, resumeMicrophone)
- ✅ Camera controls (`useCamera` hook integration)
- ✅ Screen share controls (`useScreenShare` hook integration)
- ✅ Toggle functions: microphone, camera, screen share
- ✅ Send message functionality
- ✅ Error handling
- ✅ Participant management (user + assistant)
- ✅ Room state management

### Duplicate: `useAgentAdapter.ts` (40 lines)
**Features:**
- ✅ Basic LiveApi integration (startSession, stopSession)
- ✅ Connection state mapping
- ❌ **Missing:** Camera controls
- ❌ **Missing:** Screen share controls
- ❌ **Missing:** Toggle functions
- ❌ **Missing:** Send message
- ❌ **Missing:** Participant details

**Verdict:** 🗑️ **DELETE `useAgentAdapter.ts`**
- `useAgentUIAdapter` is **strictly superior** (has all features + more)
- Only used by `useAgentSession` - can be migrated to use `useAgentUIAdapter`

---

## 2. AdvancedContextManager vs MultimodalContextManager - FEATURE COMPARISON

### Current: `MultimodalContextManager` (873 lines) ✅ ACTIVE
**Features:**
- ✅ Multimodal context (voice, visual, uploads)
- ✅ Conversation history with turns
- ✅ Basic topic extraction (simple regex: 7 topics)
- ✅ Voice transcript management
- ✅ Visual analysis storage
- ✅ Upload handling
- ✅ Supabase persistence
- ✅ Context summarization
- ✅ WAL logging
- ✅ PII detection

**Limitations:**
- ⚠️ Simple topic extraction (regex-based, 7 categories)
- ⚠️ No entity extraction (emails, names, organizations, dates)
- ⚠️ No sentiment analysis
- ⚠️ No priority calculation
- ⚠️ No complexity scoring

### Legacy: `AdvancedContextManager` (625 lines) ⚠️ UNUSED
**Features:**
- ✅ **Entity extraction** (email, person, organization, location, product, date) - **NOT in Multimodal**
- ✅ **Advanced topic detection** (business, technical, personal, general categories) - **MORE sophisticated than Multimodal**
- ✅ **Sentiment analysis** (positive/neutral/negative) - **NOT in Multimodal**
- ✅ **Priority calculation** (low/medium/high) - **NOT in Multimodal**
- ✅ **Complexity scoring** (simple/moderate/complex) - **NOT in Multimodal**
- ✅ **Business value assessment** (low/medium/high) - **NOT in Multimodal**
- ✅ **Context merging** (merge multiple sessions) - **NOT in Multimodal**
- ✅ **Context history** (keep last 10 contexts)
- ✅ **Relevant context search** (query-based message filtering)
- ✅ **Context caching** (Vercel cache integration)
- ❌ **Missing:** Multimodal support (no voice/visual/upload)
- ❌ **Missing:** Supabase persistence
- ❌ **Missing:** WAL logging

**Verdict:** 🔄 **MERGE BEST FEATURES INTO MultimodalContextManager**
- AdvancedContextManager has **valuable features** missing from MultimodalContextManager:
  1. Entity extraction (emails, names, organizations, dates)
  2. Sentiment analysis
  3. Priority/complexity/business value scoring
  4. Context merging capabilities
  5. Advanced topic categorization
- **Action:** Extract valuable methods from AdvancedContextManager and add to MultimodalContextManager
- **Then:** Delete AdvancedContextManager (but preserve its useful methods)

---

## 3. WorkflowEngine vs Orchestrator - FEATURE COMPARISON

### Current: `orchestrator.ts` (337 lines) ✅ ACTIVE
**Features:**
- ✅ Production routing system
- ✅ Multi-agent coordination
- ✅ Funnel stage determination
- ✅ Multimodal context integration
- ✅ Usage limiting
- ✅ 9 specialized agents (discovery, scoring, sales, closer, summary, proposal, admin, retargeting)
- ✅ Intent preprocessing
- ✅ Active in `/api/chat/unified/route.ts`

### Legacy: `lib/workflow/engine.ts` (737 lines) ⚠️ TEST-ONLY
**Features:**
- ✅ YAML-based workflow definition
- ✅ Similar routing logic (duplicated)
- ✅ Uses MultimodalContextManager (commented out)
- ✅ Test scripts integration
- ❌ **Commented out** in API routes
- ❌ **NOT used in production**

**Verdict:** 📝 **KEEP AS TEST CODE, DOCUMENT AS EXPERIMENTAL**
- Different architecture (YAML-based vs code-based)
- Useful for testing/future experimentation
- Not a duplicate in practice - different purposes
- **Action:** Add comment documenting it as experimental/test-only

---

## 4. Image Hash Generation - UTILITY DUPLICATE

### Files:
- `app/api/tools/image/route.ts` (line 57)
- `app/api/tools/webcam/route.ts` (line 53)

**Implementation:** Identical function (no feature differences)

**Verdict:** ✅ **EXTRACT TO SHARED UTILITY**
- Pure utility function, no feature loss
- **Action:** Create `src/lib/image-utils.ts`, extract function, update both routes

---

## SUMMARY & RECOMMENDATIONS

### Immediate Actions

1. **DELETE `useAgentAdapter.ts`** ✅ Safe
   - Migrate `useAgentSession` to use `useAgentUIAdapter`
   - Zero feature loss (useAgentUIAdapter has everything)

2. **MERGE AdvancedContextManager features into MultimodalContextManager** ⚠️ Important
   - Add entity extraction methods
   - Add sentiment analysis
   - Add priority/complexity/business value scoring
   - Add context merging utilities
   - Enhance topic extraction with AdvancedContextManager's categories
   - **Preserves valuable features that are currently unused**

3. **Extract image hash utility** ✅ Low risk
   - Create `src/lib/image-utils.ts`
   - Update both image/webcam routes

4. **Document WorkflowEngine as experimental** ✅ Low effort
   - Add comment: "Experimental/test-only workflow engine"

### Feature Preservation Checklist

After cleanup, ensure:
- ✅ Entity extraction available (from AdvancedContextManager)
- ✅ Sentiment analysis available (from AdvancedContextManager)
- ✅ Priority/complexity scoring available (from AdvancedContextManager)
- ✅ Context merging available (from AdvancedContextManager)
- ✅ All multimodal features preserved
- ✅ All camera/screen share controls preserved

---

## Migration Plan

### Step 1: Safe Deletions
- Delete `useAgentAdapter.ts` (after migrating `useAgentSession`)
- Extract image hash to shared utility

### Step 2: Feature Extraction (Preserve Best)
- Extract entity extraction from AdvancedContextManager → Add to MultimodalContextManager
- Extract sentiment analysis → Add to MultimodalContextManager
- Extract priority/complexity scoring → Add to MultimodalContextManager
- Extract context merging → Add to MultimodalContextManager

### Step 3: Cleanup
- Delete AdvancedContextManager after feature extraction
- Verify no imports are broken
- Run type check

### Step 4: Documentation
- Document WorkflowEngine as experimental
- Update any READMEs referencing deleted code

