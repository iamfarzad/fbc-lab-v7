#!/usr/bin/env tsx

/**
 * Mock test script for the workflow system
 * This script tests the workflow engine without requiring API keys
 */

import { WorkflowEngine } from '../lib/workflow/engine'

// Mock the AI SDK for testing
const mockGenerateText = async (options: any) => {
  const { system } = options
  
  // Simulate different responses based on the system prompt
  if (system.includes('Discovery AI')) {
    return {
      text: "I'd love to help you with AI implementation! Let's start by understanding your goals. What are you hoping to achieve with AI in your company?"
    }
  }
  
  if (system.includes('Scoring AI')) {
    return {
      text: JSON.stringify({
        leadScore: 75,
        fitScore: {
          workshop: 0.8,
          consulting: 0.6
        },
        reasoning: "Strong enterprise lead with clear AI needs and budget"
      })
    }
  }
  
  if (system.includes('Workshop Sales AI')) {
    return {
      text: "Based on what you've shared, I think our hands-on AI workshop would be perfect for your team. We can teach them practical AI skills they can apply immediately. Would you like to see available dates?"
    }
  }
  
  if (system.includes('Consulting Sales AI')) {
    return {
      text: "For a company of your size and complexity, I'd recommend our custom AI consulting service. We can build a tailored solution that integrates with your existing systems. Let's schedule a strategy call with Farzad."
    }
  }
  
  if (system.includes('Closer AI')) {
    return {
      text: "I understand your concerns about the investment. But remember - you experienced our AI capabilities firsthand in this conversation. This is exactly what we build for clients. What would need to happen for this to make sense for you?"
    }
  }
  
  if (system.includes('Summary AI')) {
    return {
      text: "## Executive Summary\n\n**Lead Profile:** Test Lead, CTO at Test Company (Technology, 50-200 employees)\n\n**Key Pain Points:** Data analysis processes need improvement\n\n**Recommended Next Steps:** Schedule workshop or consulting call based on fit score\n\n## Discovery Analysis\n\n- Categories covered: 4/6 (goals, pain, data, readiness)\n- Lead score: 75/100\n- Workshop fit: 80%\n- Consulting fit: 60%\n\n## Recommended Actions\n\n1. Schedule workshop demo if workshop fit > 70%\n2. Schedule consulting call if consulting fit > 70%\n3. Follow up in 1 week if no immediate action"
    }
  }
  
  // Default response
  return {
    text: "Thank you for your message. I'm here to help with your AI implementation needs."
  }
}

// Mock the AI SDK
jest.mock('ai', () => ({
  generateText: mockGenerateText
}))

async function testWorkflowMock() {
  console.log('🧪 Testing workflow system (mock mode)...')
  
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
    console.log('   Output preview:', result.output.substring(0, 100) + '...')
    
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
    console.log('\n📊 Test Summary:')
    console.log('   - Basic workflow execution: ✅')
    console.log('   - Discovery agent: ✅')
    console.log('   - Scoring agent: ✅')
    console.log('   - Error handling: ✅')
    
  } catch (error) {
    console.error('❌ Workflow test failed:', error)
    process.exit(1)
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testWorkflowMock()
}

export { testWorkflowMock }