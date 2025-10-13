#!/usr/bin/env tsx

/**
 * Test script for log system enhancements
 * 
 * Tests:
 * 1. Git exclusion - verify log files are ignored
 * 2. Cursor AI rules - verify .cursorrules exists
 * 3. Browser capture - verify integration files exist
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import chalk from 'chalk'

console.log(chalk.bold.cyan('\n🧪 Testing Log System Enhancements\n'))

let allPassed = true

// Test 1: Git Exclusion
console.log(chalk.bold('1. Testing Git Exclusion'))
try {
  const ignoredFiles = [
    'app/api/logs/',
    'scripts/tail-logs.ts',
    'LOGGING_SETUP.md'
  ]
  
  for (const file of ignoredFiles) {
    try {
      const result = execSync(`git check-ignore ${file}`, { encoding: 'utf8' })
      if (result.trim() === file) {
        console.log(chalk.green(`   ✓ ${file} properly ignored`))
      } else {
        console.log(chalk.red(`   ✗ ${file} not ignored`))
        allPassed = false
      }
    } catch (error) {
      console.log(chalk.red(`   ✗ ${file} not ignored or doesn't exist`))
      allPassed = false
    }
  }
} catch (error) {
  console.log(chalk.red('   ✗ Git exclusion test failed'))
  allPassed = false
}

console.log('')

// Test 2: Cursor AI Rules
console.log(chalk.bold('2. Testing Cursor AI Rules'))
if (existsSync('.cursorrules')) {
  console.log(chalk.green('   ✓ .cursorrules file exists'))
  
  // Check if it contains key content
  const { readFileSync } = await import('fs')
  const content = readFileSync('.cursorrules', 'utf8')
  
  const requiredSections = [
    'Log Aggregation System',
    'pnpm logs',
    '--services=',
    '--level=',
    'Quick Access to Logs'
  ]
  
  for (const section of requiredSections) {
    if (content.includes(section)) {
      console.log(chalk.green(`   ✓ Contains "${section}"`))
    } else {
      console.log(chalk.red(`   ✗ Missing "${section}"`))
      allPassed = false
    }
  }
} else {
  console.log(chalk.red('   ✗ .cursorrules file not found'))
  allPassed = false
}

console.log('')

// Test 3: Browser Capture Integration
console.log(chalk.bold('3. Testing Browser Capture Integration'))

const browserFiles = [
  'src/lib/browser-log-capture.ts',
  'src/components/browser-log-init.tsx'
]

for (const file of browserFiles) {
  if (existsSync(file)) {
    console.log(chalk.green(`   ✓ ${file} exists`))
  } else {
    console.log(chalk.red(`   ✗ ${file} not found`))
    allPassed = false
  }
}

// Check layout.tsx integration
if (existsSync('app/layout.tsx')) {
  const { readFileSync } = await import('fs')
  const layout = readFileSync('app/layout.tsx', 'utf8')
  
  if (layout.includes('BrowserLogInit')) {
    console.log(chalk.green('   ✓ app/layout.tsx includes BrowserLogInit'))
  } else {
    console.log(chalk.red('   ✗ app/layout.tsx missing BrowserLogInit'))
    allPassed = false
  }
  
  if (layout.includes('@/components/browser-log-init')) {
    console.log(chalk.green('   ✓ app/layout.tsx imports browser-log-init'))
  } else {
    console.log(chalk.red('   ✗ app/layout.tsx missing import'))
    allPassed = false
  }
} else {
  console.log(chalk.red('   ✗ app/layout.tsx not found'))
  allPassed = false
}

// Check ingestion endpoint
if (existsSync('app/api/logs/ingest/route.ts')) {
  const { readFileSync } = await import('fs')
  const ingest = readFileSync('app/api/logs/ingest/route.ts', 'utf8')
  
  if (ingest.includes('isBrowserLog')) {
    console.log(chalk.green('   ✓ Ingestion endpoint allows browser logs'))
  } else {
    console.log(chalk.red('   ✗ Ingestion endpoint missing browser log support'))
    allPassed = false
  }
} else {
  console.log(chalk.yellow('   ⚠ Ingestion endpoint not found (might be gitignored)'))
}

console.log('')
console.log('='.repeat(60))

if (allPassed) {
  console.log(chalk.green.bold('✅ All enhancement tests passed!\n'))
  console.log(chalk.cyan('Next steps:'))
  console.log('  1. Start dev server: ' + chalk.bold('pnpm dev:with-logs'))
  console.log('  2. Open browser: ' + chalk.bold('http://localhost:3000'))
  console.log('  3. Open console and run: ' + chalk.bold('console.log("Test")'))
  console.log('  4. Watch terminal for browser logs')
  console.log('')
  console.log(chalk.cyan('Test browser capture:'))
  console.log('  ' + chalk.bold('pnpm logs --services=browser'))
  console.log('')
} else {
  console.log(chalk.red.bold('❌ Some tests failed\n'))
  console.log(chalk.yellow('Please check the output above for details'))
}

console.log('='.repeat(60))
console.log('')

