'use client';

import React from 'react';

export default function DebugEnvPage() {
  const [debugInfo, setDebugInfo] = React.useState<any>({});

  React.useEffect(() => {
    // Simulate the serverUrl calculation from useRealtimeVoice.ts
    const serverUrl = (() => {
      if (typeof window === 'undefined') return undefined;
      const envUrl = process.env.NEXT_PUBLIC_LIVE_SERVER_URL;
      if (envUrl) return envUrl;
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = window.location.host;
      
      // In production, use the same host without port (Fly.io handles routing)
      // In development, use the configured port
      const isProduction = process.env.NODE_ENV === 'production';
      return isProduction 
        ? `${protocol}://${host.replace(/:\d+$/, '')}`
        : `${protocol}://${host.replace(/:\d+$/, '')}:${process.env.NEXT_PUBLIC_LIVE_SERVER_PORT ?? '3001'}`;
    })();

    const info = {
      serverUrl,
      envUrl: process.env.NEXT_PUBLIC_LIVE_SERVER_URL,
      nodeEnv: process.env.NODE_ENV,
      port: process.env.NEXT_PUBLIC_LIVE_SERVER_PORT,
      windowProtocol: typeof window !== 'undefined' ? window.location.protocol : 'undefined',
      windowHost: typeof window !== 'undefined' ? window.location.host : 'undefined',
      timestamp: new Date().toISOString(),
    };

    setDebugInfo(info);
    console.log('🔍 Debug Info:', info);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🔍 Environment Debug</h1>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      
      <div style={{ marginTop: '20px' }}>
        <h2>🎯 Analysis</h2>
        {debugInfo.serverUrl === 'wss://fb-consulting-websocket.fly.dev' ? (
          <div style={{ color: 'green' }}>
            ✅ Environment variable is working correctly
          </div>
        ) : (
          <div style={{ color: 'red' }}>
            ❌ Environment variable issue detected
            <br />
            Expected: wss://fb-consulting-websocket.fly.dev
            <br />
            Actual: {debugInfo.serverUrl}
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>🔧 WebSocket Test</h2>
        <button
          onClick={() => {
            const ws = new WebSocket(debugInfo.serverUrl);
            ws.onopen = () => {
              alert('✅ WebSocket connected successfully!');
              ws.close();
            };
            ws.onerror = (error) => {
              alert(`❌ WebSocket error: ${error}`);
            };
          }}
        >
          Test WebSocket Connection
        </button>
      </div>
    </div>
  );
}
