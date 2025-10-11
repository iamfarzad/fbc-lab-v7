#!/usr/bin/env node

/**
 * Runtime Simulation Test - Tests agent logic without starting dev server
 * Simulates what would happen when agents are called
 */

console.log('🧪 AGENT RUNTIME SIMULATION TEST\n')
console.log('='.repeat(70))

// Simulate the orchestrator logic
function simulateAgentCall(scenario) {
  const { messages, context, expectedAgent, expectedStage } = scenario
  
  // Simulate stage determination
  const stage = determineFunnelStage({
    conversationFlow: context.conversationFlow,
    intelligenceContext: context.intelligenceContext,
    trigger: context.trigger || 'chat'
  })
  
  // Determine which agent would be called
  let agentName = 'Unknown'
  
  switch (stage) {
    case 'DISCOVERY':
      agentName = 'Discovery Agent'
      break
    case 'SCORING':
      agentName = 'Scoring Agent'
      break
    case 'WORKSHOP_PITCH':
      agentName = 'Workshop Sales Agent'
      break
    case 'CONSULTING_PITCH':
      agentName = 'Consulting Sales Agent'
      break
    case 'CLOSING':
      agentName = 'Closer Agent'
      break
    case 'SUMMARY':
      agentName = 'Summary Agent'
      break
    case 'PROPOSAL':
      agentName = 'Proposal Agent'
      break
    case 'ADMIN':
      agentName = 'Admin Agent'
      break
    case 'RETARGETING':
      agentName = 'Retargeting Agent'
      break
  }
  
  return { stage, agentName }
}

function determineFunnelStage({ conversationFlow, intelligenceContext, trigger }) {
  if (trigger === 'admin') return 'ADMIN'
  if (trigger === 'conversation_end') return 'SUMMARY'
  if (trigger === 'proposal_request') return 'PROPOSAL'
  if (trigger === 'retargeting') return 'RETARGETING'

  if (!conversationFlow || Object.values(conversationFlow.covered).filter(Boolean).length < 4) {
    return 'DISCOVERY'
  }

  if (!intelligenceContext?.fitScore) {
    return 'SCORING'
  }

  // Check CLOSING first - if pitch delivered but no booking
  if (intelligenceContext.pitchDelivered && !intelligenceContext.calendarBooked) {
    return 'CLOSING'
  }

  const { workshop, consulting } = intelligenceContext.fitScore
  
  // Then check pitch stages
  if (workshop > consulting && workshop > 0.7) {
    return 'WORKSHOP_PITCH'
  }
  if (consulting > workshop && consulting > 0.7) {
    return 'CONSULTING_PITCH'
  }

  // Low fit scores, go back to discovery
  if (workshop < 0.7 && consulting < 0.7) {
    return 'DISCOVERY'
  }

  return 'DISCOVERY'
}

// Test scenarios
const scenarios = [
  {
    name: 'First message - Cold lead',
    messages: [{ role: 'user', content: 'What do you do?' }],
    context: {
      conversationFlow: {
        covered: { goals: false, pain: false, data: false, readiness: false, budget: false, success: false }
      },
      intelligenceContext: {}
    },
    expectedAgent: 'Discovery Agent',
    expectedStage: 'DISCOVERY'
  },
  {
    name: 'After 4 categories - Needs scoring',
    messages: [{ role: 'user', content: 'We need this in Q2' }],
    context: {
      conversationFlow: {
        covered: { goals: true, pain: true, data: true, readiness: true, budget: false, success: false }
      },
      intelligenceContext: {}
    },
    expectedAgent: 'Scoring Agent',
    expectedStage: 'SCORING'
  },
  {
    name: 'Mid-market manager - Workshop fit',
    messages: [{ role: 'user', content: 'Tell me more' }],
    context: {
      conversationFlow: {
        covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: false }
      },
      intelligenceContext: {
        role: 'Manager',
        fitScore: { workshop: 0.9, consulting: 0.2 }
      }
    },
    expectedAgent: 'Workshop Sales Agent',
    expectedStage: 'WORKSHOP_PITCH'
  },
  {
    name: 'C-level enterprise - Consulting fit',
    messages: [{ role: 'user', content: 'Sounds interesting' }],
    context: {
      conversationFlow: {
        covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: true }
      },
      intelligenceContext: {
        role: 'CTO',
        fitScore: { workshop: 0.3, consulting: 0.95 }
      }
    },
    expectedAgent: 'Consulting Sales Agent',
    expectedStage: 'CONSULTING_PITCH'
  },
  {
    name: 'Pitched but no booking - Close needed',
    messages: [{ role: 'user', content: 'Seems expensive' }],
    context: {
      conversationFlow: {
        covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: true }
      },
      intelligenceContext: {
        role: 'Manager',
        fitScore: { workshop: 0.8, consulting: 0.3 },
        pitchDelivered: true,
        calendarBooked: false
      }
    },
    expectedAgent: 'Closer Agent',
    expectedStage: 'CLOSING'
  },
  {
    name: 'Conversation ending - Summary needed',
    messages: [{ role: 'user', content: 'Thanks, goodbye' }],
    context: {
      trigger: 'conversation_end',
      conversationFlow: {
        covered: { goals: true, pain: true, data: true, readiness: true, budget: true, success: true }
      }
    },
    expectedAgent: 'Summary Agent',
    expectedStage: 'SUMMARY'
  },
  {
    name: 'Admin query - Farzad asking',
    messages: [{ role: 'user', content: 'Show me healthcare leads' }],
    context: {
      trigger: 'admin'
    },
    expectedAgent: 'Admin Agent',
    expectedStage: 'ADMIN'
  }
]

console.log('\n📊 RUNNING SIMULATIONS...\n')

let passed = 0
let failed = 0

scenarios.forEach((scenario, i) => {
  console.log(`Test ${i + 1}: ${scenario.name}`)
  
  const result = simulateAgentCall(scenario)
  
  const stageMatch = result.stage === scenario.expectedStage
  const agentMatch = result.agentName === scenario.expectedAgent
  
  if (stageMatch && agentMatch) {
    console.log(`  ✅ Stage: ${result.stage}`)
    console.log(`  ✅ Agent: ${result.agentName}`)
    passed++
  } else {
    console.log(`  ❌ Stage: ${result.stage} (expected: ${scenario.expectedStage})`)
    console.log(`  ❌ Agent: ${result.agentName} (expected: ${scenario.expectedAgent})`)
    failed++
  }
  console.log('')
})

console.log('='.repeat(70))
console.log(`\n📊 RESULTS: ${passed}/${scenarios.length} scenarios passed`)

if (failed > 0) {
  console.log(`\n⚠️  ${failed} scenarios failed - logic bugs present`)
  console.log('These need fixing before deployment')
} else {
  console.log('\n✅ All routing logic working correctly')
}

console.log('\n⚠️  NOTE: This only tests ROUTING LOGIC')
console.log('Real agent API calls to Gemini not tested (requires dev server)')
console.log('\n🔧 To test real agents:')
console.log('  1. Set ENABLE_MULTI_AGENT=true in .env.local')
console.log('  2. Run: pnpm dev')
console.log('  3. Open browser and chat')
console.log('  4. Check console for actual agent responses')
console.log('')

process.exit(failed > 0 ? 1 : 0)
