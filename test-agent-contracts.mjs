#!/usr/bin/env node

/**
 * Test: Verify agent function signatures and return contracts
 */

console.log('🧪 TESTING AGENT CONTRACTS\n')
console.log('='.repeat(70))

async function testContracts() {
  const fs = await import('fs')
  
  console.log('\n📋 Checking agent function contracts...\n')
  
  const agentSpecs = [
    {
      file: 'discovery-agent.ts',
      expectedParams: ['messages', 'context'],
      expectedReturn: ['output', 'agent', 'model', 'metadata']
    },
    {
      file: 'scoring-agent.ts',
      expectedParams: ['messages', 'context'],
      expectedReturn: ['output', 'agent', 'model', 'metadata']
    },
    {
      file: 'workshop-sales-agent.ts',
      expectedParams: ['messages', 'context'],
      expectedReturn: ['output', 'agent', 'model', 'metadata']
    },
    {
      file: 'consulting-sales-agent.ts',
      expectedParams: ['messages', 'context'],
      expectedReturn: ['output', 'agent', 'model', 'metadata']
    },
    {
      file: 'closer-agent.ts',
      expectedParams: ['messages', 'context'],
      expectedReturn: ['output', 'agent', 'model', 'metadata']
    },
    {
      file: 'summary-agent.ts',
      expectedParams: ['messages', 'context'],
      expectedReturn: ['output', 'agent', 'model', 'metadata']
    }
  ]
  
  let allValid = true
  
  for (const spec of agentSpecs) {
    console.log(`Testing: ${spec.file}`)
    const content = fs.readFileSync(`src/core/agents/${spec.file}`, 'utf-8')
    
    // Check parameters
    const hasParams = spec.expectedParams.every(param => 
      content.includes(param + ':') || content.includes(`${param},`)
    )
    console.log(`  ${hasParams ? '✅' : '❌'} Parameters: ${spec.expectedParams.join(', ')}`)
    if (!hasParams) allValid = false
    
    // Check return properties
    const hasReturn = spec.expectedReturn.every(prop => 
      content.includes(`${prop}:`)
    )
    console.log(`  ${hasReturn ? '✅' : '❌'} Returns: ${spec.expectedReturn.join(', ')}`)
    if (!hasReturn) allValid = false
    
    // Check uses correct AI SDK
    const usesAI = content.includes('generateText') || content.includes('streamText')
    console.log(`  ${usesAI ? '✅' : '❌'} Uses AI SDK`)
    if (!usesAI) allValid = false
    
    // Check uses correct model
    const usesGemini = content.includes("google('gemini")
    console.log(`  ${usesGemini ? '✅' : '❌'} Uses Gemini model`)
    if (!usesGemini) allValid = false
    
    console.log('')
  }
  
  console.log('='.repeat(70))
  
  if (allValid) {
    console.log('\n✅ All agent contracts valid')
    console.log('✅ Function signatures match expected interface')
  } else {
    console.log('\n❌ Contract violations found')
  }
  
  return allValid
}

testContracts().then(success => {
  process.exit(success ? 0 : 1)
})
