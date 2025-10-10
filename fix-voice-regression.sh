#!/bin/bash
# Voice Quality Regression Fix Script
# Based on investigation comparing restore-chat-ui (Oct 7, working) vs main (current, broken)

set -e

echo "🔍 Voice Quality Regression Fix"
echo "==============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}Phase 1: SDK Version Fix (ROOT CAUSE)${NC}"
echo "--------------------------------------"
echo "Current server SDK version:"
grep "@google/genai" server/package.json
echo ""

read -p "Upgrade server SDK from v1.4.0 to v1.21.0? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Upgrading server SDK...${NC}"
    cd server
    
    # Update package.json
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/"@google\/genai": ".*"/"@google\/genai": "^1.21.0"/g' package.json
    else
        # Linux
        sed -i 's/"@google\/genai": ".*"/"@google\/genai": "^1.21.0"/g' package.json
    fi
    
    echo "Updated package.json:"
    grep "@google/genai" package.json
    
    echo ""
    echo "Installing dependencies..."
    pnpm install
    
    cd ..
    echo -e "${GREEN}✅ SDK upgrade complete${NC}"
else
    echo -e "${YELLOW}Skipping SDK upgrade${NC}"
fi

echo ""
echo -e "${YELLOW}Phase 2: Audio Processor Fix${NC}"
echo "----------------------------"
echo "Current audio-processor.js uses:"
echo "  - Buffer size: 2048 samples"
echo "  - Noise gate: 0.005 threshold"
echo "  - Redundant PCM16 conversion"
echo ""
echo "Restore-chat-ui version uses:"
echo "  - Buffer size: 4096 samples (better)"
echo "  - No noise gate (cleaner)"
echo "  - Simple Float32 only"
echo ""

read -p "Revert to restore-chat-ui audio-processor.js? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Reverting audio-processor.js...${NC}"
    git show restore-chat-ui:public/audio-processor.js > public/audio-processor.js
    echo -e "${GREEN}✅ Audio processor reverted${NC}"
else
    echo -e "${YELLOW}Skipping audio processor revert${NC}"
fi

echo ""
echo -e "${YELLOW}Phase 3: Test Locally${NC}"
echo "--------------------"
echo "Commands to test:"
echo "  1. Terminal 1: cd server && pnpm tsx live-server.ts"
echo "  2. Terminal 2: pnpm dev"
echo "  3. Open: http://localhost:3000"
echo "  4. Test voice quality"
echo ""

read -p "Deploy to Fly.io now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Deploying server to Fly.io...${NC}"
    cd server
    flyctl deploy
    cd ..
    echo -e "${GREEN}✅ Server deployed${NC}"
    echo ""
    echo "Monitor logs:"
    echo "  flyctl logs --app fb-consulting-websocket"
else
    echo -e "${YELLOW}Skipping deployment. Deploy manually with:${NC}"
    echo "  cd server && flyctl deploy"
fi

echo ""
echo -e "${GREEN}===============================${NC}"
echo -e "${GREEN}Fix script complete!${NC}"
echo -e "${GREEN}===============================${NC}"
echo ""
echo "Next steps:"
echo "  1. Test voice quality on localhost"
echo "  2. If working, deploy frontend: vercel --prod"
echo "  3. Test on live site"
echo "  4. Monitor for issues"
echo ""
echo "See VOICE_REGRESSION_ANALYSIS.md for detailed investigation results."

