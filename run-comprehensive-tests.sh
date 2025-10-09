#!/bin/bash
# Comprehensive Test Suite for FBC Lab V7
# October 7, 2025

API_BASE="http://localhost:3000"
RESULTS_FILE="COMPREHENSIVE_TEST_RESULTS_$(date +%Y%m%d_%H%M%S).md"

echo "# 🧪 Comprehensive Test Results - $(date)" > "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "Branch: $(git branch --show-current)" >> "$RESULTS_FILE"
echo "Commit: $(git log --oneline -1)" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "---" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

echo "## Phase 1: Core Functionality Tests" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"

# Test 1: Consulting Flow
echo "### Test 1: Consulting Flow Detection" >> "$RESULTS_FILE"
RESPONSE=$(curl -s -X POST "$API_BASE/api/chat/unified" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi, I am Sarah from TechCorp. We need a custom AI solution for 500 daily tickets, AHT 8min, FCR 45%, budget $50K"}],"mode":"standard"}')

if echo "$RESPONSE" | grep -qi "roi\|consulting\|budget"; then
  echo "- ✅ **PASS** - AI identified consulting intent" >> "$RESULTS_FILE"
  echo "- ✅ Mentioned ROI/consulting concepts" >> "$RESULTS_FILE"
else
  echo "- ❌ **FAIL** - Did not identify consulting flow" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"

# Test 2: Workshop Flow
echo "### Test 2: Workshop Flow Detection" >> "$RESULTS_FILE"
RESPONSE=$(curl -s -X POST "$API_BASE/api/chat/unified" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hi, I am Jennifer from MarketingPro. We want AI training workshops for our 25-person team."}],"mode":"standard"}')

if echo "$RESPONSE" | grep -qi "workshop\|training\|team"; then
  echo "- ✅ **PASS** - AI identified workshop intent" >> "$RESULTS_FILE"
else
  echo "- ❌ **FAIL** - Did not identify workshop flow" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"

# Test 3: API Health
echo "### Test 3: API Health Check" >> "$RESULTS_FILE"
HEALTH=$(curl -s "$API_BASE/api/health")
if echo "$HEALTH" | grep -q "OK"; then
  echo "- ✅ **PASS** - Health check operational" >> "$RESULTS_FILE"
else
  echo "- ❌ **FAIL** - Health check failed" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"

# Test 4: Chat API Status
echo "### Test 4: Chat API Status" >> "$RESULTS_FILE"
STATUS=$(curl -s "$API_BASE/api/chat/unified?action=status")
if echo "$STATUS" | grep -q "operational"; then
  echo "- ✅ **PASS** - Chat API operational" >> "$RESULTS_FILE"
else
  echo "- ❌ **FAIL** - Chat API not operational" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"

# Test 5: Capabilities Check
echo "### Test 5: API Capabilities" >> "$RESULTS_FILE"
CAPS=$(curl -s "$API_BASE/api/chat/unified?action=capabilities")
if echo "$CAPS" | grep -q "supportsStreaming.*true"; then
  echo "- ✅ **PASS** - Streaming supported" >> "$RESULTS_FILE"
else
  echo "- ❌ **FAIL** - Streaming not supported" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"

# Test 6: Build Verification
echo "### Test 6: Production Build" >> "$RESULTS_FILE"
if [ -d ".next" ]; then
  echo "- ✅ **PASS** - Build artifacts present" >> "$RESULTS_FILE"
else
  echo "- ❌ **FAIL** - No build artifacts" >> "$RESULTS_FILE"
fi
echo "" >> "$RESULTS_FILE"

echo "---" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "## Summary" >> "$RESULTS_FILE"
echo "" >> "$RESULTS_FILE"
echo "**Timestamp**: $(date)" >> "$RESULTS_FILE"
echo "**Branch**: $(git branch --show-current)" >> "$RESULTS_FILE"
echo "**Status**: Tests completed" >> "$RESULTS_FILE"

cat "$RESULTS_FILE"
echo ""
echo "Results saved to: $RESULTS_FILE"


