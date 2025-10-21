# 📄 Document Lifecycle Management

## Purpose
This document defines rules for managing markdown documentation in the fbc_lab_v7 project to prevent root directory clutter and maintain organized historical records.

## Document States

### ✅ ACTIVE (Keep in Root)
Documents that are currently relevant for day-to-day development.

**Criteria:**
- Currently being referenced or updated
- Contains information needed for immediate tasks
- Part of essential project documentation (README, guides)

**Examples:**
- `README.md` - Main project documentation
- `README_FIRST.md` - Quick start guide
- `NEXT_STEPS.md` - Current roadmap
- `CLEANUP_GUIDE.md` - Maintenance procedures
- `OPTIMIZATION_SUMMARY.md` - Recent performance changes
- `DOCUMENT_LIFECYCLE.md` - This document

**Location:** Project root

---

### 📦 COMPLETE (Archive to docs/)
Documents describing tasks that have been **implemented, tested, and approved**.

**Criteria:**
- Implementation is complete and merged to main
- Testing has passed (unit, integration, E2E as applicable)
- Code review approved
- Feature is working in production (if deployed)

**Action:** Move to `docs/` with date prefix
```bash
mv FEATURE_IMPLEMENTATION.md docs/2025-10-21_FEATURE_IMPLEMENTATION.md
```

**Examples:**
- `VOICE_PIPELINE_FIX_COMPLETE.md` → Implementation done
- `TYPE_SYSTEM_COMPLETE.md` → Migration finished
- `CONSOLIDATION_COMPLETE.md` → Refactoring complete

---

### ⚠️ ABANDONED (Archive to docs/)
Documents for tasks that are **no longer needed or relevant**.

**Criteria:**
- Requirements changed, feature no longer needed
- Superseded by different approach
- Blocked by technical/business constraints
- Decision made to not pursue

**Action:** Move to `docs/` with date prefix and add "ABANDONED" note at top
```bash
# Add note to file first
echo "**STATUS: ABANDONED - [Reason]**\n\n$(cat FILE.md)" > FILE.md
mv FILE.md docs/2025-10-21_ABANDONED_FILE.md
```

**Examples:**
- Features that were planned but scope changed
- Analysis docs for approaches not taken
- Outdated architectural plans

---

### 🗑️ OBSOLETE (Delete)
Documents that are **truly obsolete** with no historical value.

**Criteria:**
- Completely outdated information
- Duplicates of other documents
- Temporary notes/scratch work
- Information now in proper documentation

**Action:** Delete after confirming no useful information
```bash
rm OBSOLETE_FILE.md
```

**Note:** Prefer archiving over deletion. Git history preserves deleted files, but archiving keeps them easily accessible.

---

## Naming Conventions

### Active Documents (Root)
Use descriptive, SCREAMING_SNAKE_CASE names:
```
FEATURE_NAME.md
CLEANUP_GUIDE.md
DEPLOYMENT_CHECKLIST.md
```

### Archived Documents (docs/)
Add date prefix in `YYYY-MM-DD` format based on last modification:
```
docs/2025-10-21_FEATURE_IMPLEMENTATION_COMPLETE.md
docs/2025-10-17_VOICE_PIPELINE_FIX_COMPLETE.md
docs/2025-10-15_ABANDONED_UI_REDESIGN.md
```

---

## Archive Process

### When to Archive
**Immediately after:**
- Feature implementation is complete and tested
- Analysis is finished and decisions are made
- Task is completed or abandoned
- Document hasn't been modified in 30+ days

### How to Archive

**Manual:**
```bash
# Get file modification date
stat -f "%Sm" -t "%Y-%m-%d" FILENAME.md

# Move with date prefix
mv FILENAME.md docs/2025-10-21_FILENAME.md
```

**Automated:**
```bash
# Use the organize-docs.sh script
./organize-docs.sh
```

---

## Directory Structure

```
/Users/farzad/fbc_lab_v7/
├── README.md                          # Active - Essential docs
├── README_FIRST.md
├── NEXT_STEPS.md
├── CLEANUP_GUIDE.md
├── OPTIMIZATION_SUMMARY.md
├── DOCUMENT_LIFECYCLE.md
├── package.json                       # Config files
├── tsconfig.json
├── ... (other config)
└── docs/                              # Archived docs (not in git)
    ├── 2025-10-21_FEATURE_COMPLETE.md
    ├── 2025-10-17_VOICE_FIX_COMPLETE.md
    ├── 2025-10-15_ANALYSIS_SUMMARY.md
    └── ... (all historical documentation)
```

---

## Decision Matrix

| Scenario | State | Action |
|----------|-------|--------|
| Feature implemented & tested | COMPLETE | Archive to docs/ |
| Feature planned but not started | ACTIVE | Keep in root (or move to docs/ as plan) |
| Feature in progress | ACTIVE | Keep in root |
| Feature abandoned | ABANDONED | Archive to docs/ with note |
| Analysis finished, decision made | COMPLETE | Archive to docs/ |
| Analysis in progress | ACTIVE | Keep in root |
| Temporary notes/scratch | OBSOLETE | Delete |
| Duplicate content | OBSOLETE | Delete duplicate |
| Outdated procedure | OBSOLETE | Update or delete |

---

## Maintenance Schedule

### Weekly
- Review root directory for files to archive
- Run `./organize-docs.sh` to catch unorganized files

### Monthly
- Review archived docs for obsolete content
- Consolidate related archived docs if valuable

### Quarterly
- Full audit of both root and docs/
- Update this lifecycle document if needed

---

## Git Considerations

### What's Committed
- All essential documentation in root
- Configuration for lifecycle management
- This DOCUMENT_LIFECYCLE.md

### What's NOT Committed (in .gitignore)
- `/docs/` directory - Local historical reference only
- Reason: Keeps repo clean, history in git log

### Recovering Deleted Content
All documentation exists in git history:
```bash
# Find when file was deleted
git log --all --full-history -- "FILENAME.md"

# Restore deleted file
git checkout <commit-hash> -- FILENAME.md
```

---

## Examples

### Example 1: Feature Complete
```bash
# Feature: Voice pipeline fix is complete and tested
mv VOICE_PIPELINE_FIX_COMPLETE.md docs/2025-10-17_VOICE_PIPELINE_FIX_COMPLETE.md
git add VOICE_PIPELINE_FIX_COMPLETE.md  # Stage deletion
git commit -m "docs: Archive completed voice pipeline fix documentation"
```

### Example 2: Task Abandoned
```bash
# Feature: UI redesign abandoned due to scope change
echo "**STATUS: ABANDONED - Scope changed, using component library instead**\n\n$(cat UI_REDESIGN_PLAN.md)" > UI_REDESIGN_PLAN.md
mv UI_REDESIGN_PLAN.md docs/2025-10-15_ABANDONED_UI_REDESIGN_PLAN.md
```

### Example 3: Regular Cleanup
```bash
# Weekly cleanup
./organize-docs.sh
# Reviews all .md files in root, suggests what to archive
```

---

## Questions?

**Q: What if I'm not sure if something is complete?**
A: Keep it in root until you're certain. Better to archive late than early.

**Q: Should I archive partially complete work?**
A: No, keep in root if still being worked on. Archive only when done or abandoned.

**Q: Can I retrieve archived docs?**
A: Yes, docs/ is local and not in git. Easy to reference anytime.

**Q: What about docs that apply to ongoing development?**
A: Keep them in root and update regularly. Archive old versions if creating new ones.

---

**Last Updated:** October 21, 2025
**Maintained By:** Project team
**Review Frequency:** Quarterly

