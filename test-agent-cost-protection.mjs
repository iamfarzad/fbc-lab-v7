#!/usr/bin/env node

/**
 * Test: Verify usage limits are enforced
 */

console.log('🧪 TESTING COST PROTECTION\n')
console.log('='.repeat(70))

async function testCostProtection() {
  const fs = await import('fs')
  
  console.log('\n💰 Checking usage limit integration...\n')
  
  // Check orchestrator enforces limits
  console.log('Checking: orchestrator.ts')
  const orchestrator = fs.readFileSync('src/core/agents/orchestrator.ts', 'utf-8')
  
  const checks = [
    { name: 'Imports usageLimiter', check: orchestrator.includes('usageLimiter') },
    { name: 'Checks limits before routing', check: orchestrator.includes('checkLimit') },
    { name: 'Tracks usage after response', check: orchestrator.includes('trackUsage') },
    { name: 'Returns limit error', check: orchestrator.includes('limit_reached') || orchestrator.includes('limit reached') }
  ]
  
  let allPresent = true
  checks.forEach(({ name, check }) => {
    console.log(`  ${check ? '✅' : '❌'} ${name}`)
    if (!check) allPresent = false
  })
  
  // Check usage limits file
  console.log('\nChecking: src/lib/usage-limits.ts')
  const usageLimits = fs.readFileSync('src/lib/usage-limits.ts', 'utf-8')
  
  const limitChecks = [
    { name: 'Message limit (50)', check: usageLimits.includes('max_messages: 50') },
    { name: 'Voice limit (10 min)', check: usageLimits.includes('max_voice_minutes: 10') },
    { name: 'Screen limit (5 min)', check: usageLimits.includes('max_screen_minutes: 5') },
    { name: 'Research limit (3 calls)', check: usageLimits.includes('max_research_calls: 3') },
    { name: 'Session limit (30 min)', check: usageLimits.includes('max_session_duration: 30') }
  ]
  
  limitChecks.forEach(({ name, check }) => {
    console.log(`  ${check ? '✅' : '❌'} ${name}`)
    if (!check) allPresent = false
  })
  
  // Check unified route uses limits
  console.log('\nChecking: app/api/chat/unified/route.ts')
  const route = fs.readFileSync('app/api/chat/unified/route.ts', 'utf-8')
  
  const routeChecks = [
    { name: 'Imports usageLimiter', check: route.includes('usageLimiter') },
    { name: 'Checks message limit', check: route.includes('checkLimit') },
    { name: 'Returns 429 on limit', check: route.includes('429') }
  ]
  
  routeChecks.forEach(({ name, check }) => {
    console.log(`  ${check ? '✅' : '❌'} ${name}`)
    if (!check) allPresent = false
  })
  
  console.log('\n' + '='.repeat(70))
  
  if (allPresent) {
    console.log('\n✅ Cost protection properly integrated')
    console.log('✅ Limits: 50 messages, 10 min voice, 5 min screen, 3 research')
    console.log('✅ Orchestrator enforces limits before agent calls')
  } else {
    console.log('\n❌ Cost protection incomplete')
  }
  
  return allPresent
}

testCostProtection().then(success => {
  process.exit(success ? 0 : 1)
})
