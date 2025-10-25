#!/usr/bin/env tsx

/**
 * Test script for the workflow system
 * This script tests the workflow engine and functions
 */

import { WorkflowEngine } from '../lib/workflow/engine'

async function testWorkflow() {
  console.log('🧪 Testing workflow system...')
  
  try {
    // Test 1: Basic workflow execution
    console.log('\n1. Testing basic workflow execution...')
    
    const workflow = new WorkflowEngine('fbc-sales-funnel')
    
    const result = await workflow.execute({
      sessionId: 'test-session-123',
      messages: [
        {
          role: 'user',
          content: 'Hello, I need help with AI implementation for my company',
          timestamp: new Date().toISOString(),
          modality: 'text'
        }
      ],
      multimodalContext: {
        hasRecentImages: false,
        hasRecentAudio: false,
        hasRecentUploads: false,
        recentAnalyses: [],
        recentUploads: []
      },
      intelligenceContext: {
        name: 'Test Lead',
        company: {
          name: 'Test Company',
          industry: 'Technology',
          size: '50-200 employees'
        },
        person: {
          role: 'CTO',
          seniority: 'C-level'
        }
      },
      conversationFlow: {
        covered: {
          goals: false,
          pain: false,
          data: false,
          readiness: false,
          budget: false,
          success: false
        },
        totalUserTurns: 1,
        recommendedNext: 'goals'
      },
      voiceActive: false,
      timestamp: new Date().toISOString(),
      requestId: 'test-' + Date.now()
    })
    
    console.log('✅ Basic workflow execution successful')
    console.log('   Agent:', result.agent)
    console.log('   Stage:', result.metadata.stage)
    console.log('   Output length:', result.output.length)
    
    // Test 2: Discovery agent
    console.log('\n2. Testing discovery agent...')
    
    const discoveryResult = await workflow.execute({
      sessionId: 'test-session-456',
      messages: [
        {
          role: 'user',
          content: 'We want to improve our data analysis processes',
          timestamp: new Date().toISOString(),
          modality: 'text'
        }
      ],
      multimodalContext: {
        hasRecentImages: false,
        hasRecentAudio: false,
        hasRecentUploads: false,
        recentAnalyses: [],
        recentUploads: []
      },
      intelligenceContext: {
        name: 'Discovery Test Lead',
        company: {
          name: 'Discovery Test Company',
          industry: 'Finance',
          size: '100-500 employees'
        },
        person: {
          role: 'Data Manager',
          seniority: 'Manager'
        }
      },
      conversationFlow: {
        covered: {
          goals: true,
          pain: false,
          data: false,
          readiness: false,
          budget: false,
          success: false
        },
        totalUserTurns: 2,
        recommendedNext: 'pain'
      },
      voiceActive: false,
      timestamp: new Date().toISOString(),
      requestId: 'test-discovery-' + Date.now()
    })
    
    console.log('✅ Discovery agent test successful')
    console.log('   Agent:', discoveryResult.agent)
    console.log('   Stage:', discoveryResult.metadata.stage)
    console.log('   Categories covered:', discoveryResult.metadata.categoriesCovered)
    
    // Test 3: Scoring agent
    console.log('\n3. Testing scoring agent...')
    
    const scoringResult = await workflow.execute({
      sessionId: 'test-session-789',
      messages: [
        {
          role: 'user',
          content: 'We have a budget of $50K and need this implemented by Q2',
          timestamp: new Date().toISOString(),
          modality: 'text'
        }
      ],
      multimodalContext: {
        hasRecentImages: false,
        hasRecentAudio: false,
        hasRecentUploads: false,
        recentAnalyses: [],
        recentUploads: []
      },
      intelligenceContext: {
        name: 'Scoring Test Lead',
        company: {
          name: 'Scoring Test Company',
          industry: 'Healthcare',
          size: '500+ employees'
        },
        person: {
          role: 'VP of Technology',
          seniority: 'VP'
        }
      },
      conversationFlow: {
        covered: {
          goals: true,
          pain: true,
          data: true,
          readiness: true,
          budget: false,
          success: false
        },
        totalUserTurns: 8,
        recommendedNext: 'budget'
      },
      voiceActive: false,
      timestamp: new Date().toISOString(),
      requestId: 'test-scoring-' + Date.now()
    })
    
    console.log('✅ Scoring agent test successful')
    console.log('   Agent:', scoringResult.agent)
    console.log('   Stage:', scoringResult.metadata.stage)
    console.log('   Lead Score:', scoringResult.metadata.leadScore)
    console.log('   Fit Score:', scoringResult.metadata.fitScore)
    
    // Test 4: Error handling
    console.log('\n4. Testing error handling...')
    
    try {
      await workflow.execute({
        sessionId: 'test-session-error',
        messages: [],
        multimodalContext: {
          hasRecentImages: false,
          hasRecentAudio: false,
          hasRecentUploads: false,
          recentAnalyses: [],
          recentUploads: []
        },
        intelligenceContext: {},
        conversationFlow: {},
        voiceActive: false,
        timestamp: new Date().toISOString(),
        requestId: 'test-error-' + Date.now()
      })
      
      console.log('❌ Error handling test failed - should have thrown an error')
    } catch (error) {
      console.log('✅ Error handling test successful')
      console.log('   Error caught:', error instanceof Error ? error.message : 'Unknown error')
    }
    
    console.log('\n🎉 All workflow tests passed!')
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error)
    process.exit(1)
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testWorkflow()
}

export { testWorkflow }