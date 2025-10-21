#!/usr/bin/env node
// Summarize exported session JSON/JSONL files: counts of events, first/last timestamps, and any errors.
// Usage: node scripts/summarize-session.js <file1> [file2 ...]

const fs = require('fs')
const path = require('path')

function parseLines(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const items = []
  for (const line of lines) {
    try { items.push(JSON.parse(line)) } catch { /* ignore */ }
  }
  return items
}

function summarizeOne(obj, label) {
  const stats = {
    label,
    totalMessages: 0,
    roles: {},
    hasAudio: false,
    toolCalls: 0,
    errors: 0,
    firstTs: null,
    lastTs: null,
  }

  const messages = Array.isArray(obj) ? obj : (Array.isArray(obj?.messages) ? obj.messages : [])
  stats.totalMessages = messages.length
  for (const m of messages) {
    const role = m.role || m.metadata?.role || 'unknown'
    stats.roles[role] = (stats.roles[role] || 0) + 1
    if (m.metadata?.images || m.metadata?.audioData) stats.hasAudio = true
    if (m.metadata?.toolCalls || m.metadata?.toolCall) stats.toolCalls++
    if (m.metadata?.error || m.error) stats.errors++
    const ts = (typeof m.timestamp === 'string' || typeof m.timestamp === 'number') ? new Date(m.timestamp).getTime() : null
    if (ts && !isNaN(ts)) {
      if (stats.firstTs === null || ts < stats.firstTs) stats.firstTs = ts
      if (stats.lastTs === null || ts > stats.lastTs) stats.lastTs = ts
    }
  }
  return stats
}

function formatTs(ms) {
  if (!ms) return 'n/a'
  const d = new Date(ms)
  return d.toISOString()
}

async function main() {
  const files = process.argv.slice(2)
  if (files.length === 0) {
    console.error('Usage: node scripts/summarize-session.js <file1> [file2 ...]')
    process.exit(1)
  }

  for (const file of files) {
    try {
      const text = fs.readFileSync(file, 'utf8')
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = parseLines(text)
      }
      const stats = summarizeOne(parsed, path.basename(file))
      console.log(`\n=== ${stats.label} ===`)
      console.log(`Messages: ${stats.totalMessages}`)
      console.log(`Roles: ${Object.entries(stats.roles).map(([k,v]) => `${k}:${v}`).join(', ') || 'n/a'}`)
      console.log(`Tool calls: ${stats.toolCalls}, Errors: ${stats.errors}, Has audio/images: ${stats.hasAudio}`)
      console.log(`First: ${formatTs(stats.firstTs)} | Last: ${formatTs(stats.lastTs)}`)
    } catch (e) {
      console.error(`Failed to summarize ${file}:`, e.message)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

