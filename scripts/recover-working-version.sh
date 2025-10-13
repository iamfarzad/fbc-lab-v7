#!/bin/bash
set -e

# Recovery Script for Voice/Webcam/Screen Features
# Restores working code from October 7th, 2025 (commit 8d97985)

WORKING_COMMIT="8d97985"
BACKUP_BRANCH="backup/pre-recovery-$(date +%Y%m%d-%H%M%S)"
RECOVERY_BRANCH="recovery/oct7-working-version"

echo "======================================================================"
echo "  Working Code Recovery Script"
echo "  Restoring voice/webcam/screen features from Oct 7th, 2025"
echo "======================================================================"
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  WARNING: You have uncommitted changes!"
    echo ""
    git status --short
    echo ""
    read -p "Do you want to continue? This will stash your changes. (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    echo "📦 Stashing current changes..."
    git stash push -m "Pre-recovery stash $(date +%Y%m%d-%H%M%S)"
fi

echo ""
echo "Step 1: Creating backup branch..."
git branch "$BACKUP_BRANCH"
echo "✅ Backup created: $BACKUP_BRANCH"
echo ""

echo "Step 2: Creating recovery branch..."
if git rev-parse --verify "$RECOVERY_BRANCH" >/dev/null 2>&1; then
    echo "⚠️  Recovery branch already exists. Deleting old one..."
    git branch -D "$RECOVERY_BRANCH"
fi
git checkout -b "$RECOVERY_BRANCH"
echo "✅ Recovery branch created: $RECOVERY_BRANCH"
echo ""

echo "Step 3: Restoring working files from commit $WORKING_COMMIT..."
echo ""

# Restore voice/media files
FILES=(
    "src/hooks/useRealtimeVoice.ts"
    "src/hooks/useVoiceRecording.ts"
    "src/lib/audio-recorder.ts"
    "src/lib/audio-streamer.ts"
    "src/components/chat/components/VoicePopoverSection.tsx"
    "src/components/chat/components/CameraPopoverSection.tsx"
    "src/components/chat/components/ScreenPopoverSection.tsx"
    "src/components/chat/components/MediaPopover.tsx"
)

for file in "${FILES[@]}"; do
    echo "  📄 Restoring: $file"
    if git show "$WORKING_COMMIT:$file" > /dev/null 2>&1; then
        git checkout "$WORKING_COMMIT" -- "$file"
    else
        echo "     ⚠️  File didn't exist in working commit, skipping"
    fi
done

echo ""
echo "✅ Files restored from working version"
echo ""

# Check for problematic files to remove
echo "Step 4: Checking for problematic files..."

PROBLEMATIC_FILES=(
    "src/hooks/useMediaRecorderVoice.ts"
)

for file in "${PROBLEMATIC_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  🗑️  Removing problematic file: $file"
        git rm "$file" 2>/dev/null || rm "$file"
    fi
done

echo ""
echo "✅ Cleanup complete"
echo ""

echo "Step 5: Creating recovery commit..."
git add -A
if git diff --cached --quiet; then
    echo "⚠️  No changes to commit (files may already be at working version)"
else
    git commit -m "fix: Restore working voice/webcam/screen implementation from Oct 7th

Restores working code from commit $WORKING_COMMIT which had:
- Working voice recording with AudioRecorder + EventEmitter pattern  
- Working webcam capture via CameraPopoverSection
- Working screen share via ScreenPopoverSection
- Simple, reliable media controls

Removes problematic refactoring that introduced:
- useMediaRecorderVoice hook causing re-render loops
- Complex state management with session timeouts
- Permission re-prompt issues

Ref: WORKING_CODE_RECOVERY_REPORT.md"
    echo "✅ Recovery commit created"
fi

echo ""
echo "======================================================================"
echo "  Recovery Complete!"
echo "======================================================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Test the recovered functionality:"
echo "     $ pnpm dev:all"
echo ""
echo "  2. Verify voice, webcam, and screen share work correctly"
echo ""
echo "  3. If everything works, merge back to main:"
echo "     $ git checkout main"
echo "     $ git merge $RECOVERY_BRANCH"
echo ""
echo "  4. If you need to restore your previous state:"
echo "     $ git checkout $BACKUP_BRANCH"
echo ""
echo "Branches created:"
echo "  - Backup:   $BACKUP_BRANCH"
echo "  - Recovery: $RECOVERY_BRANCH (current)"
echo ""
echo "======================================================================"


