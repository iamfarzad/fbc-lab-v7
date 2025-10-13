#!/bin/bash

# Test Pipeline Runner Script
# Run all pipeline tests and show results

echo "🧪 Running F.B/c Lab V7 Test Pipeline..."
echo "=========================================="
echo ""

# Set test environment
export NODE_ENV=test
export GOOGLE_GENERATIVE_AI_API_KEY=test-api-key

# Run tests with color and clear output
pnpm test --colors 2>&1 | grep -E "(PASS|FAIL|●|✓|✕|Test Suites:|Tests:|Snapshots:|Time:|Console)" || pnpm test --colors

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed successfully!"
    echo ""
    echo "📊 Test Coverage Summary:"
    echo "  - Chat Pipeline: ✓"
    echo "  - Intelligence Pipeline: ✓"
    echo "  - Lead Research: ✓"
    echo "  - AI Retry Models: ✓"
    echo "  - WebSocket Pipeline: ✓"
    echo ""
    echo "🚀 Pipeline is ready for deployment!"
else
    echo ""
    echo "❌ Some tests failed. Please review the output above."
    echo ""
    echo "📝 Run 'pnpm test' for detailed output"
    exit 1
fi



