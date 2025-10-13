#!/usr/bin/env node

/**
 * Test: Check all dependencies agents use are available
 */

console.log('🧪 TESTING AGENT DEPENDENCIES\n')
console.log('='.repeat(70))

async function testDependencies() {
  const fs = await import('fs')
  
  console.log('\n📦 Checking required packages...\n')
  
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  
  const requiredPackages = [
    { name: '@ai-sdk-tools/agents', version: deps['@ai-sdk-tools/agents'], required: true },
    { name: '@ai-sdk-tools/devtools', version: deps['@ai-sdk-tools/devtools'], required: true },
    { name: '@ai-sdk-tools/artifacts', version: deps['@ai-sdk-tools/artifacts'], required: true },
    { name: '@ai-sdk/google', version: deps['@ai-sdk/google'], required: true },
    { name: 'ai', version: deps['ai'], required: true },
    { name: 'zod', version: deps['zod'], required: true }
  ]
  
  let allPresent = true
  
  requiredPackages.forEach(pkg => {
    if (pkg.version) {
      console.log(`  ✅ ${pkg.name}: ${pkg.version}`)
    } else {
      console.log(`  ❌ ${pkg.name}: NOT INSTALLED`)
      if (pkg.required) allPresent = false
    }
  })
  
  // Check if packages are actually in node_modules
  console.log('\n📦 Checking node_modules...\n')
  
  const packagesToCheck = [
    '@ai-sdk-tools/agents',
    '@ai-sdk-tools/devtools',
    '@ai-sdk/google',
    'ai'
  ]
  
  packagesToCheck.forEach(pkg => {
    const path = `node_modules/${pkg}`
    const exists = fs.existsSync(path)
    console.log(`  ${exists ? '✅' : '❌'} ${pkg}`)
    if (!exists) allPresent = false
  })
  
  // Check agent dependencies
  console.log('\n📦 Checking agent file dependencies...\n')
  
  const agents = [
    'discovery-agent.ts',
    'scoring-agent.ts',
    'workshop-sales-agent.ts',
    'consulting-sales-agent.ts',
    'closer-agent.ts',
    'summary-agent.ts'
  ]
  
  agents.forEach(agent => {
    const content = fs.readFileSync(`src/core/agents/${agent}`, 'utf-8')
    const imports = []
    
    if (content.includes("from 'ai'")) imports.push('ai')
    if (content.includes("from '@ai-sdk/google'")) imports.push('@ai-sdk/google')
    if (content.includes("from 'zod'")) imports.push('zod')
    if (content.includes("from './types'")) imports.push('./types')
    
    console.log(`  ${agent}:`)
    imports.forEach(imp => console.log(`    → ${imp}`))
  })
  
  console.log('\n' + '='.repeat(70))
  
  if (allPresent) {
    console.log('\n✅ All dependencies present and accounted for')
    console.log('✅ Agents should be able to import required packages')
  } else {
    console.log('\n❌ Missing dependencies - will fail at runtime')
  }
  
  return allPresent
}

testDependencies().then(success => {
  process.exit(success ? 0 : 1)
})
