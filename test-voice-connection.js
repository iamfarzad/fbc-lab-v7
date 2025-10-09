#!/usr/bin/env node

import WebSocket from 'ws';

console.log('🔧 Testing Voice Stack Connection...\n');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ WebSocket connected to server');
  
  // Send start message to initiate voice session
  const startMessage = {
    type: 'start',
    payload: {
      languageCode: 'en-US',
      voiceName: 'Puck'
    }
  };
  
  console.log('📤 Sending start message:', JSON.stringify(startMessage, null, 2));
  ws.send(JSON.stringify(startMessage));
  
  // Wait a moment then send some test audio data
  setTimeout(() => {
    console.log('📤 Sending test audio data...');
    const audioMessage = {
      type: 'user_audio',
      payload: {
        audioData: 'dGVzdCBhdWRpbyBkYXRhIGJhc2U2NA==', // "test audio data base64"
        mimeType: 'audio/pcm;rate=16000'
      }
    };
    ws.send(JSON.stringify(audioMessage));
  }, 1000);
  
  // Send turn complete
  setTimeout(() => {
    console.log('📤 Sending TURN_COMPLETE...');
    ws.send(JSON.stringify({ type: 'TURN_COMPLETE' }));
  }, 2000);
  
  // Close connection after test
  setTimeout(() => {
    console.log('🔚 Closing connection...');
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📥 Received message:', JSON.stringify(message, null, 2));
    
    if (message.type === 'error') {
      console.error('❌ Server error:', message.payload?.message);
    } else if (message.type === 'session_started') {
      console.log('✅ Session started successfully');
      console.log('   Connection ID:', message.payload?.connectionId);
      console.log('   Language:', message.payload?.languageCode);
      console.log('   Voice:', message.payload?.voiceName);
    } else if (message.type === 'text') {
      console.log('💬 Received text:', message.payload?.content);
    } else if (message.type === 'audio') {
      console.log('🔊 Received audio data (length:', message.payload?.audioData?.length, 'chars)');
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
    console.log('Raw data:', data.toString());
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log(`🔚 WebSocket closed. Code: ${code}, Reason: ${reason?.toString() || 'N/A'}`);
  
  if (code === 1001) {
    console.log('ℹ️  Connection closed normally (going away)');
  } else if (code === 1006) {
    console.log('⚠️  Connection closed abnormally');
  }
  
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
}, 10000);
