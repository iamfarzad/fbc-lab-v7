# Cleanup Plan for Duplicates and Legacy Code

**Created:** 2025-01-17  
**Priority:** High (maintains single source of truth)

## 🎯 Immediate Actions

### 1. Verify and Delete Deprecated Hook ⚠️

**File:** `src/hooks/useConversationalIntelligence.ts`

**Verification:**
```bash
# Check for active imports
grep -r "useConversationalIntelligence" src/ --exclude-dir=node_modules
```

**Action:** If no imports found → DELETE immediately

**Reason:** 
- Deprecated but still importable
- Creates confusion
- Violates "single source of truth" rule

---

### 2. Delete Dead Route File ✅

**File:** `app/api/admin/chat/route.ts`

**Status:** Already disabled (returns 501)

**Action:** DELETE (no verification needed - already dead code)

**Reason:**
- File serves no purpose
- Just returns errors
- Reduces codebase clutter

---

### 3. Remove Legacy Model References

**Pattern:** `FLASH_LEGACY` and hardcoded `gemini-2.5-flash`

**Files to Update:**
- `src/config/constants.ts` - Remove `FLASH_LEGACY`
- `src/config/constants.js` - Remove `FLASH_LEGACY`
- `src/core/models.ts` - Remove `FLASH_LEGACY` reference
- Documentation files (ARCHITECTURE.md, README.md, etc.)

**Action:** Replace all references with `FLASH_LATEST` or appropriate model

---

## 📋 Step-by-Step Cleanup

### Step 1: Verify Deprecated Hook Usage
```bash
cd /Users/farzad/fbc_lab_v7

# Search for imports
grep -r "useConversationalIntelligence" src/ --exclude-dir=node_modules

# Search for usage in other contexts
grep -r "ConversationalIntelligence" src/ --exclude-dir=node_modules | grep -v "useConversationalIntelligence"
```

### Step 2: Delete if Safe
```bash
# If no imports found
rm src/hooks/useConversationalIntelligence.ts

# Remove from exports if exists
grep -r "export.*useConversationalIntelligence"
```

### Step 3: Delete Dead Route
```bash
rm app/api/admin/chat/route.ts
```

### Step 4: Update Model References
```bash
# Find all hardcoded references
grep -r "gemini-2.5-flash" src/ --exclude-dir=node_modules

# Find FLASH_LEGACY references
grep -r "FLASH_LEGACY" src/ --exclude-dir=node_modules
```

### Step 5: Run Type Check
```bash
pnpm type-check
```

### Step 6: Test
```bash
pnpm dev:all
```

---

## 🚨 Critical Rule Violations

### Rule: "When creating a unified solution, DELETE the old solutions"

**Violations Found:**
1. ❌ `useConversationalIntelligence` - Deprecated but not deleted
2. ❌ `app/api/admin/chat/route.ts` - Legacy route still exists

**Impact:**
- Developers don't know which to use
- Code comments contradict reality
- Maintenance burden

**Fix:** DELETE deprecated code as recommended above

---

## ✅ Verification Checklist

After cleanup, verify:

- [ ] No TypeScript errors: `pnpm type-check`
- [ ] App builds: `pnpm build`
- [ ] Dev server starts: `pnpm dev:all`
- [ ] No references to deleted files
- [ ] No references to `FLASH_LEGACY` in src/
- [ ] No references to `useConversationalIntelligence`

---

## 📊 Impact Assessment

### Files to Delete:
1. `src/hooks/useConversationalIntelligence.ts` (after verification)
2. `app/api/admin/chat/route.ts` (safe to delete)

### Files to Update:
1. `src/config/constants.ts` - Remove `FLASH_LEGACY`
2. `src/config/constants.js` - Remove `FLASH_LEGACY`
3. `src/core/models.ts` - Remove `FLASH_LEGACY` usage
4. Documentation files - Update model references

### Risk Level: LOW ✅
- Deprecated code not actively used
- Safe to delete after verification
- No breaking changes to active code

