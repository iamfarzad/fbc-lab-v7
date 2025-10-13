#!/usr/bin/env node

/**
 * Query all Supabase activity to find when voice/webcam/screenshare were actually used
 */

import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env files
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

const envFiles = ['.env.local', '.env.production', '.env']
for (const file of envFiles) {
  loadEnvFile(join(__dirname, '..', file))
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function queryAllData() {
  console.log('\n🔍 Querying ALL voice_sessions...')
  
  const { data: voiceSessions, error: vsError } = await supabase
    .from('voice_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (vsError) console.error('Error:', vsError)
  else console.log(`   Found ${voiceSessions?.length || 0} voice sessions`)
  
  console.log('\n📝 Querying ALL transcripts...')
  
  const { data: transcripts, error: tError } = await supabase
    .from('transcripts')
    .select('created_at, role, message_type, content')
    .order('created_at', { ascending: false })
    .limit(100)
  
  if (tError) console.error('Error:', tError)
  else {
    console.log(`   Found ${transcripts?.length || 0} transcripts`)
    
    const keywords = ['voice', 'webcam', 'screen', 'camera', 'share', 'recording', 'audio', 'video', 'test']
    const relevant = (transcripts || []).filter(t => {
      const content = (t.content || '').toLowerCase()
      return keywords.some(k => content.includes(k))
    })
    console.log(`   ${relevant.length} mention voice/webcam/screen features`)
  }
  
  console.log('\n💬 Querying ALL conversations...')
  
  const { data: conversations, error: cError } = await supabase
    .from('conversations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (cError) console.error('Error:', cError)
  else console.log(`   Found ${conversations?.length || 0} conversations`)
  
  console.log('\n🔧 Querying ALL capability_usage_log...')
  
  const { data: capabilities, error: capError } = await supabase
    .from('capability_usage_log')
    .select('*')
    .order('first_used_at', { ascending: false })
    .limit(50)
  
  if (capError) console.error('Error:', capError)
  else console.log(`   Found ${capabilities?.length || 0} capability records`)
  
  // Print date ranges
  console.log('\n' + '='.repeat(80))
  console.log('📅 DATE RANGES IN DATABASE:')
  console.log('='.repeat(80))
  
  if (voiceSessions?.length > 0) {
    const dates = voiceSessions.map(v => v.created_at).filter(Boolean).sort()
    console.log(`\n🎤 Voice Sessions: ${dates[dates.length-1]} to ${dates[0]}`)
  }
  
  if (transcripts?.length > 0) {
    const dates = transcripts.map(t => t.created_at).filter(Boolean).sort()
    console.log(`📝 Transcripts: ${dates[dates.length-1]} to ${dates[0]}`)
  }
  
  if (conversations?.length > 0) {
    const dates = conversations.map(c => c.created_at).filter(Boolean).sort()
    console.log(`💬 Conversations: ${dates[dates.length-1]} to ${dates[0]}`)
  }
  
  if (capabilities?.length > 0) {
    const dates = capabilities.map(c => c.first_used_at).filter(Boolean).sort()
    console.log(`🔧 Capabilities: ${dates[dates.length-1]} to ${dates[0]}`)
  }
  
  // Show recent relevant transcripts
  if (transcripts?.length > 0) {
    console.log('\n' + '='.repeat(80))
    console.log('📝 RECENT TRANSCRIPTS (showing first 10):')
    console.log('='.repeat(80))
    
    transcripts.slice(0, 10).forEach((t, idx) => {
      console.log(`\n[${idx + 1}] ${t.created_at}`)
      console.log(`    Role: ${t.role} | Type: ${t.message_type}`)
      const preview = (t.content || '').substring(0, 200)
      console.log(`    ${preview}${(t.content?.length || 0) > 200 ? '...' : ''}`)
    })
  }
  
  const results = {
    voiceSessions: voiceSessions || [],
    transcripts: transcripts || [],
    conversations: conversations || [],
    capabilities: capabilities || [],
  }
  
  const outputPath = join(__dirname, '..', 'all-activity-results.json')
  writeFileSync(outputPath, JSON.stringify(results, null, 2))
  console.log(`\n\n💾 Full results saved to: ${outputPath}`)
}

queryAllData().catch(console.error)


