#!/usr/bin/env node

/**
 * Debug Environment Variables
 * Check what environment variables are available
 */

console.log('🔍 Debugging Environment Variables...\n');

// Simulate Next.js environment
const isNextjs = true;

if (isNextjs) {
  console.log('📦 Next.js Environment Variables:');
  console.log('   NEXT_PUBLIC_LIVE_SERVER_URL:', process.env.NEXT_PUBLIC_LIVE_SERVER_URL);
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  console.log('   PORT:', process.env.PORT);
  console.log('   NEXT_PUBLIC_LIVE_SERVER_PORT:', process.env.NEXT_PUBLIC_LIVE_SERVER_PORT);
} else {
  console.log('📦 Standard Environment Variables:');
  console.log('   LIVE_SERVER_URL:', process.env.LIVE_SERVER_URL);
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  console.log('   PORT:', process.env.PORT);
}

console.log('\n🌐 Simulating browser environment:');
console.log('   window.location.protocol:', 'https:');
console.log('   window.location.host:', 'www.farzadbayat.com');

// Simulate the serverUrl calculation from useRealtimeVoice.ts
function calculateServerUrl() {
  const envUrl = process.env.NEXT_PUBLIC_LIVE_SERVER_URL;
  console.log('\n🔧 Server URL Calculation:');
  console.log('   envUrl:', envUrl);
  
  if (envUrl) {
    console.log('   ✅ Using environment variable:', envUrl);
    return envUrl;
  }
  
  const protocol = 'https:' ? 'wss' : 'ws';
  const host = 'www.farzadbayat.com';
  
  // In production, use the same host without port (Fly.io handles routing)
  // In development, use the configured port
  const isProduction = process.env.NODE_ENV === 'production';
  const fallbackUrl = isProduction 
    ? `${protocol}://${host.replace(/:\d+$/, '')}`
    : `${protocol}://${host.replace(/:\d+$/, '')}:${process.env.NEXT_PUBLIC_LIVE_SERVER_PORT ?? '3001'}`;
  
  console.log('   ❌ Using fallback URL:', fallbackUrl);
  return fallbackUrl;
}

const serverUrl = calculateServerUrl();
console.log('\n🎯 Final Server URL:', serverUrl);

console.log('\n💡 Analysis:');
if (serverUrl === 'wss://fb-consulting-websocket.fly.dev') {
  console.log('   ✅ Environment variable is working correctly');
} else {
  console.log('   ❌ Environment variable is not being read');
  console.log('   🔧 Check Vercel environment variable configuration');
}
