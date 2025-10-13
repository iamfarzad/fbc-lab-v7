#!/bin/bash

echo "🚀 Production Log System Deployment Script"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Read from .env
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found!${NC}"
  exit 1
fi

echo -e "${BLUE}📋 Reading configuration from .env...${NC}"
echo ""

LOGS_SECRET=$(grep LOGS_INGESTION_SECRET .env | cut -d '=' -f2)
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d '=' -f2)
SUPABASE_SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d '=' -f2)

# Validate
if [ "$SUPABASE_URL" == "https://your-project.supabase.co" ]; then
  echo -e "${RED}❌ Supabase URL not configured!${NC}"
  echo ""
  echo "Please update .env with your real Supabase credentials:"
  echo "1. Go to: https://supabase.com/dashboard"
  echo "2. Select your project"
  echo "3. Settings → API"
  echo "4. Copy URL and service_role key to .env"
  exit 1
fi

if [ "$SUPABASE_SERVICE_KEY" == "your-supabase-service-role-key-here" ]; then
  echo -e "${RED}❌ Supabase service role key not configured!${NC}"
  exit 1
fi

if [ "$LOGS_SECRET" == "your-random-secret-here" ]; then
  echo -e "${YELLOW}⚠️  Generating new LOGS_INGESTION_SECRET...${NC}"
  NEW_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
  
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|LOGS_INGESTION_SECRET=.*|LOGS_INGESTION_SECRET=$NEW_SECRET|g" .env
  else
    sed -i "s|LOGS_INGESTION_SECRET=.*|LOGS_INGESTION_SECRET=$NEW_SECRET|g" .env
  fi
  
  LOGS_SECRET=$NEW_SECRET
  echo -e "${GREEN}✓ Generated new secret${NC}"
fi

echo -e "${GREEN}✓ Configuration validated${NC}"
echo ""

# Step 1: Supabase Migration
echo -e "${BLUE}📦 Step 1: Create Supabase logs table${NC}"
echo ""
echo "You need to run this SQL in your Supabase dashboard:"
echo ""
echo -e "${YELLOW}SQL File: supabase/migrations/20250110_create_logs_table.sql${NC}"
echo ""
echo "Options:"
echo "  a) Supabase Dashboard → SQL Editor → Paste and Run"
echo "  b) Use Supabase CLI: supabase db push"
echo ""
read -p "Press Enter when you've created the table..."
echo ""

# Step 2: Set Vercel Environment Variables
echo -e "${BLUE}⚙️  Step 2: Set Vercel environment variables${NC}"
echo ""
echo "Go to: https://vercel.com/team_02T3uhzn4NP4J826vRn1Fzfw/prj_lFkKWN3x10HMy7b9kRuCoi0qGnbN/settings/environment-variables"
echo ""
echo "Add these 3 variables (Environment: Production):"
echo ""
echo -e "${GREEN}1. ENABLE_LOG_PERSISTENCE${NC}"
echo "   Value: 1"
echo ""
echo -e "${GREEN}2. SUPABASE_SERVICE_ROLE_KEY${NC}"
echo "   Value: $SUPABASE_SERVICE_KEY"
echo ""
echo -e "${GREEN}3. LOGS_INGESTION_SECRET${NC}"
echo "   Value: $LOGS_SECRET"
echo ""
echo -e "${YELLOW}⚠️  Keep these values secure - don't share them!${NC}"
echo ""
read -p "Press Enter when you've added the variables to Vercel..."
echo ""

# Step 3: Deploy
echo -e "${BLUE}🚀 Step 3: Deploy to production${NC}"
echo ""
echo "Deploy options:"
echo "  a) Git push: git push origin main"
echo "  b) Vercel CLI: vercel --prod"
echo ""
read -p "Deploy now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${GREEN}Deploying...${NC}"
  git add .
  git commit -m "Add production log monitoring system" || true
  git push origin main
  echo ""
  echo -e "${GREEN}✅ Deployment triggered!${NC}"
else
  echo -e "${YELLOW}Skipped deployment. Run manually when ready.${NC}"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "1. Wait for deployment to finish"
echo "2. Visit: https://farzadbayat.com/admin/logs"
echo "3. Trigger some activity on the site"
echo "4. Watch logs appear in the dashboard!"
echo ""
echo "Local testing:"
echo "  pnpm dev:with-logs"
echo "  pnpm logs"
echo ""


