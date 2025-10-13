#!/bin/bash

# Setup script for log aggregation system

echo "🔧 Setting up F.B/c Log Aggregation System"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Creating from env.production.example..."
  cp env.production.example .env
fi

# Generate random secret if not set
if ! grep -q "LOGS_INGESTION_SECRET=.*[a-zA-Z0-9]" .env; then
  echo "🔑 Generating LOGS_INGESTION_SECRET..."
  SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
  
  # Check if line exists but is empty
  if grep -q "LOGS_INGESTION_SECRET=" .env; then
    # Replace empty value
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|LOGS_INGESTION_SECRET=.*|LOGS_INGESTION_SECRET=$SECRET|g" .env
    else
      sed -i "s|LOGS_INGESTION_SECRET=.*|LOGS_INGESTION_SECRET=$SECRET|g" .env
    fi
  else
    # Add new line
    echo "" >> .env
    echo "LOGS_INGESTION_SECRET=$SECRET" >> .env
  fi
  echo "✓ Generated new secret"
else
  echo "✓ LOGS_INGESTION_SECRET already set"
fi

# Check LOG_INGEST_URL
if ! grep -q "LOG_INGEST_URL=" .env; then
  echo "LOG_INGEST_URL=http://localhost:3000/api/logs/ingest" >> .env
  echo "✓ Added LOG_INGEST_URL"
else
  echo "✓ LOG_INGEST_URL already set"
fi

echo ""
echo "📋 Optional: Add external service API tokens to .env for full log collection:"
echo "   - VERCEL_API_TOKEN and VERCEL_PROJECT_ID"
echo "   - FLY_API_TOKEN and FLY_APP_NAME"
echo "   - RESEND_API_KEY (if not already set)"
echo ""
echo "✅ Setup complete!"
echo ""
echo "Usage:"
echo "  pnpm logs                 # View all logs in terminal"
echo "  pnpm logs:start           # Start log collectors in background"
echo "  pnpm dev:with-logs        # Start dev server + collectors + viewer"
echo ""

