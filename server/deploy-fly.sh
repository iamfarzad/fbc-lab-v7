#!/bin/bash

# Deploy WebSocket server to Fly.io

set -e

echo "🚀 Deploying WebSocket server to Fly.io..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null
then
    echo "❌ Fly CLI not found. Please install it first:"
    echo "curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if logged in
if ! fly auth whoami &> /dev/null
then
    echo "📝 Please log in to Fly.io:"
    fly auth login
fi

# Navigate to server directory
cd "$(dirname "$0")"

# Check if app exists or needs to be created
if [ ! -f "fly.toml" ]; then
    echo "❌ fly.toml not found. Creating new Fly app..."
    fly launch --no-deploy
else
    APP_NAME=$(grep "app =" fly.toml | cut -d'"' -f2)
    echo "✅ Found existing app: $APP_NAME"
fi

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

# Deploy the application
echo "🚢 Deploying to Fly.io..."
fly deploy

# Get the app URL
APP_URL=$(fly status --json | jq -r '.Hostname // empty')
if [ -z "$APP_URL" ]; then
    APP_URL=$(fly info --json | jq -r '.Hostname // empty')
fi

if [ -z "$APP_URL" ]; then
    APP_NAME=$(grep "app =" fly.toml | cut -d'"' -f2)
    APP_URL="${APP_NAME}.fly.dev"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📌 WebSocket Server URL: wss://${APP_URL}"
echo ""
echo "🔧 Update your environment variables:"
echo "   NEXT_PUBLIC_LIVE_SERVER_URL=wss://${APP_URL}"
echo ""
echo "📊 View logs: fly logs"
echo "📈 Check status: fly status"
echo "🔄 Redeploy: fly deploy"
echo ""
echo "📝 Next steps:"
echo "1. Update NEXT_PUBLIC_LIVE_SERVER_URL in Vercel dashboard"
echo "2. Test WebSocket connection from your app"
echo "3. Monitor logs for any issues"