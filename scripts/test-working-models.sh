#!/bin/bash

# Test Working Models Script
# Tests models that should work with your paid tier

if [ -z "$1" ]; then
    echo "❌ Error: Please provide your Gemini API key"
    echo "Usage: $0 <YOUR_GEMINI_API_KEY>"
    exit 1
fi

API_KEY="$1"
BASE_URL="https://generativelanguage.googleapis.com/v1beta"

echo "🧪 Testing Models That Should Work With Your Paid Tier"
echo "======================================================"
echo ""

# Test models that should work with paid tier
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

# Test models that should work with paid tier
test_model "gemini-1.5-flash" "Primary working model (2000 requests/min)"
test_model "gemini-1.5-pro" "Pro model (1000 requests/min)"
test_model "gemini-1.5-flash-8b" "8B model (4000 requests/min)"

echo "🎯 Summary:"
echo "==========="
echo "✅ Use gemini-1.5-flash as your primary model"
echo "✅ Use gemini-1.5-pro for complex reasoning"
echo "✅ Use gemini-1.5-flash-8b for high-volume operations"
echo ""
echo "❌ Avoid gemini-2.5-flash and gemini-2.0-flash (free tier limits)"
echo ""
echo "📋 Next Steps:"
echo "1. Update your codebase to use gemini-1.5-flash"
echo "2. Test your application with the working models"
echo "3. Contact Google Cloud Support for 2.5/2.0 model quotas"
