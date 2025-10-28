const WebSocket = require('ws');

const URL = process.env.WS_URL || 'ws://localhost:3001';
let gotConnected = false;
let gotSessionClosed = false;
let connectionId = null;

const ws = new WebSocket(URL);

const timeout = setTimeout(() => {
  console.error('❌ Timeout waiting for events', { gotConnected, gotSessionClosed });
  process.exit(2);
}, 15000);

ws.on('open', () => {
  console.log('🔌 Opened');
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('📩', msg.type);
    if (msg.type === 'connected') {
      gotConnected = true;
      connectionId = msg.payload?.connectionId;
      // Send STOP only (client must not send TURN_COMPLETE)
      ws.send(JSON.stringify({ type: 'stop' }));
    } else if (msg.type === 'session_closed') {
      gotSessionClosed = true;
      console.log('✅ Received session_closed:', msg.payload?.reason);
      clearTimeout(timeout);
      ws.close();
      process.exit(0);
    } else if (msg.type === 'error') {
      console.error('Server error:', msg.payload);
    }
  } catch (e) {
    console.error('Bad JSON:', e);
  }
});

ws.on('error', (err) => {
  console.error('WS error', err);
});
