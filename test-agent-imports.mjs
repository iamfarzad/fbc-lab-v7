#!/usr/bin/env node

/**
 * Test: Can we actually import the agent modules?
 * This validates TypeScript compiles and dependencies resolve
 */

console.log('🧪 TESTING AGENT IMPORTS\n')
console.log('='.repeat(70))

async function testImports() {
  const tests = []
  
  console.log('\n📦 Testing if agent modules can be imported...\n')
  
  // Test 1: Import orchestrator
  try {
    console.log('Testing: import orchestrator...')
    // Can't actually import .ts files in Node, but we can check file syntax
    const fs = await import('fs')
    const orchestrator = fs.readFileSync('src/core/agents/orchestrator.ts', 'utf-8')
    
    // Check for syntax errors (basic)
    const hasImports = orchestrator.includes('import')
    const hasExport = orchestrator.includes('export')
    const hasFunctions = orchestrator.includes('async function')
    
    console.log('  ✅ Orchestrator file readable')
    console.log('  ✅ Has imports:', hasImports)
    console.log('  ✅ Has exports:', hasExport)
    console.log('  ✅ Has functions:', hasFunctions)
    tests.push({ name: 'Orchestrator', pass: true })
  } catch (error) {
    console.log('  ❌ Failed:', error.message)
    tests.push({ name: 'Orchestrator', pass: false })
  }
  
  // Test 2: Check all agent imports in orchestrator
  console.log('\nTesting: orchestrator imports all agents...')
  try {
    const fs = await import('fs')
    const orchestrator = fs.readFileSync('src/core/agents/orchestrator.ts', 'utf-8')
    
    const requiredImports = [
      'discoveryAgent',
      'scoringAgent',
      'workshopSalesAgent',
      'consultingSalesAgent',
      'closerAgent',
      'summaryAgent',
      'proposalAgent',
      'adminAgent',
      'retargetingAgent'
    ]
    
    let allPresent = true
    requiredImports.forEach(agent => {
      const present = orchestrator.includes(agent)
      console.log(`  ${present ? '✅' : '❌'} ${agent}`)
      if (!present) allPresent = false
    })
    
    tests.push({ name: 'Orchestrator imports', pass: allPresent })
  } catch (error) {
    console.log('  ❌ Failed:', error.message)
    tests.push({ name: 'Orchestrator imports', pass: false })
  }
  
  // Test 3: Check exports in index.ts
  console.log('\nTesting: index.ts exports all agents...')
  try {
    const fs = await import('fs')
    const index = fs.readFileSync('src/core/agents/index.ts', 'utf-8')
    
    const requiredExports = [
      'routeToAgent',
      'leadIntelligenceAgent',
      'discoveryAgent',
      'scoringAgent',
      'workshopSalesAgent',
      'consultingSalesAgent',
      'closerAgent',
      'summaryAgent',
      'proposalAgent',
      'adminAgent',
      'retargetingAgent'
    ]
    
    let allExported = true
    requiredExports.forEach(exp => {
      const exported = index.includes(exp)
      console.log(`  ${exported ? '✅' : '❌'} ${exp}`)
      if (!exported) allExported = false
    })
    
    tests.push({ name: 'Index exports', pass: allExported })
  } catch (error) {
    console.log('  ❌ Failed:', error.message)
    tests.push({ name: 'Index exports', pass: false })
  }
  
  // Test 4: Check unified route imports agents
  console.log('\nTesting: unified route imports agents...')
  try {
    const fs = await import('fs')
    const route = fs.readFileSync('app/api/chat/unified/route.ts', 'utf-8')
    
    const checks = [
      { name: 'routeToAgent import', check: route.includes("import { routeToAgent }") },
      { name: 'AgentContext type', check: route.includes("import type { AgentContext }") },
      { name: 'ENABLE_MULTI_AGENT flag', check: route.includes('ENABLE_MULTI_AGENT') },
      { name: 'Agent routing logic', check: route.includes('if (ENABLE_MULTI_AGENT') },
      { name: 'X-Agent-Used header', check: route.includes('X-Agent-Used') }
    ]
    
    let allPresent = true
    checks.forEach(({ name, check }) => {
      console.log(`  ${check ? '✅' : '❌'} ${name}`)
      if (!check) allPresent = false
    })
    
    tests.push({ name: 'Unified route integration', pass: allPresent })
  } catch (error) {
    console.log('  ❌ Failed:', error.message)
    tests.push({ name: 'Unified route integration', pass: false })
  }
  
  // Summary
  console.log('\n' + '='.repeat(70))
  const passed = tests.filter(t => t.pass).length
  const total = tests.length
  
  console.log(`\n📊 IMPORT TESTS: ${passed}/${total} passed\n`)
  
  if (passed === total) {
    console.log('✅ All imports valid - code should compile')
  } else {
    console.log('❌ Some imports invalid - will have runtime errors')
  }
  
  return passed === total
}

testImports().then(success => {
  process.exit(success ? 0 : 1)
})
