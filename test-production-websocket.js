import WebSocket from 'ws';

console.log('🧪 Testing Production WebSocket Connection...');
console.log('📍 URL: wss://fb-consulting-websocket.fly.dev');

const ws = new WebSocket('wss://fb-consulting-websocket.fly.dev');

const startTime = Date.now();

ws.on('open', () => {
    const connectTime = Date.now() - startTime;
    console.log('✅ WebSocket connected successfully');
    console.log(`⏱️  Connection time: ${connectTime}ms`);
    
    console.log('📤 Sending test message...');
    ws.send(JSON.stringify({ type: 'test', message: 'Hello from test script' }));
});

ws.on('message', (data) => {
    console.log('📥 Received message:', data.toString());
    
    console.log('🔌 Closing connection...');
    ws.close();
});

ws.on('close', (code, reason) => {
    console.log('🔌 Connection closed');
    console.log(`   Code: ${code}`);
    console.log(`   Reason: ${reason || '(no reason)'}`);
    
    if (code === 1000) {
        console.log('✅ WebSocket test PASSED');
    } else {
        console.log('❌ WebSocket test FAILED');
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    console.log('❌ WebSocket test FAILED');
});

// Timeout after 10 seconds
setTimeout(() => {
    if (ws.readyState === WebSocket.CONNECTING) {
        console.log('❌ Connection timeout');
        ws.terminate();
    }
}, 10000);
