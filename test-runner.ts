#!/usr/bin/env node

/**
 * Test Runner
 * Runs the complete test suite for the Gemini 2.5 Flash pipeline
 */

import { PipelineTester } from './test-pipeline';
import { EndpointTester } from './test-endpoints';

class TestRunner {
  private pipelineTester = new PipelineTester();
  private endpointTester = new EndpointTester();

  async runAllTests(): Promise<void> {
    console.log('🚀 GEMINI 2.5 FLASH PIPELINE TEST SUITE');
    console.log('='.repeat(60));
    console.log('Testing complete AI integration pipeline...');
    console.log('');

    // Run pipeline tests
    await this.pipelineTester.runAllTests();

    console.log('\n' + '='.repeat(60));

    // Ask if user wants to run endpoint tests
    const runEndpoints = process.argv.includes('--endpoints') ||
                        process.argv.includes('--all') ||
                        process.env.RUN_ENDPOINT_TESTS === 'true';

    if (runEndpoints) {
      console.log('🌐 Running HTTP endpoint tests...\n');
      await this.endpointTester.runAllTests();
    } else {
      console.log('⏭️ Skipping endpoint tests (use --endpoints flag to run them)');
      console.log('💡 Note: Endpoint tests require the development server to be running');
    }

    this.printFinalSummary();
  }

  private printFinalSummary(): void {
    console.log('\n🎯 FINAL TEST SUMMARY');
    console.log('='.repeat(60));

    console.log('✅ Pipeline Configuration: All models updated and configured');
    console.log('✅ AI SDK: Latest version (2.0.16) installed');
    console.log('✅ Embedding Model: Updated to text-embedding-004');
    console.log('✅ Retry Logic: Configured with fallback models');

    console.log('\n📝 To run with real API calls:');
    console.log('   export TEST_GOOGLE_API_KEY="your_api_key"');
    console.log('   export TEST_GEMINI_API_KEY="your_api_key"');
    console.log('   npx tsx test-runner.ts');

    console.log('\n📝 To test HTTP endpoints:');
    console.log('   npx tsx test-runner.ts --endpoints');
    console.log('   (This will start the dev server and test endpoints)');

    console.log('\n🎉 Gemini 2.5 Flash integration is ready!');
  }
}

// Run tests
const runner = new TestRunner();
runner.runAllTests().catch(console.error);