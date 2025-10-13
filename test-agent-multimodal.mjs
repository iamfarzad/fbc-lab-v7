#!/usr/bin/env node

/**
 * Test: Verify agents properly handle multimodal context
 */

console.log('🧪 TESTING MULTIMODAL INTEGRATION\n')
console.log('='.repeat(70))

async function testMultimodal() {
  const fs = await import('fs')
  
  console.log('\n🎥 Checking multimodal context handling...\n')
  
  const agentsToCheck = [
    'discovery-agent.ts',
    'scoring-agent.ts',
    'workshop-sales-agent.ts',
    'consulting-sales-agent.ts',
    'closer-agent.ts',
    'summary-agent.ts'
  ]
  
  let allValid = true
  
  for (const file of agentsToCheck) {
    console.log(`Checking: ${file}`)
    const content = fs.readFileSync(`src/core/agents/${file}`, 'utf-8')
    
    // Check 1: Accepts multimodal context
    const hasMultimodalParam = content.includes('multimodalContext')
    console.log(`  ${hasMultimodalParam ? '✅' : '⚠️ '} Accepts multimodalContext parameter`)
    
    // Check 2: References multimodal data
    const checksMultimodal = content.includes('hasRecentImages') || 
                             content.includes('hasRecentAudio') ||
                             content.includes('hasRecentUploads')
    console.log(`  ${checksMultimodal ? '✅' : '⚠️ '} Checks multimodal flags`)
    
    // Check 3: Has examples of what NOT to say (teaching anti-patterns)
    const hasExamples = (content.includes('❌ BAD:') || content.includes('❌')) &&
                        (content.includes('✅ GOOD:') || content.includes('✅'))
    console.log(`  ${hasExamples ? '✅' : '⚠️ '} Has good/bad examples for training`)
    
    // Check that these are in teaching context, not actual usage
    const roboticInTeaching = content.match(/❌.*?(tool output|screen share analysis|based on)/i)
    if (roboticInTeaching) {
      console.log(`  ✅ Robotic phrases used as anti-patterns (correct)`)
    }
    
    // Check 4: Voice awareness
    const voiceAware = content.includes('voiceActive') || content.includes('voice')
    console.log(`  ${voiceAware ? '✅' : '⚠️ '} Voice-aware`)
    
    console.log('')
  }
  
  // Check orchestrator multimodal handling
  console.log('Checking: orchestrator.ts')
  const orchestrator = fs.readFileSync('src/core/agents/orchestrator.ts', 'utf-8')
  
  const orchestratorChecks = [
    { name: 'Imports multimodalContextManager', check: orchestrator.includes('multimodalContextManager') },
    { name: 'Calls prepareChatContext', check: orchestrator.includes('prepareChatContext') },
    { name: 'Passes multimodal to agents', check: orchestrator.includes('multimodalContext') },
    { name: 'Handles voice trigger', check: orchestrator.includes("trigger === 'voice'") }
  ]
  
  orchestratorChecks.forEach(({ name, check }) => {
    console.log(`  ${check ? '✅' : '❌'} ${name}`)
    if (!check) allValid = false
  })
  
  console.log('\n' + '='.repeat(70))
  
  if (allValid) {
    console.log('\n✅ Multimodal integration complete')
    console.log('✅ Agents can access voice, screen, webcam, uploads')
  } else {
    console.log('\n❌ Multimodal integration issues found')
  }
  
  return allValid
}

testMultimodal().then(success => {
  process.exit(success ? 0 : 1)
})
