#!/bin/bash
set -e

echo "🧹 Root Directory Cleanup"
echo "========================"
echo ""

# Check git status
if [[ -n $(git status -s) ]]; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo "Commit or stash them before running this cleanup."
    exit 1
fi

echo "This will:"
echo "  1. Create docs/ structure"
echo "  2. Move 3 key docs to docs/"
echo "  3. Delete 67 historical analysis docs"
echo "  4. Remove temporary files (14MB+ saved)"
echo "  5. Keep essential config and README files"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 1
fi

echo ""
echo "📁 Creating docs structure..."
mkdir -p docs/architecture
mkdir -p docs/guides  
mkdir -p docs/archive

echo "📚 Moving key documentation..."
# Move important architectural docs
if [ -f "CHAT_PIPELINE_ARCHITECTURE.md" ]; then
    git mv CHAT_PIPELINE_ARCHITECTURE.md docs/architecture/
fi
if [ -f "MULTIMODAL_CONTEXT_TECHNICAL_BREAKDOWN.md" ]; then
    git mv MULTIMODAL_CONTEXT_TECHNICAL_BREAKDOWN.md docs/architecture/
fi
if [ -f "HOW_TO_USE_MULTIMODAL.md" ]; then
    git mv HOW_TO_USE_MULTIMODAL.md docs/guides/
fi

echo "🗑️  Removing historical analysis docs..."
# Remove completed/historical analysis files
rm -f ADMIN_DATA_FLOW_ANALYSIS.md
rm -f AI_ELEMENTS_*_ANALYSIS.md
rm -f AI_ELEMENTS_*_SUMMARY.md
rm -f AI-FUCKUP-ANALYSIS.md
rm -f ALL_GAPS_COMPLETE.md
rm -f API_STANDARDIZATION_COMPLETE.md
rm -f AUDIO_CRACKLING_FIXES_SUMMARY.md
rm -f CHAT_AND_AI_API_ANALYSIS.md
rm -f CHAT_COMPONENTS_QUICK_REFERENCE.md
rm -f CHAT_UI_COHERENCE_PLAN.md
rm -f CHAT_UX_GAP_ANALYSIS.md
rm -f chat-ui-refactor.plan.md
rm -f CLEAN_RUN_VALIDATION.md
rm -f COMPLETE_DUPLICATION_ANALYSIS.md
rm -f COMPREHENSIVE_*_RESULTS*.md
rm -f COMPREHENSIVE_TEST_REPORT.md
rm -f CONSOLIDATION_*.md
rm -f CONTEXT_ARCHITECTURE_VERIFICATION.md
rm -f critical_fixes_implementation_plan.md
rm -f CURRENT_CHANGES_GIT_HISTORY_ANALYSIS.md
rm -f DEPLOY_PERSISTENT_CONTEXT.md
rm -f DEPLOYMENT_STATUS.md
rm -f DUPLICATE_UI_*.md
rm -f duplication-analysis.md
rm -f EMERGENCY_FIX_COMPLETE.md
rm -f FINAL_WRAP_UP.md
rm -f GAP1_COMPLETE.md
rm -f git_history_analysis.md
rm -f GIT_HISTORY_PATTERN_ANALYSIS.md
rm -f HUSKY_REFACTOR_SUMMARY.md
rm -f IMPLEMENTATION_COMPLETE_SUMMARY.md
rm -f implementation_plan.md
rm -f LOGO_BRANDING_IMPLEMENTATION_SUMMARY.md
rm -f MANUAL_TESTING_CHECKLIST.md
rm -f MATRIX_COMPONENT_REFERENCE.md
rm -f matrix-component-integration.plan.md
rm -f MEDIA_FIX_SUMMARY.md
rm -f MULTIMODAL_FIXES_COMPLETE.md
rm -f MULTIMODAL_SYSTEM_STATUS.md
rm -f MULTIMODAL_TEST_RESULTS_OCT17.md
rm -f NON_AI_ELEMENTS_CHANGES.md
rm -f PDF_*.md
rm -f PERSISTENT_CONTEXT_*.md
rm -f PRE_DEPLOYMENT_TEST_SUITE_SUMMARY.md
rm -f RADICAL_REBUILD_SUMMARY.md
rm -f REAL-ANALYSIS.md
rm -f REDESIGN_*.md
rm -f RULES_COMPLIANCE_ANALYSIS_OCT16.md
rm -f SCREEN_SHARE_FIX_SUMMARY.md
rm -f TEST_RESULTS.md
rm -f TYPE_SYSTEM_COMPLETE.md
rm -f typescript-thrashing-implementation-plan.COMPLETE.md
rm -f ui-duplication-consolidation.plan.md
rm -f VERIFICATION_*.md
rm -f VOICE_*.md

echo "🗑️  Removing test results and temporary files..."
rm -f all-activity-results.json
rm -f october-activity-results.json
rm -f test-results-multiagent-*.json
rm -f test-scenarios.json

echo "🗑️  Removing old scripts..."
rm -f fix-voice-regression.sh
rm -f quick-fixes.sh
rm -f run-comprehensive-tests.sh
rm -f test-all-agents.sh
rm -f test-voice-now.sh

echo "🗑️  Removing large/temporary files..."
rm -f bfg-1.14.0.jar
rm -f cookies.txt
rm -f test-websocket.html
rm -f debug-env.js
rm -f query-oct7-activity.cjs
rm -f fbc-lab-v7@7.0.0
rm -f tsc
rm -f localhost*.pem

echo "📝 Updating .gitignore..."
cat >> .gitignore << 'GITIGNORE'

# Root directory organization
/*.md.tmp
/test-results-*.json
/all-activity-results.json
/*-activity-results.json
/*.pem
/*.jar
/cookies.txt
/fbc-lab-v7@*
GITIGNORE

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Results:"
echo "  • Moved 3 docs to docs/"
echo "  • Deleted ~67 analysis files"
echo "  • Removed temporary files"
echo "  • Freed ~14MB+ space"
echo ""
echo "📁 New structure:"
echo "  docs/"
echo "    ├── architecture/    (key architectural docs)"
echo "    ├── guides/          (user guides)"
echo "    └── archive/         (for future archival)"
echo ""
echo "🔍 Review changes with: git status"
echo "💾 Commit with: git add -A && git commit -m 'chore: Clean up root directory'"
