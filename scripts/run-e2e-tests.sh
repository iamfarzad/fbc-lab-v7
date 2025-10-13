#!/bin/bash

# E2E Testing Helper Script
# Provides convenient commands for running Playwright tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🎭 F.B/c AI E2E Testing Suite${NC}"
echo ""

# Function to check if Playwright is installed
check_playwright() {
  if [ ! -d "node_modules/@playwright" ]; then
    echo -e "${RED}❌ Playwright not installed${NC}"
    echo "Installing Playwright..."
    pnpm add -D @playwright/test
  fi
}

# Function to check if browsers are installed
check_browsers() {
  echo -e "${YELLOW}Checking Playwright browsers...${NC}"
  if ! pnpm exec playwright --version &> /dev/null; then
    echo -e "${RED}❌ Playwright CLI not available${NC}"
    exit 1
  fi
}

# Parse command line arguments
case "${1:-all}" in
  install)
    echo -e "${YELLOW}📦 Installing Playwright and browsers...${NC}"
    check_playwright
    pnpm exec playwright install chromium firefox webkit
    echo -e "${GREEN}✅ Installation complete${NC}"
    ;;
    
  all)
    echo -e "${YELLOW}🧪 Running all E2E tests...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e
    ;;
    
  headed)
    echo -e "${YELLOW}🧪 Running E2E tests in headed mode...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e:headed
    ;;
    
  ui)
    echo -e "${YELLOW}🎨 Opening Playwright UI mode...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e:ui
    ;;
    
  debug)
    echo -e "${YELLOW}🐛 Running in debug mode...${NC}"
    check_playwright
    check_browsers
    PWDEBUG=1 pnpm test:e2e "${@:2}"
    ;;
    
  chrome|chromium)
    echo -e "${YELLOW}🧪 Running tests on Chromium...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e --project=chromium
    ;;
    
  firefox)
    echo -e "${YELLOW}🧪 Running tests on Firefox...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e --project=firefox
    ;;
    
  safari|webkit)
    echo -e "${YELLOW}🧪 Running tests on WebKit (Safari)...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e --project=webkit
    ;;
    
  visual)
    echo -e "${YELLOW}📸 Running visual regression tests...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e tests/visual/
    ;;
    
  update-snapshots)
    echo -e "${YELLOW}📸 Updating visual snapshots...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e tests/visual/ --update-snapshots
    ;;
    
  flows)
    echo -e "${YELLOW}🌊 Running flow tests...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e tests/flows/
    ;;
    
  performance)
    echo -e "${YELLOW}⚡ Running performance tests...${NC}"
    check_playwright
    check_browsers
    pnpm test:e2e tests/flows/performance.spec.ts
    ;;
    
  report)
    echo -e "${YELLOW}📊 Opening test report...${NC}"
    if [ -d "playwright-report" ]; then
      pnpm exec playwright show-report
    else
      echo -e "${RED}❌ No report found. Run tests first.${NC}"
      exit 1
    fi
    ;;
    
  trace)
    echo -e "${YELLOW}🔍 Opening trace viewer...${NC}"
    if [ -n "$2" ]; then
      pnpm exec playwright show-trace "$2"
    else
      # Find latest trace
      LATEST_TRACE=$(find test-results -name "trace.zip" -type f -print0 | xargs -0 ls -t | head -n1)
      if [ -n "$LATEST_TRACE" ]; then
        pnpm exec playwright show-trace "$LATEST_TRACE"
      else
        echo -e "${RED}❌ No traces found${NC}"
        exit 1
      fi
    fi
    ;;
    
  clean)
    echo -e "${YELLOW}🧹 Cleaning test artifacts...${NC}"
    rm -rf test-results playwright-report
    echo -e "${GREEN}✅ Clean complete${NC}"
    ;;
    
  help|--help|-h)
    echo "Usage: ./scripts/run-e2e-tests.sh [command]"
    echo ""
    echo "Commands:"
    echo "  install            Install Playwright and browsers"
    echo "  all                Run all E2E tests (default)"
    echo "  headed             Run tests with visible browser"
    echo "  ui                 Open Playwright UI mode"
    echo "  debug              Run in debug mode"
    echo "  chrome/chromium    Run tests on Chrome only"
    echo "  firefox            Run tests on Firefox only"
    echo "  safari/webkit      Run tests on Safari only"
    echo "  visual             Run visual regression tests"
    echo "  update-snapshots   Update visual snapshots"
    echo "  flows              Run flow tests only"
    echo "  performance        Run performance tests only"
    echo "  report             Open HTML test report"
    echo "  trace [file]       Open trace viewer"
    echo "  clean              Clean test artifacts"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/run-e2e-tests.sh install"
    echo "  ./scripts/run-e2e-tests.sh headed"
    echo "  ./scripts/run-e2e-tests.sh chrome"
    echo "  ./scripts/run-e2e-tests.sh debug tests/chat.spec.ts"
    ;;
    
  *)
    echo -e "${RED}❌ Unknown command: $1${NC}"
    echo "Run './scripts/run-e2e-tests.sh help' for usage"
    exit 1
    ;;
esac

exit 0

