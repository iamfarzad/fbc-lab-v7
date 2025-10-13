process.env.MOCK_UNIFIED_CHAT = '1';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'mock-key';

(async () => {
  const { POST } = await import('../app/api/chat/unified/route');
  const { NextRequest } = await import('next/server');

  const request = new NextRequest('http://localhost/api/chat/unified', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { id: '1', role: 'user', content: 'Tell me about research updates', timestamp: new Date().toISOString(), type: 'text' }
      ],
      context: {
        sessionId: 'test-session',
        enhancedResearch: true
      }
    })
  });

  const response = await POST(request);
  const text = await response.text();
  console.log('Response headers:', Object.fromEntries(response.headers));
  console.log('Raw text:', JSON.stringify(text));
})();
