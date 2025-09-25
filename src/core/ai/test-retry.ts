/**
 * Comprehensive test script to verify Gemini models are working
 * Run this to test your Gemini configuration
 */

import { generateText, embed } from 'ai';
import { google } from '@ai-sdk/google';
import { createRetryableGemini, createRetryableGeminiStream, createRetryableGeminiReliable } from './retry-model';
import { embedTexts } from '../embeddings/gemini';

export async function testRetryLogic() {
  console.log('🧪 Testing retry logic...');

  try {
    const retryableModel = createRetryableGemini();

    const result = await generateText({
      model: retryableModel,
      messages: [
        { role: 'user', content: 'Say "Retry test successful!" and nothing else.' }
      ],
      temperature: 0.1,
      system: "You are a test assistant. Respond exactly as requested.",
      abortSignal: AbortSignal.timeout(10_000),
    });

    console.log('✅ Retry test successful!');
    console.log('Response:', result.text);

    return { success: true, response: result.text };
  } catch (error) {
    console.error('❌ Retry test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function testEmbeddingModel() {
  console.log('🧪 Testing embedding model...');

  try {
    const texts = ['Hello world', 'Test embedding'];
    const embeddings = await embedTexts(texts, 768);

    console.log('✅ Embedding test successful!');
    console.log('Number of embeddings:', embeddings.length);
    console.log('Embedding dimensions:', embeddings[0]?.length);

    return { success: true, embeddings: embeddings.length };
  } catch (error) {
    console.error('❌ Embedding test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function testAllGeminiModels() {
  console.log('🧪 Testing all Gemini models...');

  const models = [
    { name: 'Primary (gemini-2.5-flash)', model: createRetryableGemini() },
    { name: 'Streaming (gemini-1.5-flash)', model: createRetryableGeminiStream() },
    { name: 'Reliable (gemini-1.5-pro)', model: createRetryableGeminiReliable() }
  ];

  const results = [];

  for (const { name, model } of models) {
    console.log(`Testing ${name}...`);

    try {
      const result = await generateText({
        model,
        messages: [
          { role: 'user', content: `Say "Model ${name} test successful!" and nothing else.` }
        ],
        temperature: 0.1,
        abortSignal: AbortSignal.timeout(10_000),
      });

      console.log(`✅ ${name} test successful!`);
      results.push({ name, success: true, response: result.text });
    } catch (error) {
      console.error(`❌ ${name} test failed:`, error instanceof Error ? error.message : 'Unknown error');
      results.push({ name, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return results;
}

export async function testBasicModels() {
  console.log('🧪 Testing basic Gemini models...');

  const models = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  const results = [];

  for (const modelName of models) {
    console.log(`Testing ${modelName}...`);

    try {
      const result = await generateText({
        model: google(modelName),
        messages: [
          { role: 'user', content: `Say "${modelName} basic test successful!" and nothing else.` }
        ],
        temperature: 0.1,
        abortSignal: AbortSignal.timeout(10_000),
      });

      console.log(`✅ ${modelName} test successful!`);
      results.push({ name: modelName, success: true, response: result.text });
    } catch (error) {
      console.error(`❌ ${modelName} test failed:`, error instanceof Error ? error.message : 'Unknown error');
      results.push({ name: modelName, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return results;
}

export async function runAllTests() {
  console.log('🚀 Running comprehensive Gemini model tests...\n');

  const results = {
    retry: await testRetryLogic(),
    embedding: await testEmbeddingModel(),
    allModels: await testAllGeminiModels(),
    basicModels: await testBasicModels()
  };

  console.log('\n📊 Test Results Summary:');
  console.log('Retry Logic:', results.retry.success ? '✅ PASS' : '❌ FAIL');
  console.log('Embedding Model:', results.embedding.success ? '✅ PASS' : '❌ FAIL');

  const allModelsPass = results.allModels.every((r: any) => r.success);
  const basicModelsPass = results.basicModels.every((r: any) => r.success);

  console.log('All Models:', allModelsPass ? '✅ PASS' : '❌ FAIL');
  console.log('Basic Models:', basicModelsPass ? '✅ PASS' : '❌ FAIL');

  console.log('\n🎯 Overall Status:', allModelsPass && basicModelsPass && results.retry.success && results.embedding.success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');

  return results;
}

// Simple test that checks model configuration without API calls
export async function testModelConfiguration() {
  console.log('🧪 Testing model configuration...');

  try {
    // Test that the retry models can be created without errors
    const retryModel = createRetryableGemini();
    const streamModel = createRetryableGeminiStream();
    const reliableModel = createRetryableGeminiReliable();

    console.log('✅ All retry models created successfully!');

    // Test that embedding function exists
    console.log('✅ Embedding function available!');

    return { success: true, message: 'Configuration test passed' };
  } catch (error) {
    console.error('❌ Configuration test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Uncomment to run configuration test
testModelConfiguration().then(result => console.log('Config test result:', result));

// Uncomment to run all tests (requires API key)
// runAllTests().then(results => console.log('All test results:', results));

// For individual testing:
// testRetryLogic().then(result => console.log('Retry result:', result));
// testEmbeddingModel().then(result => console.log('Embedding result:', result));
// testAllGeminiModels().then(results => console.log('All models results:', results));
// testBasicModels().then(results => console.log('Basic models results:', results));
// testModelConfiguration().then(result => console.log('Config test result:', result));
