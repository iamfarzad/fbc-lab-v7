#!/bin/bash

# Check API Key Setup Script
# This script helps you identify which API key environment variables are set

echo "🔍 Checking Gemini API Key Setup"
echo "================================"
echo ""

# Check for different API key environment variables
echo "Environment Variables Check:"
echo "----------------------------"

if [ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
    echo "✅ GOOGLE_GENERATIVE_AI_API_KEY is set (${#GOOGLE_GENERATIVE_AI_API_KEY} characters)"
else
    echo "❌ GOOGLE_GENERATIVE_AI_API_KEY is not set"
fi

if [ -n "$GEMINI_API_KEY" ]; then
    echo "✅ GEMINI_API_KEY is set (${#GEMINI_API_KEY} characters)"
else
    echo "❌ GEMINI_API_KEY is not set"
fi

if [ -n "$GOOGLE_AI_API_KEY" ]; then
    echo "✅ GOOGLE_AI_API_KEY is set (${#GOOGLE_AI_API_KEY} characters)"
else
    echo "❌ GOOGLE_AI_API_KEY is not set"
fi

echo ""

# Check for .env files
echo "Environment Files Check:"
echo "------------------------"

if [ -f ".env.local" ]; then
    echo "✅ .env.local exists"
    if grep -q "GOOGLE_GENERATIVE_AI_API_KEY\|GEMINI_API_KEY\|GOOGLE_AI_API_KEY" .env.local 2>/dev/null; then
        echo "✅ API key found in .env.local"
    else
        echo "❌ No API key found in .env.local"
    fi
else
    echo "❌ .env.local does not exist"
fi

if [ -f ".env" ]; then
    echo "✅ .env exists"
    if grep -q "GOOGLE_GENERATIVE_AI_API_KEY\|GEMINI_API_KEY\|GOOGLE_AI_API_KEY" .env 2>/dev/null; then
        echo "✅ API key found in .env"
    else
        echo "❌ No API key found in .env"
    fi
else
    echo "❌ .env does not exist"
fi

echo ""

# Instructions
echo "📋 Next Steps:"
echo "=============="
echo ""

if [ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ] || [ -n "$GEMINI_API_KEY" ] || [ -n "$GOOGLE_AI_API_KEY" ]; then
    echo "✅ You have API keys set up!"
    echo ""
    echo "To test your models, run one of these commands:"
    echo ""
    if [ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ]; then
        echo "  Quick test: ./scripts/quick-gemini-test.sh \"$GOOGLE_GENERATIVE_AI_API_KEY\""
        echo "  Full test:  ./scripts/test-gemini-models.sh \"$GOOGLE_GENERATIVE_AI_API_KEY\""
        echo "  Node test:  node scripts/test-gemini-models.js \"$GOOGLE_GENERATIVE_AI_API_KEY\""
    elif [ -n "$GEMINI_API_KEY" ]; then
        echo "  Quick test: ./scripts/quick-gemini-test.sh \"$GEMINI_API_KEY\""
        echo "  Full test:  ./scripts/test-gemini-models.sh \"$GEMINI_API_KEY\""
        echo "  Node test:  node scripts/test-gemini-models.js \"$GEMINI_API_KEY\""
    elif [ -n "$GOOGLE_AI_API_KEY" ]; then
        echo "  Quick test: ./scripts/quick-gemini-test.sh \"$GOOGLE_AI_API_KEY\""
        echo "  Full test:  ./scripts/test-gemini-models.sh \"$GOOGLE_AI_API_KEY\""
        echo "  Node test:  node scripts/test-gemini-models.js \"$GOOGLE_AI_API_KEY\""
    fi
else
    echo "❌ No API keys found in environment variables"
    echo ""
    echo "To set up your API key:"
    echo "1. Get your API key from: https://aistudio.google.com/app/apikey"
    echo "2. Create a .env.local file in your project root"
    echo "3. Add: GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here"
    echo "4. Restart your development server"
    echo ""
    echo "Or run the test directly with:"
    echo "  ./scripts/quick-gemini-test.sh YOUR_API_KEY"
fi

echo ""
echo "🔗 Useful Links:"
echo "  - Get API Key: https://aistudio.google.com/app/apikey"
echo "  - API Documentation: https://ai.google.dev/api"
echo "  - Model List: https://ai.google.dev/api/models"
