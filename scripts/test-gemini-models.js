#!/usr/bin/env node

/**
 * Comprehensive Gemini API Models Test Script
 * Tests all models used in your codebase plus latest available models
 */

const https = require('https');
const { URL } = require('url');

// Colors for console output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP request helper
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// Test a specific model
async function testModel(apiKey, modelName, description) {
    log('yellow', `Testing: ${modelName}`);
    log('yellow', `Description: ${description}`);
    
    try {
        const response = await makeRequest(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                body: {
                    contents: [{
                        parts: [{
                            text: "Hello! Please respond with a brief greeting to confirm you are working."
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 100
                    }
                }
            }
        );

        if (response.data.error) {
            log('red', '❌ FAILED');
            log('red', `Error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
        } else if (response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content) {
            const responseText = response.data.candidates[0].content.parts[0].text;
            log('green', '✅ SUCCESS');
            log('green', `Response: ${responseText}`);
        } else {
            log('yellow', '⚠️  PARTIAL SUCCESS (No text response)');
            console.log('Raw response:', JSON.stringify(response.data, null, 2));
        }
    } catch (error) {
        log('red', '❌ FAILED');
        log('red', `Network error: ${error.message}`);
    }
    
    console.log('');
}

// Test embedding model
async function testEmbedding(apiKey) {
    log('yellow', 'Testing: text-embedding-004');
    log('yellow', 'Description: Latest embedding model');
    
    try {
        const response = await makeRequest(
            `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
            {
                method: 'POST',
                body: {
                    model: 'models/text-embedding-004',
                    content: {
                        parts: [{
                            text: 'Test embedding'
                        }]
                    }
                }
            }
        );

        if (response.data.error) {
            log('red', '❌ FAILED');
            log('red', `Error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
        } else if (response.data.embedding && response.data.embedding.values) {
            const dimension = response.data.embedding.values.length;
            log('green', '✅ SUCCESS');
            log('green', `Embedding dimension: ${dimension}`);
        } else {
            log('yellow', '⚠️  PARTIAL SUCCESS');
            console.log('Raw response:', JSON.stringify(response.data, null, 2));
        }
    } catch (error) {
        log('red', '❌ FAILED');
        log('red', `Network error: ${error.message}`);
    }
    
    console.log('');
}

// List all available models
async function listModels(apiKey) {
    log('blue', '📋 Fetching available models...');
    
    try {
        const response = await makeRequest(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        if (response.data.error) {
            log('red', '❌ Failed to fetch models list');
            log('red', `Error: ${response.data.error.message || JSON.stringify(response.data.error)}`);
            return;
        }

        log('green', '✅ Successfully fetched models list');
        console.log('');
        
        log('blue', 'Available Models:');
        if (response.data.models) {
            response.data.models.forEach(model => {
                console.log(`${model.name} - ${model.displayName || 'No display name'}`);
            });
        }
        console.log('');
    } catch (error) {
        log('red', '❌ Failed to fetch models list');
        log('red', `Network error: ${error.message}`);
    }
}

// Main function
async function main() {
    const apiKey = process.argv[2];
    
    if (!apiKey) {
        log('red', '❌ Error: Please provide your Gemini API key as the first argument');
        console.log('Usage: node test-gemini-models.js <YOUR_GEMINI_API_KEY>');
        console.log('Example: node test-gemini-models.js AIzaSyC...');
        process.exit(1);
    }

    log('blue', '🚀 Starting Gemini API Models Test');
    log('blue', '================================');
    console.log('');

    // Test models used in your codebase
    log('blue', '🧪 Testing Models Used in Your Codebase');
    log('blue', '=======================================');

    await testModel(apiKey, 'gemini-2.5-flash', 'Primary model for chat API (from app/api/chat/route.ts)');
    await testModel(apiKey, 'gemini-2.0-flash', 'Fallback model for chat API');
    await testModel(apiKey, 'gemini-1.5-pro-latest', 'Model used in unified chat API');
    await testModel(apiKey, 'gemini-2.5-flash-preview-native-audio-dialog', 'Live API model for voice interactions');

    // Test latest available models
    log('blue', '🧪 Testing Latest Available Models');
    log('blue', '===================================');

    await testModel(apiKey, 'gemini-2.5-pro', 'Latest Pro model with enhanced reasoning');
    await testModel(apiKey, 'gemini-1.5-flash', 'Stable Flash model');
    await testModel(apiKey, 'gemini-1.5-pro', 'Stable Pro model');

    // Test embedding model
    log('blue', '🧪 Testing Embedding Model');
    log('blue', '=========================');
    await testEmbedding(apiKey);

    // List all available models
    await listModels(apiKey);

    log('blue', '📊 Test Summary');
    log('blue', '==============');
    log('green', '✅ All tests completed!');
    console.log('');
    log('yellow', 'Next Steps:');
    console.log('1. Review any failed tests above');
    console.log('2. Update your codebase to use the latest working models');
    console.log('3. Consider migrating to gemini-2.5-pro for enhanced capabilities');
    console.log('4. Update your environment variables if needed');
    console.log('');
    log('blue', 'For more information, visit: https://ai.google.dev/api/models');
}

// Run the main function
main().catch(error => {
    log('red', `❌ Unexpected error: ${error.message}`);
    process.exit(1);
});
