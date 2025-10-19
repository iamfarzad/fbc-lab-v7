'use client';

import { useState } from 'react';
import { WEBSOCKET_CONFIG } from '@/config/constants';

export default function VoiceTest() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [wsStatus, setWsStatus] = useState('disconnected');

  const testWebSocket = () => {
    try {
      const ws = new WebSocket(WEBSOCKET_CONFIG.URL);
      
      ws.onopen = () => {
        setWsStatus('connected');
        console.log('WebSocket connected');
        
        // Send start message
        ws.send(JSON.stringify({ type: 'start' }));
        setIsListening(true);
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);
        
        if (data.type === 'transcript') {
          setTranscript(data.text);
        } else if (data.type === 'session_started') {
          setWsStatus('session_started');
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('error');
      };
      
      ws.onclose = () => {
        setWsStatus('disconnected');
        setIsListening(false);
      };
      
      // Close after 10 seconds for testing
      setTimeout(() => {
        ws.close();
      }, 10000);
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setWsStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <h1 className="text-3xl font-bold mb-8">Voice Server Test</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">WebSocket Status</h2>
          <p className="text-lg">Status: <span className={`font-bold ${wsStatus === 'connected' ? 'text-green-500' : wsStatus === 'error' ? 'text-red-500' : 'text-gray-500'}`}>{wsStatus}</span></p>
          <button 
            onClick={testWebSocket}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test WebSocket Connection
          </button>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Voice Status</h2>
          <p className="text-lg">Listening: <span className={`font-bold ${isListening ? 'text-green-500' : 'text-gray-500'}`}>{isListening ? 'Yes' : 'No'}</span></p>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Transcript</h2>
          <p className="text-lg">{transcript || 'No transcript yet...'}</p>
        </div>
        
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Test WebSocket Connection" to connect to the voice server</li>
            <li>Check if WebSocket status changes to "connected"</li>
            <li>In mock mode, you should receive a "session_started" response</li>
            <li>The connection will automatically close after 10 seconds</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
