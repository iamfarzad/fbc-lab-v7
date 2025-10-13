#!/bin/bash

# Gemini API Models Test Script
# This script tests all available Gemini API models to ensure they're up to date and working

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if API key is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide your Gemini API key as the first argument${NC}"
    echo "Usage: $0 <YOUR_GEMINI_API_KEY>"
    echo "Example: $0 AIzaSyC..."
    exit 1
fi

API_KEY="$1"
BASE_URL="https://generativelanguage.googleapis.com/v1beta"

echo -e "${BLUE}🚀 Starting Gemini API Models Test${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to test a model
test_model() {
    local model_name="$1"
    local description="$2"
    
    echo -e "${YELLOW}Testing: $model_name${NC}"
    echo -e "${YELLOW}Description: $description${NC}"
    
    # Test the model with a simple prompt
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{
            "contents": [
                {
                    "parts": [
                        {
                            "text": "Hello! Please respond with a brief greeting to confirm you are working."
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 100
            }
        }' \
        "$BASE_URL/models/$model_name:generateContent?key=$API_KEY")
    
    # Check if the response contains an error
    if echo "$response" | grep -q '"error"'; then
        echo -e "${RED}❌ FAILED${NC}"
        echo -e "${RED}Error details:${NC}"
        echo "$response" | jq -r '.error.message // .error' 2>/dev/null || echo "$response"
    else
        # Extract the response text
        response_text=$(echo "$response" | jq -r '.candidates[0].content.parts[0].text // "No text response"' 2>/dev/null)
        if [ "$response_text" != "No text response" ] && [ "$response_text" != "null" ]; then
            echo -e "${GREEN}✅ SUCCESS${NC}"
            echo -e "${GREEN}Response: $response_text${NC}"
        else
            echo -e "${YELLOW}⚠️  PARTIAL SUCCESS (No text response)${NC}"
            echo "Raw response: $response"
        fi
    fi
    
    echo ""
}

# Function to list all available models
list_models() {
    echo -e "${BLUE}📋 Fetching available models...${NC}"
    
    models_response=$(curl -s -X GET "$BASE_URL/models?key=$API_KEY")
    
    if echo "$models_response" | grep -q '"error"'; then
        echo -e "${RED}❌ Failed to fetch models list${NC}"
        echo "$models_response" | jq -r '.error.message // .error' 2>/dev/null || echo "$models_response"
        return 1
    fi
    
    echo -e "${GREEN}✅ Successfully fetched models list${NC}"
    echo ""
    
    # Extract and display model names
    echo -e "${BLUE}Available Models:${NC}"
    echo "$models_response" | jq -r '.models[] | "\(.name) - \(.displayName // "No display name")"' 2>/dev/null || echo "Could not parse models list"
    echo ""
}

# Test models that are currently used in your codebase
echo -e "${BLUE}🧪 Testing Models Used in Your Codebase${NC}"
echo -e "${BLUE}=======================================${NC}"

# Models from your codebase
test_model "gemini-2.5-flash" "Primary model for chat API (from app/api/chat/route.ts)"
test_model "gemini-2.0-flash" "Fallback model for chat API"
test_model "gemini-1.5-pro-latest" "Model used in unified chat API"
test_model "gemini-2.5-flash-preview-native-audio-dialog" "Live API model for voice interactions"

echo -e "${BLUE}🧪 Testing Latest Available Models${NC}"
echo -e "${BLUE}===================================${NC}"

# Latest models (as of 2024)
test_model "gemini-2.5-pro" "Latest Pro model with enhanced reasoning"
test_model "gemini-2.5-flash" "Latest Flash model (already tested above)"
test_model "gemini-2.0-flash" "Latest 2.0 Flash model (already tested above)"
test_model "gemini-1.5-flash" "Stable Flash model"
test_model "gemini-1.5-pro" "Stable Pro model"

# Test embedding model
echo -e "${BLUE}🧪 Testing Embedding Model${NC}"
echo -e "${BLUE}=========================${NC}"

echo -e "${YELLOW}Testing: text-embedding-004${NC}"
echo -e "${YELLOW}Description: Latest embedding model${NC}"

embedding_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "model": "models/text-embedding-004",
        "content": {
            "parts": [
                {
                    "text": "Test embedding"
                }
            ]
        }
    }' \
    "$BASE_URL/models/text-embedding-004:embedContent?key=$API_KEY")

if echo "$embedding_response" | grep -q '"error"'; then
    echo -e "${RED}❌ FAILED${NC}"
    echo -e "${RED}Error details:${NC}"
    echo "$embedding_response" | jq -r '.error.message // .error' 2>/dev/null || echo "$embedding_response"
else
    embedding_dimension=$(echo "$embedding_response" | jq -r '.embedding.values | length' 2>/dev/null)
    if [ "$embedding_dimension" != "null" ] && [ "$embedding_dimension" -gt 0 ]; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
        echo -e "${GREEN}Embedding dimension: $embedding_dimension${NC}"
    else
        echo -e "${YELLOW}⚠️  PARTIAL SUCCESS${NC}"
        echo "Raw response: $embedding_response"
    fi
fi

echo ""

# List all available models
list_models

echo -e "${BLUE}📊 Test Summary${NC}"
echo -e "${BLUE}==============${NC}"
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review any failed tests above"
echo "2. Update your codebase to use the latest working models"
echo "3. Consider migrating to gemini-2.5-pro for enhanced capabilities"
echo "4. Update your environment variables if needed"
echo ""
echo -e "${BLUE}For more information, visit: https://ai.google.dev/api/models${NC}"
