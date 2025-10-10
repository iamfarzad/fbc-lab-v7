// Test script to verify TURN_COMPLETE fix
const WebSocket = require('ws');

console.log('🧪 Testing TURN_COMPLETE fix...');

// Connect to the WebSocket server
const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  
  // Start a session
  ws.send(JSON.stringify({
    type: 'start',
    payload: {
      sessionId: 'test-session-' + Date.now(),
      languageCode: 'en-US',
      voiceName: 'Fenrir'
    }
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received:', message.type);
  
  if (message.type === 'session_started') {
    console.log('✅ Session started successfully');
    
    // Wait a bit then send TURN_COMPLETE to test the fix
    setTimeout(() => {
      console.log('🧪 Sending TURN_COMPLETE message...');
      ws.send(JSON.stringify({
        type: 'TURN_COMPLETE'
      }));
    }, 1000);
  }
  
  if (message.type === 'turn_complete') {
    console.log('✅ TURN_COMPLETE handled successfully!');
    console.log('🎉 Fix verified - no parsing error!');
    ws.close();
  }
  
  if (message.type === 'error') {
    console.error('❌ Error received:', message.payload?.message);
    if (message.payload?.message?.includes('Failed to parse client content')) {
      console.error('💥 The parsing error still exists!');
    }
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', () => {
  console.log('🔌 Connection closed');
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('⏰ Test timed out');
  ws.close();
  process.exit(1);
}, 10000);
