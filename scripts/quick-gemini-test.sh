#!/bin/bash

# Quick Gemini API Test - Simple curl commands for immediate testing
# Usage: ./quick-gemini-test.sh YOUR_API_KEY

if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Gemini API key"
    echo "Usage: $0 <YOUR_GEMINI_API_KEY>"
    exit 1
fi

API_KEY="$1"
BASE_URL="https://generativelanguage.googleapis.com/v1beta"

echo "🚀 Quick Gemini API Test"
echo "======================="
echo ""

# Test 1: List all available models
echo "📋 Testing: List available models"
curl -s -X GET "$BASE_URL/models?key=$API_KEY" | jq -r '.models[] | "\(.name) - \(.displayName // "No display name")"' 2>/dev/null || echo "❌ Failed to list models"
echo ""

# Test 2: Test gemini-2.5-flash (your primary model)
echo "🧪 Testing: gemini-2.5-flash"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello! Respond with just OK if you are working."}]}],
    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 50}
  }' \
  "$BASE_URL/models/gemini-2.5-flash:generateContent?key=$API_KEY" | jq -r '.candidates[0].content.parts[0].text // "❌ Failed"' 2>/dev/null || echo "❌ Failed"
echo ""

# Test 3: Test gemini-2.0-flash (your fallback model)
echo "🧪 Testing: gemini-2.0-flash"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello! Respond with just OK if you are working."}]}],
    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 50}
  }' \
  "$BASE_URL/models/gemini-2.0-flash:generateContent?key=$API_KEY" | jq -r '.candidates[0].content.parts[0].text // "❌ Failed"' 2>/dev/null || echo "❌ Failed"
echo ""

# Test 4: Test gemini-1.5-pro-latest (your unified API model)
echo "🧪 Testing: gemini-1.5-pro-latest"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "Hello! Respond with just OK if you are working."}]}],
    "generationConfig": {"temperature": 0.1, "maxOutputTokens": 50}
  }' \
  "$BASE_URL/models/gemini-1.5-pro-latest:generateContent?key=$API_KEY" | jq -r '.candidates[0].content.parts[0].text // "❌ Failed"' 2>/dev/null || echo "❌ Failed"
echo ""

# Test 5: Test embedding model
echo "🧪 Testing: text-embedding-004"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "model": "models/text-embedding-004",
    "content": {"parts": [{"text": "test"}]}
  }' \
  "$BASE_URL/models/text-embedding-004:embedContent?key=$API_KEY" | jq -r '.embedding.values | length // "❌ Failed"' 2>/dev/null || echo "❌ Failed"
echo ""

echo "✅ Quick test completed!"
echo "For detailed testing, run: ./test-gemini-models.sh $API_KEY"
