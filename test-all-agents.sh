#!/bin/bash

echo "🧪 RUNNING ALL AGENT TESTS"
echo "======================================================================"
echo ""

total=0
passed=0

run_test() {
  echo "Running: $1"
  if node "$1" > /tmp/test-output.txt 2>&1; then
    echo "  ✅ PASSED"
    passed=$((passed + 1))
  else
    echo "  ❌ FAILED"
    cat /tmp/test-output.txt | tail -10
  fi
  total=$((total + 1))
  echo ""
}

run_test "test-agent-runtime.mjs"
run_test "test-agent-validation.mjs"
run_test "test-agent-imports.mjs"
run_test "test-agent-dependencies.mjs"
run_test "test-agent-syntax.mjs"
run_test "test-agent-contracts.mjs"
run_test "test-agent-multimodal.mjs"
run_test "test-agent-cost-protection.mjs"

echo "======================================================================"
echo "📊 FINAL RESULTS: $passed/$total tests passed"
echo "======================================================================"

if [ $passed -eq $total ]; then
  echo ""
  echo "✅ ALL TESTS PASSING"
  echo ""
  echo "System validated:"
  echo "  • 10 agents present"
  echo "  • Routing logic working"
  echo "  • Imports valid"
  echo "  • Dependencies installed"
  echo "  • Syntax correct"
  echo "  • Contracts proper"
  echo "  • Multimodal integrated"
  echo "  • Cost protection active"
  echo ""
  echo "🚀 Ready to deploy: git push origin multi-agent"
  echo ""
  exit 0
else
  echo ""
  echo "❌ SOME TESTS FAILED"
  echo "Review errors above before deploying"
  echo ""
  exit 1
fi
