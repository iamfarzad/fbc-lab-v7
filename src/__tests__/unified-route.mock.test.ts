/**
 * @jest-environment node
 */

const mockComprehensiveResearch = jest.fn();

jest.mock('@/core/intelligence/providers/search/google-grounding', () => {
  return {
    GoogleGroundingProvider: jest.fn().mockImplementation(() => ({
      comprehensiveResearch: mockComprehensiveResearch
    }))
  };
});

jest.mock('@/core/context/context-storage', () => {
  return {
    ContextStorage: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockResolvedValue({
        email: 'test@example.com',
        company_context: { name: 'TestCo', industry: 'AI' }
      }),
      store: jest.fn(),
      update: jest.fn()
    }))
  };
});

jest.mock('ai', () => ({
  streamText: jest.fn(),
  generateText: jest.fn()
}));

jest.mock('@/core/ai/retry-model', () => ({
  createRetryableGemini: jest.fn(() => ({}))
}));

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn(() => ({}))
}));

let POST: (req: Request) => Promise<Response>;

describe('Mocked unified chat route', () => {
  beforeAll(async () => {
    process.env.MOCK_UNIFIED_CHAT = '1';
    process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'mock-key';
    ({ POST } = await import('@/app/api/chat/unified/route'));
  });

  beforeEach(() => {
    mockComprehensiveResearch.mockReset();
  });

  afterAll(() => {
    delete process.env.MOCK_UNIFIED_CHAT;
  });

  it('includes enhanced research metadata when enabled', async () => {
    const mockResearchResult = {
      urlsUsed: ['https://example.com/research'],
      allCitations: [{ uri: 'https://example.com/research' }],
      searchGrounding: { text: 'search context', citations: [{ uri: 'https://example.com/research' }] },
      urlContext: [],
      combinedAnswer: 'Combined research summary'
    };
    mockComprehensiveResearch.mockResolvedValueOnce(mockResearchResult);

    const request = new Request('http://localhost/api/chat/unified', {
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
    expect(text.length).toBeGreaterThan(0);
    const events = text.trim().split('\n\n').filter(Boolean);
    const dataEvents = events
      .map((entry) => {
        const dataLine = entry
          .split('\n')
          .map((line) => line.trim())
          .find((line) => line.startsWith('data: '));
        return dataLine ? JSON.parse(dataLine.replace(/^data:\s*/, '')) : null;
      })
      .filter(Boolean) as Array<any>;

    if (dataEvents.length === 0) {
      throw new Error(`No data events captured. Raw events: ${JSON.stringify(events)}`);
    }

    const finalEvent = dataEvents[dataEvents.length - 1];

    expect(mockComprehensiveResearch).toHaveBeenCalledWith('Tell me about research updates', expect.any(Object));
    expect(finalEvent.metadata.research).toMatchObject({
      query: 'Tell me about research updates',
      urlsUsed: mockResearchResult.urlsUsed,
      citationCount: mockResearchResult.allCitations.length,
      searchGroundingUsed: mockResearchResult.searchGrounding.citations.length,
      urlContextUsed: mockResearchResult.urlContext.length,
      combinedAnswer: mockResearchResult.combinedAnswer,
    });

    expect(finalEvent.metadata.research.citations).toEqual([
      expect.objectContaining({
        id: 'citation-1',
        title: 'example.com',
        url: mockResearchResult.urlsUsed[0],
        source: 'search',
      }),
    ]);

    const systemHeader = response.headers.get('x-mock-system-prompt');
    expect(systemHeader).toBeTruthy();
  });

  it('skips enhanced research when disabled', async () => {
    const request = new Request('http://localhost/api/chat/unified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'user', content: 'Plain response please', timestamp: new Date().toISOString(), type: 'text' }
        ],
        context: {
          sessionId: 'test-session',
          enhancedResearch: false
        }
      })
    });

    const response = await POST(request);
    const text = await response.text();
    expect(text.length).toBeGreaterThan(0);
    const events = text.trim().split('\n\n').filter(Boolean);
    const dataEvents = events
      .map((entry) => {
        const dataLine = entry
          .split('\n')
          .map((line) => line.trim())
          .find((line) => line.startsWith('data: '));
        return dataLine ? JSON.parse(dataLine.replace(/^data:\s*/, '')) : null;
      })
      .filter(Boolean) as Array<any>;

    if (dataEvents.length === 0) {
      throw new Error(`No data events captured. Raw events: ${JSON.stringify(events)}`);
    }

    const finalEvent = dataEvents[dataEvents.length - 1];

    expect(mockComprehensiveResearch).not.toHaveBeenCalled();
    expect(finalEvent.metadata.research).toBeNull();
  });
});
