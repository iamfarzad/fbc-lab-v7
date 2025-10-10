#!/bin/bash
# CORRECTED Voice Quality Fix Script
# Based on Google Sandbox Reference + Investigation

set -e

echo "🔍 CORRECTED Voice Quality Fix"
echo "==============================="
echo ""
echo "After reviewing the Google sandbox, the real issue is:"
echo "  ❌ Using old gemini-2.0 model instead of new 2.5 native audio"
echo "  ❌ SDK v1.4.0 is actually CORRECT (matches sandbox)"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root${NC}"
    exit 1
fi

echo -e "${YELLOW}Phase 1: Upgrade to Native Audio Model (CRITICAL)${NC}"
echo "------------------------------------------------"
echo "Current model: gemini-2.0-flash-live-001"
echo "Target model: gemini-2.5-flash-native-audio-preview-09-2025"
echo ""

read -p "Upgrade to native audio model? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Updating live-server.ts...${NC}"
    
    cd server
    
    # Backup first
    cp live-server.ts live-server.ts.backup
    
    # Update model
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' 's/gemini-2\.0-flash-live-001/gemini-2.5-flash-native-audio-preview-09-2025/g' live-server.ts
    else
        # Linux
        sed -i 's/gemini-2\.0-flash-live-001/gemini-2.5-flash-native-audio-preview-09-2025/g' live-server.ts
    fi
    
    echo "✅ Model updated to gemini-2.5-flash-native-audio"
    cd ..
else
    echo -e "${YELLOW}Skipping model upgrade${NC}"
fi

echo ""
echo -e "${YELLOW}Phase 2: Add Missing Configuration${NC}"
echo "------------------------------------"
echo "Sandbox has:"
echo "  - mediaResolution: MEDIA_RESOLUTION_MEDIUM"
echo "  - contextWindowCompression"
echo ""
echo "These need to be added manually to server/live-server.ts"
echo ""
echo "Add imports at top:"
echo "  import { GoogleGenAI, MediaResolution, Modality } from '@google/genai'"
echo ""
echo "Add to liveConfig:"
echo "  mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,"
echo "  contextWindowCompression: {"
echo "    triggerTokens: '25600',"
echo "    slidingWindow: { targetTokens: '12800' }"
echo "  }"
echo ""

read -p "Open server/live-server.ts in editor now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ${EDITOR:-nano} server/live-server.ts
fi

echo ""
echo -e "${YELLOW}Phase 3: Audio Processor (Optional)${NC}"
echo "-----------------------------------"

read -p "Revert to simpler audio-processor.js? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Reverting audio-processor.js...${NC}"
    git show restore-chat-ui:public/audio-processor.js > public/audio-processor.js
    echo -e "${GREEN}✅ Audio processor reverted${NC}"
else
    echo -e "${YELLOW}Keeping current audio processor${NC}"
fi

echo ""
echo -e "${YELLOW}Phase 4: Test Locally${NC}"
echo "--------------------"
echo "1. Terminal 1: cd server && pnpm tsx live-server.ts"
echo "2. Terminal 2: pnpm dev"
echo "3. Test at http://localhost:3000"
echo "4. Voice should be MUCH clearer with native audio model"
echo ""

read -p "Deploy to Fly.io now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}Deploying to Fly.io...${NC}"
    cd server
    flyctl deploy
    cd ..
    echo -e "${GREEN}✅ Deployed!${NC}"
else
    echo -e "${YELLOW}Deploy manually with: cd server && flyctl deploy${NC}"
fi

echo ""
echo -e "${GREEN}===============================${NC}"
echo -e "${GREEN}Fix complete!${NC}"
echo -e "${GREEN}===============================${NC}"
echo ""
echo "Key changes:"
echo "  ✅ Upgraded to gemini-2.5-flash-native-audio model"
echo "  ⚠️  Add mediaResolution and contextWindowCompression manually"
echo "  ✅ Audio processor simplified (if selected)"
echo ""
echo "Expected results:"
echo "  ✅ Crystal clear voice (native audio processing)"
echo "  ✅ Better screenshare/webcam (with mediaResolution)"
echo "  ✅ Longer conversations (with compression)"
echo ""
echo "See VOICE_REGRESSION_CORRECTED.md for full details"

