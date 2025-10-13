#!/usr/bin/env tsx
import { spawn } from 'child_process'
import chalk from 'chalk'

const collectors = [
  { name: 'Local Files', script: 'scripts/log-collectors/local.ts' },
  { name: 'Fly.io', script: 'scripts/log-collectors/fly-io.ts' },
  { name: 'Vercel', script: 'scripts/log-collectors/vercel.ts' },
  { name: 'Gemini', script: 'scripts/log-collectors/gemini.ts' },
  { name: 'Resend', script: 'scripts/log-collectors/resend.ts' },
  { name: 'Supabase', script: 'scripts/log-collectors/supabase.ts' }
]

console.log(chalk.bold.cyan('\n🚀 Starting Log Collectors\n'))

const processes: any[] = []

for (const collector of collectors) {
  console.log(chalk.gray(`  Starting ${collector.name}...`))
  
  const proc = spawn('tsx', [collector.script], {
    stdio: 'inherit',
    env: { ...process.env }
  })

  proc.on('error', (err) => {
    console.error(chalk.red(`  ✗ ${collector.name} failed to start:`), err)
  })

  proc.on('exit', (code) => {
    if (code !== 0) {
      console.log(chalk.yellow(`  ⚠ ${collector.name} exited with code ${code}`))
    }
  })

  processes.push({ name: collector.name, proc })
}

console.log(chalk.green('\n✓ All collectors started\n'))
console.log(chalk.gray('Press Ctrl+C to stop all collectors\n'))

// Handle shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🛑 Stopping all collectors...\n'))
  
  for (const { name, proc } of processes) {
    console.log(chalk.gray(`  Stopping ${name}...`))
    proc.kill('SIGINT')
  }

  setTimeout(() => {
    console.log(chalk.green('\n✓ All collectors stopped\n'))
    process.exit(0)
  }, 1000)
})

process.on('SIGTERM', () => {
  for (const { proc } of processes) {
    proc.kill('SIGTERM')
  }
  process.exit(0)
})

// Keep process alive
setInterval(() => {}, 1000)

