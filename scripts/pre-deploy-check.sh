#!/bin/bash

# Pre-Push Validation Script
# Fast checks only - heavy validation runs in CI

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
echo -e "${BLUE}🚀 PRE-PUSH VALIDATION (Fast Checks)${NC}"
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
echo -e "${BLUE}[1/2] Running TypeScript type check...${NC}"
if pnpm type-check; then
    print_status 0 "Type check"
else
    print_status 1 "Type check"
fi
echo ""

# 2. Lint Check
echo -e "${BLUE}[2/2] Running ESLint...${NC}"
if pnpm lint; then
    print_status 0 "Lint check"
else
    print_status 1 "Lint check"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}VALIDATION SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"

if [ $OVERALL_STATUS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}Ready to push to main branch${NC}"
    echo ""
    echo -e "${YELLOW}ℹ️  Heavy checks (build, tests, health) run in CI${NC}"
    echo -e "${YELLOW}   See GitHub Actions for full validation${NC}"
else
    echo -e "${RED}❌ SOME CHECKS FAILED${NC}"
    echo -e "${RED}Please fix the issues before pushing${NC}"
fi

echo -e "${BLUE}========================================${NC}"
echo ""

exit $OVERALL_STATUS

