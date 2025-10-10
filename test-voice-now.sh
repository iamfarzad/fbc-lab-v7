#!/bin/bash
# Start server with visible logs for testing

cd /Users/farzad/fbc_lab_v7/server

echo "🎤 Starting Voice Test Server"
echo "=============================="
echo ""
echo "Server will show live logs including:"
echo "  - WebSocket connections"
echo "  - Voice session starts"
echo "  - Model being used"
echo "  - Audio processing"
echo "  - Any errors"
echo ""
echo "In another terminal, run: cd /Users/farzad/fbc_lab_v7 && pnpm dev"
echo "Then open: http://localhost:3000 and test voice"
echo ""
echo "Press Ctrl+C to stop"
echo ""
echo "=============================="
echo ""

pnpm tsx live-server.ts

