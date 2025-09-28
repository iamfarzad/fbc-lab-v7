#!/bin/bash

# Unified deployment script for FBC Lab v7
# Deploys WebSocket server to Fly.io with full monitoring integration

set -e

echo "🚀 FBC Lab v7 - Unified Deployment to Fly.io"
echo "=============================================="

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if logged in
if ! fly auth whoami &> /dev/null; then
    echo "📝 Please log in to Fly.io:"
    fly auth login
fi

# Navigate to server directory
cd "$(dirname "$0")"

# Get app name from fly.toml
APP_NAME=$(grep "app =" fly.toml | cut -d'"' -f2)
echo "🎯 Deploying app: $APP_NAME"

# Set secrets (environment variables)
echo "🔐 Setting environment variables..."

# Check if GEMINI_API_KEY is set in local environment
if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY not found in environment."
    echo "Please enter your Gemini API key:"
    read -s GEMINI_API_KEY
fi

# Set the secret in Fly.io
fly secrets set GEMINI_API_KEY="$GEMINI_API_KEY" --stage

# Optional: Set other secrets
if [ -n "$NODE_ENV" ]; then
    fly secrets set NODE_ENV="$NODE_ENV" --stage
fi

# Deploy the application
echo "🚢 Deploying to Fly.io..."
fly deploy

# Get the app URL
APP_URL=$(fly status --json | jq -r '.Hostname // empty')
if [ -z "$APP_URL" ]; then
    APP_URL=$(fly info --json | jq -r '.Hostname // empty')
fi

if [ -z "$APP_URL" ]; then
    APP_URL="${APP_NAME}.fly.dev"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📌 WebSocket Server URL: wss://${APP_URL}"
echo "📌 HTTP Health Check: https://${APP_URL}/health"
echo ""
echo "🔧 Update your environment variables:"
echo "   NEXT_PUBLIC_LIVE_SERVER_URL=wss://${APP_URL}"
echo "   NEXT_PUBLIC_WEBRTC_SERVER_URL=wss://${APP_URL}:3002"
echo ""
echo "📊 Monitor your deployment:"
echo "   View logs: fly logs"
echo "   Check status: fly status"
echo "   View metrics: fly dashboard"
echo "   Redeploy: fly deploy"
echo ""
echo "🎯 Next steps:"
echo "1. Update NEXT_PUBLIC_LIVE_SERVER_URL in Vercel dashboard"
echo "2. Test WebSocket connection from your app"
echo "3. Monitor costs via admin dashboard: /admin/flyio/usage"
echo "4. Set budget alerts via admin dashboard: /admin/flyio/settings"
echo ""
echo "🔗 Admin Dashboard URLs:"
echo "   Usage: https://farzadbayat.com/admin/flyio/usage"
echo "   Settings: https://farzadbayat.com/admin/flyio/settings"

