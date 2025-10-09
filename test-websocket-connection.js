#!/usr/bin/env node

/**
 * WebSocket Connection Test
 * Tests the Gemini Live WebSocket connection
 */

import WebSocket from 'ws';

const WS_URL = process.env.WS_URL || 'ws://localhost:3001';
const TEST_TIMEOUT = 10000; // 10 seconds

console.log('🧪 Testing WebSocket Connection...\n');
console.log(`📍 URL: ${WS_URL}\n`);

let connectionSuccessful = false;
let connectionTime = 0;

const startTime = Date.now();

const ws = new WebSocket(WS_URL);

// Set timeout
const timeout = setTimeout(() => {
  if (!connectionSuccessful) {
    console.error('❌ Connection timeout after 10 seconds');
    ws.close();
    process.exit(1);
  }
}, TEST_TIMEOUT);

ws.on('open', () => {
  connectionTime = Date.now() - startTime;
  connectionSuccessful = true;
  console.log(`✅ WebSocket connected successfully`);
  console.log(`⏱️  Connection time: ${connectionTime}ms\n`);
  
  // Send test message
  console.log('📤 Sending test message...');
  ws.send(JSON.stringify({
    type: 'test',
    message: 'Connection test from automated script'
  }));
  
  // Close after successful test
  setTimeout(() => {
    console.log('🔌 Closing connection...');
    ws.close();
  }, 1000);
});

ws.on('message', (data) => {
  console.log('📥 Received message:', data.toString().substring(0, 100));
});

ws.on('close', (code, reason) => {
  clearTimeout(timeout);
  console.log(`\n🔌 Connection closed`);
  console.log(`   Code: ${code}`);
  console.log(`   Reason: ${reason || 'Normal closure'}`);
  
  if (connectionSuccessful) {
    console.log('\n✅ WebSocket test PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ WebSocket test FAILED');
    process.exit(1);
  }
});

ws.on('error', (error) => {
  clearTimeout(timeout);
  console.error('\n❌ WebSocket error:', error.message);
  console.error('   Full error:', error);
  
  // Common issues
  console.log('\n💡 Common issues:');
  console.log('   1. Is the server running? (pnpm dev:all)');
  console.log('   2. Is the port correct? (default: 3000)');
  console.log('   3. Is the WebSocket route implemented?');
  console.log('   4. Check GOOGLE_GEMINI_API_KEY environment variable');
  
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  ws.close();
  process.exit(1);
});
