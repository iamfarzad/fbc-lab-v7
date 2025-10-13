// Script to query Supabase for voice, webcam, and screen-sharing activity around October 7th
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
function loadEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const env = {};
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    return env;
  } catch (error) {
    console.warn(`Could not load ${filePath}:`, error.message);
    return {};
  }
}

const env = loadEnvFile('.env.local');

// Extract Supabase credentials from the environment variables
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 
  `https://ksmxqswuzrmdgckwxkvn.supabase.co`;

// For Supabase, we need the service role key, not just the password
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzbXhxd3N1enJtZGdja3d4a3ZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTc4NTI2MiwiZXhwIjoyMDU3MzYxMjYyfQ.9H3ihs0mEAEDk03d_V-Bt8Ywl4uouVIJ13CFUM3nVxU';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Check .env.local file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Date range for October 7th (with some buffer)
const startDate = '2025-10-06T00:00:00Z';
const endDate = '2025-10-08T23:59:59Z';

async function queryVoiceSessions() {
  console.log('\n🔊 Querying voice_sessions around October 7th...');
  
  const { data, error } = await supabase
    .from('voice_sessions')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error querying voice_sessions:', error);
    return [];
  }
  
  console.log(`Found ${data.length} voice sessions:`);
  data.forEach(session => {
    console.log(`  - Session: ${session.id}`);
    console.log(`    Created: ${session.created_at}`);
    console.log(`    Status: ${session.status}`);
    console.log(`    Duration: ${session.duration_seconds}s`);
    console.log(`    Audio chunks: ${session.audio_chunks_received} received, ${session.audio_chunks_sent} sent`);
    if (session.error_message) {
      console.log(`    Error: ${session.error_message}`);
    }
    console.log('');
  });
  
  return data;
}

async function queryCapabilityUsage() {
  console.log('\n📊 Querying capability_usage_log for media capabilities...');
  
  const mediaCapabilities = [
    'voice_transcription',
    'text_generation', // might include webcam/screen analysis
    'embeddings_generation' // might be used for visual content
  ];
  
  const { data, error } = await supabase
    .from('capability_usage_log')
    .select('*')
    .in('capability', mediaCapabilities)
    .gte('first_used_at', startDate)
    .lte('first_used_at', endDate)
    .order('first_used_at', { ascending: true });
  
  if (error) {
    console.error('Error querying capability_usage_log:', error);
    return [];
  }
  
  console.log(`Found ${data.length} capability usage entries:`);
  data.forEach(usage => {
    console.log(`  - Capability: ${usage.capability}`);
    console.log(`    Session: ${usage.session_id}`);
    console.log(`    First used: ${usage.first_used_at}`);
    if (usage.context) {
      console.log(`    Context:`, JSON.stringify(usage.context, null, 6));
    }
    console.log('');
  });
  
  return data;
}

async function queryAIResponses() {
  console.log('\n🤖 Querying ai_responses with media content...');
  
  const { data, error } = await supabase
    .from('ai_responses')
    .select('*')
    .or('audio_data.not.is.null,image_data.not.is.null')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error querying ai_responses:', error);
    return [];
  }
  
  console.log(`Found ${data.length} AI responses with media content:`);
  data.forEach(response => {
    console.log(`  - Response ID: ${response.id}`);
    console.log(`    Session: ${response.session_id}`);
    console.log(`    Created: ${response.created_at}`);
    console.log(`    Type: ${response.response_type}`);
    console.log(`    Has audio: ${!!response.audio_data}`);
    console.log(`    Has image: ${!!response.image_data}`);
    console.log(`    Tools used: ${response.tools_used?.join(', ') || 'none'}`);
    console.log('');
  });
  
  return data;
}

async function queryActivities() {
  console.log('\n📋 Querying activities table for media-related activities...');
  
  const mediaTypes = [
    'voice',
    'webcam',
    'screen',
    'camera',
    'audio',
    'video',
    'media',
    'recording'
  ];
  
  // Query activities where type or title contains media-related keywords
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .or(`type.in.(${mediaTypes.map(t => `'${t}'`).join(',')}),title.ilike.%voice%,title.ilike.%webcam%,title.ilike.%screen%,title.ilike.%camera%,description.ilike.%voice%,description.ilike.%webcam%,description.ilike.%screen%,description.ilike.%camera%`)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error querying activities:', error);
    return [];
  }
  
  console.log(`Found ${data.length} media-related activities:`);
  data.forEach(activity => {
    console.log(`  - Activity: ${activity.title}`);
    console.log(`    Type: ${activity.type}`);
    console.log(`    Status: ${activity.status}`);
    console.log(`    Created: ${activity.created_at}`);
    if (activity.description) {
      console.log(`    Description: ${activity.description}`);
    }
    if (activity.metadata) {
      console.log(`    Metadata:`, JSON.stringify(activity.metadata, null, 6));
    }
    console.log('');
  });
  
  return data;
}

async function queryTranscripts() {
  console.log('\n💬 Querying transcripts for voice/media-related content...');
  
  const { data, error } = await supabase
    .from('transcripts')
    .select('*')
    .or(`tool_name.in.('voice','webcam','screen','camera'),role.ilike.%voice%,content.ilike.%voice%,content.ilike.%webcam%,content.ilike.%screen%,content.ilike.%camera%`)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: true })
    .limit(20); // Limit to avoid too much output
  
  if (error) {
    console.error('Error querying transcripts:', error);
    return [];
  }
  
  console.log(`Found ${data.length} media-related transcripts:`);
  data.forEach(transcript => {
    console.log(`  - Transcript ID: ${transcript.id}`);
    console.log(`    Role: ${transcript.role}`);
    console.log(`    Type: ${transcript.message_type}`);
    console.log(`    Tool: ${transcript.tool_name || 'none'}`);
    console.log(`    Created: ${transcript.created_at}`);
    if (transcript.content) {
      const preview = transcript.content.length > 100 
        ? transcript.content.substring(0, 100) + '...' 
        : transcript.content;
      console.log(`    Content: ${preview}`);
    }
    console.log('');
  });
  
  return data;
}

async function main() {
  console.log(`🔍 Querying Supabase for voice, webcam, and screen-sharing activity`);
  console.log(`📅 Date range: ${startDate} to ${endDate}`);
  console.log(`🌐 Supabase URL: ${supabaseUrl}`);
  
  try {
    const voiceSessions = await queryVoiceSessions();
    const capabilityUsage = await queryCapabilityUsage();
    const aiResponses = await queryAIResponses();
    const activities = await queryActivities();
    const transcripts = await queryTranscripts();
    
    // Summary
    console.log('\n📈 SUMMARY:');
    console.log(`- Voice sessions: ${voiceSessions.length}`);
    console.log(`- Media capability usage: ${capabilityUsage.length}`);
    console.log(`- AI responses with media: ${aiResponses.length}`);
    console.log(`- Media-related activities: ${activities.length}`);
    console.log(`- Media-related transcripts: ${transcripts.length}`);
    
    if (voiceSessions.length > 0 || capabilityUsage.length > 0 || aiResponses.length > 0) {
      console.log('\n✅ FOUND EVIDENCE of media features being used around October 7th!');
      
      // Find the earliest timestamp
      const allTimestamps = [
        ...voiceSessions.map(s => new Date(s.created_at)),
        ...capabilityUsage.map(u => new Date(u.first_used_at)),
        ...aiResponses.map(r => new Date(r.created_at)),
        ...activities.map(a => new Date(a.created_at))
      ].filter(Boolean);
      
      if (allTimestamps.length > 0) {
        const earliestTimestamp = new Date(Math.min(...allTimestamps));
        console.log(`\n🎯 Earliest activity timestamp: ${earliestTimestamp.toISOString()}`);
        console.log(`📅 This corresponds to: ${earliestTimestamp.toLocaleDateString()} ${earliestTimestamp.toLocaleTimeString()}`);
      }
    } else {
      console.log('\n❌ No evidence found of media features being used around October 7th');
    }
    
  } catch (error) {
    console.error('Error during query:', error);
    process.exit(1);
  }
}

main();
