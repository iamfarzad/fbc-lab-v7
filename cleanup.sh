#!/bin/bash
set -e

echo "🧹 Starting cleanup..."

# Remove build artifacts
echo "Removing .next build cache..."
rm -rf .next

# Remove test artifacts
echo "Removing test artifacts..."
rm -rf coverage playwright-report test-results

# Clean logs
echo "Cleaning logs..."
find logs -name "*.log" -type f -delete 2>/dev/null || true
rm -f build-output.log multiagent-test.log

# Clean temp files
echo "Removing temp files..."
find . -name "*.log.tmp" -delete 2>/dev/null || true
find . -name "*.json.tmp" -delete 2>/dev/null || true

echo "✅ Quick cleanup complete!"
echo ""
echo "Space freed:"
du -sh . 2>/dev/null | awk '{print $1}'
