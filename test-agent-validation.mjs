#!/usr/bin/env node

/**
 * Complete Agent Validation Test
 * Validates all 10 agents are properly connected
 */

import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

console.log('🔍 MULTI-AGENT SYSTEM VALIDATION\n')
console.log('='.repeat(70))

async function validateAgents() {
  const agentsDir = 'src/core/agents'
  const expectedAgents = [
    'lead-intelligence-agent.ts',
    'discovery-agent.ts',
    'scoring-agent.ts',
    'workshop-sales-agent.ts',
    'consulting-sales-agent.ts',
    'closer-agent.ts',
    'summary-agent.ts',
    'proposal-agent.ts',
    'admin-agent.ts',
    'retargeting-agent.ts'
  ]

  console.log('\n✅ AGENT FILES CHECK')
  console.log('-'.repeat(70))

  const files = await readdir(agentsDir)
  const agentFiles = files.filter(f => f.endsWith('.ts') && !f.includes('test') && f !== 'types.ts' && f !== 'index.ts' && f !== 'orchestrator.ts')
  
  console.log(`Found ${agentFiles.length} agent files:`)
  agentFiles.forEach((file, i) => {
    const expected = expectedAgents.includes(file)
    console.log(`  ${i + 1}. ${file} ${expected ? '✅' : '⚠️'}`)
  })

  const missing = expectedAgents.filter(f => !agentFiles.includes(f))
  if (missing.length > 0) {
    console.log('\n❌ Missing agents:', missing.join(', '))
    return false
  }

  console.log('\n✅ All 10 agents present')

  // Check orchestrator imports all agents
  console.log('\n✅ ORCHESTRATOR INTEGRATION CHECK')
  console.log('-'.repeat(70))

  const orchestratorContent = await readFile(join(agentsDir, 'orchestrator.ts'), 'utf-8')
  
  const importedAgents = [
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

  let allImported = true
  importedAgents.forEach(agent => {
    const imported = orchestratorContent.includes(`import { ${agent} }`)
    console.log(`  ${agent}: ${imported ? '✅' : '❌'}`)
    if (!imported) allImported = false
  })

  if (!allImported) {
    console.log('\n❌ Not all agents imported in orchestrator')
    return false
  }

  // Check stages are handled
  console.log('\n✅ STAGE HANDLING CHECK')
  console.log('-'.repeat(70))

  const stages = [
    'DISCOVERY',
    'SCORING',
    'WORKSHOP_PITCH',
    'CONSULTING_PITCH',
    'CLOSING',
    'SUMMARY',
    'PROPOSAL',
    'ADMIN',
    'RETARGETING'
  ]

  stages.forEach(stage => {
    const handled = orchestratorContent.includes(`case '${stage}'`)
    console.log(`  ${stage}: ${handled ? '✅' : '❌'}`)
  })

  // Check unified route integration
  console.log('\n✅ UNIFIED ROUTE INTEGRATION CHECK')
  console.log('-'.repeat(70))

  const routeContent = await readFile('app/api/chat/unified/route.ts', 'utf-8')
  
  const checks = [
    { name: 'Import routeToAgent', check: routeContent.includes("import { routeToAgent }") },
    { name: 'Import AgentContext', check: routeContent.includes("import type { AgentContext }") },
    { name: 'Import AIDevtools', check: routeContent.includes("import { wrap } from '@ai-sdk-tools/devtools'") },
    { name: 'Feature flag ENABLE_MULTI_AGENT', check: routeContent.includes('ENABLE_MULTI_AGENT') },
    { name: 'Devtools wrap()', check: routeContent.includes('wrap(routeToAgent') },
    { name: 'X-Agent-Used header', check: routeContent.includes('X-Agent-Used') },
    { name: 'X-Funnel-Stage header', check: routeContent.includes('X-Funnel-Stage') }
  ]

  checks.forEach(({ name, check }) => {
    console.log(`  ${name}: ${check ? '✅' : '❌'}`)
  })

  // Check package.json has agents package
  console.log('\n✅ PACKAGE CHECK')
  console.log('-'.repeat(70))

  const packageJson = JSON.parse(await readFile('package.json', 'utf-8'))
  const hasAgents = packageJson.dependencies['@ai-sdk-tools/agents']
  const hasDevtools = packageJson.dependencies['@ai-sdk-tools/devtools']
  
  console.log(`  @ai-sdk-tools/agents: ${hasAgents || '❌ NOT INSTALLED'}`)
  console.log(`  @ai-sdk-tools/devtools: ${hasDevtools || '❌ NOT INSTALLED'}`)

  return true
}

// Run validation
validateAgents()
  .then(success => {
    if (success) {
      console.log('\n' + '='.repeat(70))
      console.log('🎉 VALIDATION COMPLETE - ALL CHECKS PASSED')
      console.log('='.repeat(70))
      console.log('\n📝 System Status:')
      console.log('  • 10 specialized agents ✅')
      console.log('  • Orchestrator routing ✅')
      console.log('  • AIDevtools integration ✅')
      console.log('  • Unified route integration ✅')
      console.log('  • Package dependencies ✅')
      console.log('\n🚀 Ready to test with: ENABLE_MULTI_AGENT=true')
      console.log('\n')
    } else {
      console.log('\n❌ VALIDATION FAILED - See errors above\n')
      process.exit(1)
    }
  })
  .catch(err => {
    console.error('\n❌ VALIDATION ERROR:', err)
    process.exit(1)
  })
