/**
 * Test script to verify AI SDK Tools cache implementation
 */

const { LeadResearchService } = require('./src/core/intelligence/lead-research.ts');

async function testCaching() {
  console.log('🧪 Testing AI SDK Tools Cache Implementation...\n');

  try {
    // Test 1: Lead Research Caching
    console.log('📊 Test 1: Lead Research Caching');
    const leadService = new LeadResearchService();
    
    const testEmail = 'test@example.com';
    const testName = 'Test User';
    const testCompany = 'https://example.com';
    
    console.log('⏱️ First call (should be slow, misses cache)...');
    const start1 = Date.now();
    const result1 = await leadService.researchLead(testEmail, testName, testCompany);
    const duration1 = Date.now() - start1;
    console.log(`✅ First call completed in ${duration1}ms`);
    
    console.log('⚡ Second call (should be fast, hits cache)...');
    const start2 = Date.now();
    const result2 = await leadService.researchLead(testEmail, testName, testCompany);
    const duration2 = Date.now() - start2;
    console.log(`✅ Second call completed in ${duration2}ms`);
    
    const speedup = duration1 / duration2;
    console.log(`🚀 Speedup: ${speedup.toFixed(1)}x faster`);
    
    // Verify results are identical
    const resultsMatch = JSON.stringify(result1) === JSON.stringify(result2);
    console.log(`🎯 Results match: ${resultsMatch ? '✅' : '❌'}\n`);

    // Test 2: Cache Statistics
    console.log('📈 Test 2: Cache Statistics');
    const { cacheStats } = require('./src/lib/ai-cache.ts');
    console.log(`Cache hits: ${cacheStats.hits}`);
    console.log(`Cache misses: ${cacheStats.misses}`);
    console.log(`Hit rate: ${cacheStats.getHitRate().toFixed(1)}%\n`);

    console.log('🎉 Cache implementation test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCaching();
