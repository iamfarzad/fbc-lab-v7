// CommonJS test for TURN_COMPLETE + CONTEXT_UPDATE (works regardless of ESM root)
const WebSocket = require('ws');

const url = process.env.WS_URL || 'ws://localhost:3001';
const ws = new WebSocket(url);
let gotStarted = false;
let done = false;

function send(obj) {
  ws.send(JSON.stringify(obj));
}

ws.on('open', () => {
  console.log('✅ Connected');
  send({ type: 'start', payload: { sessionId: 'test-' + Date.now(), languageCode: 'en-US', voiceName: 'Puck' } });
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('📨', msg.type);
    if (msg.type === 'session_started' && !gotStarted) {
      gotStarted = true;
      setTimeout(() => {
        console.log('🧪 Sending TURN_COMPLETE');
        send({ type: 'TURN_COMPLETE' });
        // Also send a CONTEXT_UPDATE for webcam to exercise injection
        send({ type: 'CONTEXT_UPDATE', payload: { modality: 'webcam', analysis: 'Test webcam context' } });
      }, 500);
    }
    if (msg.type === 'turn_complete') {
      console.log('✅ TURN_COMPLETE acknowledged by server');
      done = true;
      ws.close();
    }
    if (msg.type === 'error') {
      console.error('❌ Error:', msg.payload?.message || 'unknown');
      done = true;
      ws.close();
      process.exitCode = 1;
    }
  } catch (e) {
    console.error('❌ Bad message', e);
    process.exitCode = 1;
    done = true;
    ws.close();
  }
});

ws.on('close', () => {
  console.log('🔌 Closed');
  if (!done) process.exitCode = 1;
  process.exit();
});

setTimeout(() => {
  console.error('⏰ Timeout');
  try { ws.close(); } catch {}
  process.exit(1);
}, 10000);

