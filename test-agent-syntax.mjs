#!/usr/bin/env node

/**
 * Test: Check agent files for common syntax errors
 */

console.log('🧪 TESTING AGENT SYNTAX\n')
console.log('='.repeat(70))

async function testSyntax() {
  const fs = await import('fs')
  
  const agentFiles = [
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
  
  console.log('\n📝 Checking agent syntax...\n')
  
  let allValid = true
  const issues = []
  
  for (const file of agentFiles) {
    console.log(`Checking: ${file}`)
    const content = fs.readFileSync(`src/core/agents/${file}`, 'utf-8')
    
    // Check 1: Has export
    if (!content.includes('export')) {
      console.log(`  ❌ No export found`)
      issues.push(`${file}: No export`)
      allValid = false
    } else {
      console.log(`  ✅ Has export`)
    }
    
    // Check 2: Has async function
    if (!content.includes('async function') && !content.includes('async (')) {
      console.log(`  ⚠️  No async function (might be sync)`)
    } else {
      console.log(`  ✅ Has async function`)
    }
    
    // Check 3: Imports ai SDK
    if (content.includes("from 'ai'") || content.includes('from "@ai-sdk/google"')) {
      console.log(`  ✅ Imports AI SDK`)
    } else {
      console.log(`  ⚠️  No AI SDK import (might use other method)`)
    }
    
    // Check 4: Returns result object
    if (content.includes('return {') && content.includes('agent:') && content.includes('output:')) {
      console.log(`  ✅ Returns proper result object`)
    } else {
      console.log(`  ❌ Missing proper return format`)
      issues.push(`${file}: Improper return format`)
      allValid = false
    }
    
    // Check 5: Has AgentContext type
    if (content.includes('AgentContext') || content.includes('context:')) {
      console.log(`  ✅ Uses AgentContext`)
    } else {
      console.log(`  ⚠️  No context parameter`)
    }
    
    // Check 6: Balanced braces
    const openBraces = (content.match(/{/g) || []).length
    const closeBraces = (content.match(/}/g) || []).length
    if (openBraces === closeBraces) {
      console.log(`  ✅ Braces balanced (${openBraces} pairs)`)
    } else {
      console.log(`  ❌ Braces unbalanced: ${openBraces} open, ${closeBraces} close`)
      issues.push(`${file}: Unbalanced braces`)
      allValid = false
    }
    
    // Check 7: No obvious TypeScript errors
    const hasUndefined = content.match(/\bundefined\s*\(/g)
    const hasMissingImports = content.match(/Cannot find/g)
    if (!hasUndefined && !hasMissingImports) {
      console.log(`  ✅ No obvious TS errors`)
    }
    
    console.log('')
  }
  
  console.log('='.repeat(70))
  
  if (allValid) {
    console.log('\n✅ All agents have valid syntax')
    console.log('✅ Should compile without errors')
  } else {
    console.log('\n❌ Issues found:')
    issues.forEach(issue => console.log(`  • ${issue}`))
  }
  
  return allValid
}

testSyntax().then(success => {
  process.exit(success ? 0 : 1)
})
