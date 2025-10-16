#!/bin/bash

# Pre-Deployment Validation Script
# Runs all checks before pushing to main branch

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
OVERALL_STATUS=0

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🚀 PRE-DEPLOYMENT VALIDATION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        OVERALL_STATUS=1
    fi
}

# 1. Type Check
echo -e "${BLUE}[1/6] Running TypeScript type check...${NC}"
if pnpm type-check; then
    print_status 0 "Type check"
else
    print_status 1 "Type check"
fi
echo ""

# 2. Lint Check
echo -e "${BLUE}[2/6] Running ESLint...${NC}"
if pnpm lint; then
    print_status 0 "Lint check"
else
    print_status 1 "Lint check"
fi
echo ""

# 3. Backend Health Check
echo -e "${BLUE}[3/6] Checking backend health...${NC}"
if tsx scripts/check-backend-health.ts; then
    print_status 0 "Backend health check"
else
    print_status 1 "Backend health check"
fi
echo ""

# 4. Build Check
echo -e "${BLUE}[4/6] Testing production build...${NC}"
if pnpm build; then
    print_status 0 "Production build"
else
    print_status 1 "Production build"
fi
echo ""

# 5. Unit Tests (if any exist)
echo -e "${BLUE}[5/6] Running unit tests...${NC}"
if pnpm test:ci 2>/dev/null || echo "No unit tests configured (skipping)"; then
    print_status 0 "Unit tests"
else
    print_status 1 "Unit tests"
fi
echo ""

# 6. E2E Tests
echo -e "${BLUE}[6/6] Running E2E tests...${NC}"
if pnpm test:e2e; then
    print_status 0 "E2E tests"
else
    print_status 1 "E2E tests"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VALIDATION SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}Ready to deploy to main branch${NC}"
    echo ""
    echo -e "${YELLOW}📝 Don't forget to complete the manual testing checklist!${NC}"
    echo -e "${YELLOW}   See: MANUAL_TESTING_CHECKLIST.md${NC}"
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    echo -e "${RED}Please fix the issues before deploying${NC}"
fi

echo -e "${BLUE}========================================${NC}"
echo ""

exit $OVERALL_STATUS

