#!/usr/bin/env node

/**
 * Query Supabase for activity evidence from October 6-8, 2025
 * Searches for voice, webcam, and screenshare usage timestamps
 */

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local and .env.production manually
function loadEnvFile(filePath) {
  try {
    const envContent = readFileSync(filePath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...values] = trimmed.split('=')
        if (key) {
          const value = values.join('=').trim().replace(/^["']|["']$/g, '')
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value
          }
        }
      }
    })
    return true
  } catch (error) {
    return false
  }
}

// Try loading from multiple env files
const envFiles = ['.env.local', '.env.production', '.env']
let loaded = false
for (const file of envFiles) {
  const envPath = join(__dirname, '..', file)
  if (loadEnvFile(envPath)) {
    console.log(`✅ Loaded env from ${file}`)
    loaded = true
  }
}

if (!loaded) {
  console.warn('⚠️ Could not load any .env files, using existing env vars')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Date range for October 6-8, 2025
const START_DATE = '2025-10-06T00:00:00Z'
const END_DATE = '2025-10-08T23:59:59Z'

async function queryVoiceSessions() {
  console.log('\n🎤 Querying voice_sessions...')
  
  const { data, error } = await supabase
    .from('voice_sessions')
    .select('*')
    .gte('created_at', START_DATE)
    .lte('created_at', END_DATE)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error querying voice_sessions:', error)
    return []
  }
  
  console.log(`✅ Found ${data?.length || 0} voice session(s)`)
  return data || []
}

async function queryTranscripts() {
  console.log('\n📝 Querying transcripts for voice/webcam/screenshare mentions...')
  
  const keywords = ['voice', 'webcam', 'screen', 'camera', 'share', 'recording', 'audio', 'video']
  
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .gte('created_at', START_DATE)
    .lte('created_at', END_DATE)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error querying transcripts:', error)
    return []
  }
  
  // Filter transcripts containing relevant keywords
  const relevant = (data || []).filter(transcript => {
    const content = (transcript.content || '').toLowerCase()
    return keywords.some(keyword => content.includes(keyword))
  })
  
  console.log(`✅ Found ${relevant.length} relevant transcript(s) out of ${data?.length || 0} total`)
  return relevant
}

async function queryConversations() {
  console.log('\n💬 Querying conversations...')
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .gte('created_at', START_DATE)
    .lte('created_at', END_DATE)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error querying conversations:', error)
    return []
  }
  
  console.log(`✅ Found ${data?.length || 0} conversation(s)`)
  return data || []
}

async function queryCapabilityUsage() {
  console.log('\n🔧 Querying capability_usage_log...')
  
  const { data, error } = await supabase
    .from('capability_usage_log')
    .select('*')
    .gte('first_used_at', START_DATE)
    .lte('first_used_at', END_DATE)
    .order('first_used_at', { ascending: true })
  
  if (error) {
    console.error('Error querying capability_usage_log:', error)
    return []
  }
  
  console.log(`✅ Found ${data?.length || 0} capability usage record(s)`)
  return data || []
}

async function queryAIResponses() {
  console.log('\n🤖 Querying ai_responses with audio data...')
  
  const { data, error } = await supabase
    .from('ai_responses')
    .select('*')
    .gte('created_at', START_DATE)
    .lte('created_at', END_DATE)
    .not('audio_data', 'is', null)
    .order('created_at', { ascending: true })
  
  if (error) {
    console.error('Error querying ai_responses:', error)
    return []
  }
  
  console.log(`✅ Found ${data?.length || 0} AI response(s) with audio data`)
  return data || []
}

function formatTimestamp(timestamp) {
  if (!timestamp) return 'N/A'
  const date = new Date(timestamp)
  return date.toISOString()
}

function printResults(results) {
  console.log('\n' + '='.repeat(80))
  console.log('📊 OCTOBER 6-8, 2025 ACTIVITY SUMMARY')
  console.log('='.repeat(80))
  
  // Voice Sessions
  if (results.voiceSessions.length > 0) {
    console.log('\n🎤 VOICE SESSIONS:')
    results.voiceSessions.forEach((session, idx) => {
      console.log(`\n  [${idx + 1}] Session ID: ${session.session_id}`)
      console.log(`      Status: ${session.status}`)
      console.log(`      Started: ${formatTimestamp(session.started_at)}`)
      console.log(`      Ended: ${formatTimestamp(session.ended_at)}`)
      console.log(`      Duration: ${session.duration_seconds}s`)
      console.log(`      Audio chunks sent: ${session.audio_chunks_sent || 0}`)
      console.log(`      Audio chunks received: ${session.audio_chunks_received || 0}`)
      if (session.error_message) {
        console.log(`      ⚠️ Error: ${session.error_message}`)
      }
    })
  }
  
  // Transcripts
  if (results.transcripts.length > 0) {
    console.log('\n📝 RELEVANT TRANSCRIPTS:')
    results.transcripts.slice(0, 10).forEach((transcript, idx) => {
      console.log(`\n  [${idx + 1}] ${formatTimestamp(transcript.created_at)}`)
      console.log(`      Role: ${transcript.role}`)
      console.log(`      Type: ${transcript.message_type}`)
      console.log(`      Content preview: ${(transcript.content || '').substring(0, 150)}...`)
      if (transcript.conversation_id) {
        console.log(`      Conversation: ${transcript.conversation_id}`)
      }
    })
    if (results.transcripts.length > 10) {
      console.log(`\n  ... and ${results.transcripts.length - 10} more transcripts`)
    }
  }
  
  // Conversations
  if (results.conversations.length > 0) {
    console.log('\n💬 CONVERSATIONS:')
    results.conversations.forEach((conv, idx) => {
      console.log(`\n  [${idx + 1}] ID: ${conv.id}`)
      console.log(`      Session: ${conv.session_id}`)
      console.log(`      Created: ${formatTimestamp(conv.created_at)}`)
      console.log(`      Status: ${conv.status || 'N/A'}`)
      console.log(`      Stage: ${conv.stage || 'N/A'}`)
    })
  }
  
  // Capability Usage
  if (results.capabilityUsage.length > 0) {
    console.log('\n🔧 CAPABILITY USAGE:')
    results.capabilityUsage.forEach((usage, idx) => {
      console.log(`\n  [${idx + 1}] Capability: ${usage.capability}`)
      console.log(`      Session: ${usage.session_id}`)
      console.log(`      First used: ${formatTimestamp(usage.first_used_at)}`)
      if (usage.context) {
        console.log(`      Context: ${JSON.stringify(usage.context)}`)
      }
    })
  }
  
  // AI Responses with audio
  if (results.aiResponses.length > 0) {
    console.log('\n🤖 AI RESPONSES WITH AUDIO:')
    results.aiResponses.forEach((response, idx) => {
      console.log(`\n  [${idx + 1}] Session: ${response.session_id}`)
      console.log(`      Type: ${response.response_type}`)
      console.log(`      Created: ${formatTimestamp(response.created_at)}`)
      console.log(`      Has audio: ${!!response.audio_data}`)
      if (response.tools_used) {
        console.log(`      Tools: ${response.tools_used.join(', ')}`)
      }
    })
  }
  
  // Summary of key timestamps
  console.log('\n' + '='.repeat(80))
  console.log('⏰ KEY TIMESTAMPS FOR GIT CORRELATION:')
  console.log('='.repeat(80))
  
  const allTimestamps = [
    ...results.voiceSessions.map(s => ({ time: s.created_at, type: 'Voice Session', detail: s.status })),
    ...results.transcripts.map(t => ({ time: t.created_at, type: 'Transcript', detail: t.role })),
    ...results.conversations.map(c => ({ time: c.created_at, type: 'Conversation', detail: c.status })),
    ...results.capabilityUsage.map(u => ({ time: u.first_used_at, type: 'Capability', detail: u.capability })),
    ...results.aiResponses.map(r => ({ time: r.created_at, type: 'AI Response', detail: r.response_type })),
  ].sort((a, b) => new Date(a.time) - new Date(b.time))
  
  allTimestamps.forEach(ts => {
    console.log(`  ${formatTimestamp(ts.time)} | ${ts.type.padEnd(15)} | ${ts.detail}`)
  })
  
  if (allTimestamps.length > 0) {
    const earliest = new Date(allTimestamps[0].time)
    const latest = new Date(allTimestamps[allTimestamps.length - 1].time)
    
    console.log('\n📍 RECOMMENDED GIT SEARCH WINDOW:')
    console.log(`   From: ${new Date(earliest.getTime() - 3600000).toISOString()} (1hr before)`)
    console.log(`   To:   ${new Date(latest.getTime() + 3600000).toISOString()} (1hr after)`)
  }
  
  console.log('\n' + '='.repeat(80))
}

async function main() {
  console.log('🔍 Searching Supabase for October 6-8, 2025 activity...')
  console.log(`   Date range: ${START_DATE} to ${END_DATE}`)
  
  try {
    const [voiceSessions, transcripts, conversations, capabilityUsage, aiResponses] = await Promise.all([
      queryVoiceSessions(),
      queryTranscripts(),
      queryConversations(),
      queryCapabilityUsage(),
      queryAIResponses(),
    ])
    
    const results = {
      voiceSessions,
      transcripts,
      conversations,
      capabilityUsage,
      aiResponses,
    }
    
    printResults(results)
    
    // Save to file for reference
    const fs = await import('fs')
    const outputPath = join(__dirname, '..', 'october-activity-results.json')
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2))
    console.log(`\n💾 Full results saved to: ${outputPath}`)
    
  } catch (error) {
    console.error('❌ Error during query:', error)
    process.exit(1)
  }
}

main()

