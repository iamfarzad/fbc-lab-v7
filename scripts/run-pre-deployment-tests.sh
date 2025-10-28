#!/bin/bash

###############################################################################
# Pre-Deployment Test Runner
# Executes automated tests before deploying to Vercel
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test results array
declare -a TEST_RESULTS

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         PRE-DEPLOYMENT TEST SUITE - FBC LAB V7            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

###############################################################################
# Helper Functions
###############################################################################

run_test() {
  local test_name=$1
  local test_command=$2
  
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  
  echo -e "${YELLOW}🧪 Running: ${test_name}${NC}"
  
  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED: ${test_name}${NC}\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("✅ ${test_name}")
    return 0
  else
    echo -e "${RED}❌ FAILED: ${test_name}${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("❌ ${test_name}")
    return 1
  fi
}

run_test_with_output() {
  local test_name=$1
  local test_command=$2
  
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  
  echo -e "${YELLOW}🧪 Running: ${test_name}${NC}"
  
  if eval "$test_command"; then
    echo -e "${GREEN}✅ PASSED: ${test_name}${NC}\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TEST_RESULTS+=("✅ ${test_name}")
    return 0
  else
    echo -e "${RED}❌ FAILED: ${test_name}${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TEST_RESULTS+=("❌ ${test_name}")
    return 1
  fi
}

###############################################################################
# Test 1: Environment Variables
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SECTION 1: Environment Configuration${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

run_test_with_output "Environment Variables Check" "node scripts/check-env.js"

###############################################################################
# Test 2: Dependencies
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SECTION 2: Dependencies${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

run_test "Node Modules Installed" "test -d node_modules"
run_test "Package Lock Present" "test -f pnpm-lock.yaml"

###############################################################################
# Test 3: TypeScript Compilation
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SECTION 3: TypeScript Compilation${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}🧪 Running: TypeScript Type Check${NC}"
if pnpm tsc --noEmit; then
  echo -e "${GREEN}✅ PASSED: TypeScript Type Check${NC}\n"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  TEST_RESULTS+=("✅ TypeScript Type Check")
else
  echo -e "${RED}❌ FAILED: TypeScript Type Check${NC}\n"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  TEST_RESULTS+=("❌ TypeScript Type Check")
fi

run_test_with_output "Unit Tests: Chat Analytics" "pnpm test -- useChatAnalytics"

###############################################################################
# Test 4: Build Process
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SECTION 4: Production Build${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo -e "${YELLOW}🧪 Running: Production Build${NC}"
if pnpm run build; then
  echo -e "${GREEN}✅ PASSED: Production Build${NC}\n"
  TESTS_PASSED=$((TESTS_PASSED + 1))
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  TEST_RESULTS+=("✅ Production Build")
else
  echo -e "${RED}❌ FAILED: Production Build${NC}\n"
  TESTS_FAILED=$((TESTS_FAILED + 1))
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
  TEST_RESULTS+=("❌ Production Build")
fi

# Check build output
run_test "Build Directory Exists" "test -d .next"
run_test "Build Contains Pages" "test -d .next/server/pages || test -d .next/server/app"

###############################################################################
# Test 5: Database Connection
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SECTION 5: Database Connectivity${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

if [ -n "$DATABASE_URL" ]; then
  echo -e "${YELLOW}🧪 Running: Database Connection Test${NC}"
  if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED: Database Connection${NC}\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TEST_RESULTS+=("✅ Database Connection")
    
    # Check critical tables
    echo -e "${YELLOW}🧪 Running: Database Schema Check${NC}"
    if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM messages LIMIT 1;" > /dev/null 2>&1; then
      echo -e "${GREEN}✅ PASSED: Database Schema${NC}\n"
      TESTS_PASSED=$((TESTS_PASSED + 1))
      TESTS_TOTAL=$((TESTS_TOTAL + 1))
      TEST_RESULTS+=("✅ Database Schema")
    else
      echo -e "${RED}❌ FAILED: Database Schema (messages table missing)${NC}\n"
      TESTS_FAILED=$((TESTS_FAILED + 1))
      TESTS_TOTAL=$((TESTS_TOTAL + 1))
      TEST_RESULTS+=("❌ Database Schema")
    fi
  else
    echo -e "${RED}❌ FAILED: Database Connection${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TEST_RESULTS+=("❌ Database Connection")
  fi
else
  echo -e "${YELLOW}⚠️  SKIPPED: Database tests (DATABASE_URL not set)${NC}\n"
fi

###############################################################################
# Test 6: File Structure
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SECTION 6: Critical File Structure${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

run_test "Live Agent Session View" "test -f src/components/agent-ui/app/session-view.tsx"
run_test "Unified Chat Route" "test -f app/api/chat/unified/route.ts"
run_test "Webcam Tool Route" "test -f app/api/tools/webcam/route.ts"
run_test "Live Server (Voice)" "test -f server/live-server.ts"
run_test "Live Page Route" "test -f app/live/page.tsx"

###############################################################################
# Test 7: Configuration Files
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SECTION 7: Configuration Files${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

run_test "Next.js Config" "test -f next.config.js"
run_test "TypeScript Config" "test -f tsconfig.json"
run_test "Tailwind Config" "test -f tailwind.config.mjs"
run_test "Package.json" "test -f package.json"

###############################################################################
# Test 8: API Endpoints (if server is running)
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  SECTION 8: API Health Checks${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

# Check if server is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Development server is running${NC}\n"
  
  echo -e "${YELLOW}🧪 Running: Chat API Health Check${NC}"
  if curl -s -X POST http://localhost:3000/api/chat/unified \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"test"}],"conversationId":"health-check"}' \
    > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED: Chat API Responding${NC}\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TEST_RESULTS+=("✅ Chat API Health")
  else
    echo -e "${RED}❌ FAILED: Chat API Not Responding${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    TEST_RESULTS+=("❌ Chat API Health")
  fi
  
  # Test WebSocket connection
  if command -v node &> /dev/null && [ -f test-websocket-connection.js ]; then
    run_test_with_output "WebSocket Connection" "node test-websocket-connection.js"
  else
    echo -e "${YELLOW}⚠️  SKIPPED: WebSocket test (test script not found)${NC}\n"
  fi
else
  echo -e "${YELLOW}⚠️  SKIPPED: API tests (development server not running)${NC}"
  echo -e "${YELLOW}   Start server with: pnpm dev:all${NC}\n"
fi

###############################################################################
# Test Results Summary
###############################################################################

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST RESULTS SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

# Calculate pass rate
if [ $TESTS_TOTAL -gt 0 ]; then
  PASS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
  echo -e "Pass Rate: ${PASS_RATE}%\n"
else
  echo -e "Pass Rate: N/A\n"
fi

# Show detailed results
echo -e "${BLUE}Detailed Results:${NC}"
for result in "${TEST_RESULTS[@]}"; do
  echo "  $result"
done

echo ""

###############################################################################
# Deployment Recommendation
###############################################################################

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  DEPLOYMENT RECOMMENDATION${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
  echo -e "${GREEN}✅ READY TO DEPLOY TO VERCEL${NC}\n"
  exit 0
elif [ $TESTS_FAILED -le 2 ] && [ $PASS_RATE -ge 90 ]; then
  echo -e "${YELLOW}⚠️  MOSTLY PASSED (${PASS_RATE}%)${NC}"
  echo -e "${YELLOW}⚠️  REVIEW FAILURES BEFORE DEPLOYING${NC}\n"
  exit 1
else
  echo -e "${RED}❌ CRITICAL ISSUES FOUND${NC}"
  echo -e "${RED}❌ NOT READY FOR DEPLOYMENT${NC}"
  echo -e "${RED}   Fix failing tests before deploying${NC}\n"
  exit 1
fi
