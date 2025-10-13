#!/bin/bash

# Updated Gemini API Models Test Script
# Tests all models with your $240+ billing

if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Gemini API key"
    echo "Usage: $0 <YOUR_GEMINI_API_KEY>"
    exit 1
fi

API_KEY="$1"
BASE_URL="https://generativelanguage.googleapis.com/v1beta"

echo "🚀 Updated Gemini API Models Test (With $240+ Billing)"
echo "====================================================="
echo ""

# Function to test a model
test_model() {
    local model_name="$1"
    local description="$2"
    
    echo -e "\033[33mTesting: $model_name\033[0m"
    echo -e "\033[33mDescription: $description\033[0m"
    
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [{"parts": [{"text": "Hello! Please respond with just OK if you are working."}]}],
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 50}
        }' \
        "$BASE_URL/models/$model_name:generateContent?key=$API_KEY")
    
    if echo "$response" | grep -q '"error"'; then
        echo -e "\033[31m❌ FAILED\033[0m"
        echo -e "\033[31mError: $(echo "$response" | jq -r '.error.message // .error' 2>/dev/null || echo "$response")\033[0m"
    else
        response_text=$(echo "$response" | jq -r '.candidates[0].content.parts[0].text // "No text response"' 2>/dev/null)
        if [ "$response_text" != "No text response" ] && [ "$response_text" != "null" ]; then
            echo -e "\033[32m✅ SUCCESS\033[0m"
            echo -e "\033[32mResponse: $response_text\033[0m"
        else
            echo -e "\033[33m⚠️  PARTIAL SUCCESS\033[0m"
            echo "Raw response: $response"
        fi
    fi
    echo ""
}

echo "🧪 Testing Models Used in Your Codebase"
echo "======================================="

test_model "gemini-2.5-flash" "Primary model for chat API"
test_model "gemini-2.0-flash" "Fallback model for chat API"
test_model "gemini-1.5-pro-latest" "Model used in unified chat API"
test_model "gemini-1.5-flash" "Stable Flash model"
test_model "gemini-1.5-pro" "Stable Pro model"

echo "🧪 Testing Latest Available Models"
echo "==================================="

test_model "gemini-1.5-flash-latest" "Latest Flash model"
test_model "gemini-1.5-flash-8b" "8B Flash model"
test_model "gemini-1.5-flash-8b-latest" "Latest 8B Flash model"
test_model "gemini-2.5-pro" "Latest Pro model"
test_model "gemini-2.5-flash-lite" "Flash Lite model"

echo "🧪 Testing Embedding Models"
echo "==========================="

test_model "text-embedding-004" "Latest embedding model"
test_model "gemini-embedding-001" "Gemini embedding model"

echo "🎯 Summary:"
echo "==========="
echo "✅ Working models can be used immediately"
echo "❌ Failed models are still hitting quota limits"
echo ""
echo "📋 Recommendations:"
echo "1. Use gemini-1.5-flash-latest as your primary model"
echo "2. Use gemini-1.5-pro-latest for complex reasoning"
echo "3. Use gemini-1.5-flash-8b for high-volume operations"
echo "4. Contact Google Cloud Support for 2.5/2.0 model access"
