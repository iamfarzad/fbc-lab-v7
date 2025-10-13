#!/usr/bin/env node

/**
 * Multi-Agent System Testing Suite
 * Tests each agent individually and the orchestrator routing logic
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 30000,
  sessionId: 'test-multiagent-' + Date.now(),
  logResults: true,
  verbose: true
};

// Test results storage
const testResults = {
  timestamp: new Date().toISOString(),
  agentTests: {},
  orchestratorTests: {},
  apiIntegrationTests: {},
  featureFlagTests: {},
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }
};

// Utility functions
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}`;
  console.log(logEntry);
  
  if (TEST_CONFIG.logResults) {
    fs.appendFileSync('multiagent-test.log', logEntry + '\n');
  }
}

function saveResults() {
  const resultsPath = `test-results-multiagent-${Date.now()}.json`;
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  log(`Test results saved to: ${resultsPath}`);
}

async function makeRequest(endpoint, payload = {}) {
  const url = `${TEST_CONFIG.baseUrl}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response;
}

// Test cases for each agent
const AGENT_TEST_CASES = {
  discovery: [
    {
      name: 'Initial greeting',
      messages: [{ role: 'user', content: 'Hi, I want to improve my business processes' }],
      expectedStage: 'DISCOVERY',
      expectedAgent: 'Discovery Agent'
    },
    {
      name: 'Goals category',
      messages: [
        { role: 'user', content: 'Hi, I want to improve my business processes' },
        { role: 'assistant', content: 'Hello! What specific business goals are you trying to achieve?' },
        { role: 'user', content: 'We want to reduce operational costs by 20% this year' }
      ],
      expectedStage: 'DISCOVERY',
      expectCategoriesCovered: 1
    }
  ],
  
  scoring: [
    {
      name: 'Transition to scoring',
      context: {
        conversationFlow: {
          covered: { goals: true, pain: true, data: true, readiness: true, budget: false, success: false },
          totalUserTurns: 8
        }
      },
      expectedStage: 'SCORING',
      expectedAgent: 'Scoring Agent'
    }
  ],
  
  workshopSales: [
    {
      name: 'Workshop pitch',
      context: {
        conversationFlow: {
          covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: true },
          totalUserTurns: 12
        },
        intelligenceContext: {
          fitScore: { workshop: 0.8, consulting: 0.6 }
        }
      },
      expectedStage: 'WORKSHOP_PITCH',
      expectedAgent: 'Workshop Sales Agent'
    }
  ],
  
  consultingSales: [
    {
      name: 'Consulting pitch',
      context: {
        conversationFlow: {
          covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: true },
          totalUserTurns: 12
        },
        intelligenceContext: {
          fitScore: { workshop: 0.6, consulting: 0.9 }
        }
      },
      expectedStage: 'CONSULTING_PITCH',
      expectedAgent: 'Consulting Sales Agent'
    }
  ],
  
  admin: [
    {
      name: 'Admin query',
      mode: 'admin',
      messages: [{ role: 'user', content: 'Show me recent leads and their scores' }],
      expectedStage: 'ADMIN',
      expectedAgent: 'Admin Agent'
    }
  ]
};

// Main test functions
async function testAgent(agentName, testCase) {
  const testName = `test-${agentName}-${testCase.name.replace(/\s+/g, '-').toLowerCase()}`;
  log(`Testing ${agentName} agent: ${testCase.name}`, 'TEST');
  
  try {
    const payload = {
      messages: testCase.messages || [{ role: 'user', content: 'Hello' }],
      context: {
        sessionId: TEST_CONFIG.sessionId,
        mode: testCase.mode || 'standard',
        ...testCase.context
      },
      stream: false, // Test non-streaming first
      mode: testCase.mode || 'standard'
    };

    const response = await makeRequest('/api/chat/unified', payload);
    const result = await response.json();
    
    // Check response headers for agent info
    const agentUsed = response.headers.get('x-agent-used');
    const funnelStage = response.headers.get('x-funnel-stage');
    
    // Validate expectations
    const validations = {
      hasContent: !!result.content,
      correctAgent: !testCase.expectedAgent || agentUsed === testCase.expectedAgent,
      correctStage: !testCase.expectedStage || funnelStage === testCase.expectedStage,
      hasMetadata: !!result.metadata
    };

    // Additional validations
    if (testCase.expectCategoriesCovered !== undefined) {
      validations.categoriesCovered = result.metadata?.categoriesCovered >= testCase.expectCategoriesCovered;
    }

    const passed = Object.values(validations).every(v => v === true);
    
    if (passed) {
      testResults.summary.passed++;
      log(`✅ ${testCase.name} - PASSED`, 'PASS');
    } else {
      testResults.summary.failed++;
      log(`❌ ${testCase.name} - FAILED`, 'FAIL');
      log(`Validations: ${JSON.stringify(validations, null, 2)}`, 'DEBUG');
    }

    testResults.agentTests[agentName] = testResults.agentTests[agentName] || {};
    testResults.agentTests[agentName][testCase.name] = {
      passed,
      validations,
      response: {
        agent: agentUsed,
        stage: funnelStage,
        contentLength: result.content?.length || 0,
        metadata: result.metadata
      }
    };

    testResults.summary.total++;
    
  } catch (error) {
    testResults.summary.failed++;
    testResults.summary.errors.push({
      test: testName,
      error: error.message
    });
    log(`❌ ${testCase.name} - ERROR: ${error.message}`, 'ERROR');
    
    testResults.agentTests[agentName] = testResults.agentTests[agentName] || {};
    testResults.agentTests[agentName][testCase.name] = {
      passed: false,
      error: error.message
    };
    
    testResults.summary.total++;
  }
}

async function testFeatureFlag() {
  log('Testing ENABLE_MULTI_AGENT feature flag', 'TEST');
  
  try {
    // Test with flag enabled (current state)
    const payload = {
      messages: [{ role: 'user', content: 'Hello, test message' }],
      context: { sessionId: TEST_CONFIG.sessionId },
      stream: false
    };

    const response = await makeRequest('/api/chat/unified', payload);
    const result = await response.json();
    
    const agentUsed = response.headers.get('x-agent-used');
    const funnelStage = response.headers.get('x-funnel-stage');
    
    const flagWorking = agentUsed && funnelStage;
    
    if (flagWorking) {
      testResults.summary.passed++;
      log(`✅ Feature flag working - Agent: ${agentUsed}, Stage: ${funnelStage}`, 'PASS');
    } else {
      testResults.summary.failed++;
      log(`❌ Feature flag not working - No agent/stage headers found`, 'FAIL');
    }

    testResults.featureFlagTests['multiAgentEnabled'] = {
      passed: flagWorking,
      agentUsed,
      funnelStage,
      hasContent: !!result.content
    };
    
    testResults.summary.total++;
    
  } catch (error) {
    testResults.summary.failed++;
    testResults.summary.errors.push({
      test: 'featureFlag',
      error: error.message
    });
    log(`❌ Feature flag test failed: ${error.message}`, 'ERROR');
  }
}

async function testStreamingMode() {
  log('Testing streaming mode with multi-agent', 'TEST');
  
  try {
    const payload = {
      messages: [{ role: 'user', content: 'Hello, streaming test' }],
      context: { sessionId: TEST_CONFIG.sessionId },
      stream: true
    };

    const response = await makeRequest('/api/chat/unified', payload);
    
    const agentUsed = response.headers.get('x-agent-used');
    const funnelStage = response.headers.get('x-funnel-stage');
    const contentType = response.headers.get('content-type');
    
    const streamingWorking = contentType?.includes('text/event-stream') && agentUsed;
    
    if (streamingWorking) {
      testResults.summary.passed++;
      log(`✅ Streaming working - Agent: ${agentUsed}, Stage: ${funnelStage}`, 'PASS');
    } else {
      testResults.summary.failed++;
      log(`❌ Streaming not working properly`, 'FAIL');
    }

    testResults.apiIntegrationTests['streaming'] = {
      passed: streamingWorking,
      agentUsed,
      funnelStage,
      contentType
    };
    
    testResults.summary.total++;
    
  } catch (error) {
    testResults.summary.failed++;
    testResults.summary.errors.push({
      test: 'streaming',
      error: error.message
    });
    log(`❌ Streaming test failed: ${error.message}`, 'ERROR');
  }
}

async function testOrchestratorRouting() {
  log('Testing orchestrator routing logic', 'TEST');
  
  const routingTests = [
    {
      name: 'Discovery routing',
      context: {
        conversationFlow: {
          covered: { goals: false, pain: false, data: false, readiness: false, budget: false, success: false },
          totalUserTurns: 0
        }
      },
      expectedStage: 'DISCOVERY'
    },
    {
      name: 'Scoring routing',
      context: {
        conversationFlow: {
          covered: { goals: true, pain: true, data: true, readiness: true, budget: false, success: false },
          totalUserTurns: 8
        }
      },
      expectedStage: 'SCORING'
    }
  ];

  for (const test of routingTests) {
    try {
      const payload = {
        messages: [{ role: 'user', content: 'Test routing' }],
        context: {
          sessionId: TEST_CONFIG.sessionId,
          ...test.context
        },
        stream: false
      };

      const response = await makeRequest('/api/chat/unified', payload);
      const funnelStage = response.headers.get('x-funnel-stage');
      
      const routingCorrect = funnelStage === test.expectedStage;
      
      if (routingCorrect) {
        testResults.summary.passed++;
        log(`✅ ${test.name} - Routed to: ${funnelStage}`, 'PASS');
      } else {
        testResults.summary.failed++;
        log(`❌ ${test.name} - Expected: ${test.expectedStage}, Got: ${funnelStage}`, 'FAIL');
      }

      testResults.orchestratorTests[test.name] = {
        passed: routingCorrect,
        expected: test.expectedStage,
        actual: funnelStage
      };
      
      testResults.summary.total++;
      
    } catch (error) {
      testResults.summary.failed++;
      testResults.summary.errors.push({
        test: test.name,
        error: error.message
      });
      log(`❌ ${test.name} - ERROR: ${error.message}`, 'ERROR');
    }
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting Multi-Agent System Tests', 'START');
  log(`Session ID: ${TEST_CONFIG.sessionId}`);
  log(`Base URL: ${TEST_CONFIG.baseUrl}`);
  
  // Initialize test log
  if (TEST_CONFIG.logResults) {
    fs.writeFileSync('multiagent-test.log', '');
  }
  
  try {
    // Test feature flag first
    await testFeatureFlag();
    
    // Test streaming mode
    await testStreamingMode();
    
    // Test orchestrator routing
    await testOrchestratorRouting();
    
    // Test each agent
    for (const [agentName, testCases] of Object.entries(AGENT_TEST_CASES)) {
      log(`\n📋 Testing ${agentName.toUpperCase()} Agent`, 'SECTION');
      
      for (const testCase of testCases) {
        await testAgent(agentName, testCase);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Print summary
    log('\n📊 TEST SUMMARY', 'SUMMARY');
    log(`Total tests: ${testResults.summary.total}`);
    log(`Passed: ${testResults.summary.passed}`);
    log(`Failed: ${testResults.summary.failed}`);
    log(`Success rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);
    
    if (testResults.summary.errors.length > 0) {
      log('\n❌ ERRORS:', 'ERROR');
      testResults.summary.errors.forEach(error => {
        log(`  ${error.test}: ${error.error}`, 'ERROR');
      });
    }
    
    saveResults();
    
    if (testResults.summary.failed === 0) {
      log('\n🎉 ALL TESTS PASSED!', 'SUCCESS');
      process.exit(0);
    } else {
      log('\n💥 SOME TESTS FAILED', 'FAILURE');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n💥 TEST SUITE FAILED: ${error.message}`, 'CRITICAL');
    saveResults();
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${TEST_CONFIG.baseUrl}/api/chat/unified?action=status`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      log('✅ Server is running', 'INFO');
      return true;
    }
  } catch (error) {
    log(`❌ Server not accessible: ${error.message}`, 'ERROR');
    log('Please start the development server: pnpm dev', 'INFO');
    return false;
  }
}

// Run tests if server is available
if (require.main === module) {
  checkServer().then(serverRunning => {
    if (serverRunning) {
      runAllTests();
    } else {
      process.exit(1);
    }
  });
}

module.exports = {
  runAllTests,
  testAgent,
  testFeatureFlag,
  testStreamingMode,
  testOrchestratorRouting,
  TEST_CONFIG
};
