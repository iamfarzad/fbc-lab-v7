/**
 * Unit tests for SessionView component
 * Tests chat state persistence, insights panel rendering, welcome banner logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionView } from '@/components/agent-ui/app/session-view';
import { SessionProvider } from '@/components/agent-ui/app/session-provider';
import { LiveApiProvider } from '@/hooks/LiveApiProvider';

// Mock dependencies
vi.mock('@/components/agent-ui/app/session-context', () => ({
  useSession: vi.fn(() => ({
    sessionId: 'test-session',
    isSessionActive: false,
    startSession: vi.fn(),
    error: null,
  })),
}));

vi.mock('@/hooks/useUnifiedChat', () => ({
  useUnifiedChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    updateContext: vi.fn(),
  })),
}));

vi.mock('@/hooks/useLiveApi', () => ({
  useLiveApi: vi.fn(() => ({
    session: { connectionId: 'test-connection' },
    isSessionActive: false,
    sendRealtimeInput: vi.fn(),
    sendContextUpdate: vi.fn(),
    agentStatus: { visible: false, message: '' },
  })),
}));

vi.mock('@/hooks/useCamera', () => ({
  useCamera: vi.fn(() => ({
    isActive: false,
    stream: null,
    startCamera: vi.fn(),
    stopCamera: vi.fn(),
  })),
}));

vi.mock('@/hooks/useScreenShare', () => ({
  useScreenShare: vi.fn(() => ({
    isActive: false,
    stream: null,
    startScreenShare: vi.fn(),
    stopScreenShare: vi.fn(),
  })),
}));

describe('SessionView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should persist chat state to localStorage', async () => {
    const { useUnifiedChat } = require('@/hooks/useUnifiedChat');
    useUnifiedChat.mockReturnValue({
      messages: [],
      sendMessage: vi.fn(),
      updateContext: vi.fn(),
    });

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <SessionView
            hasAcceptedTerms={true}
            researchStatus="ready"
            leadName="Test"
            leadEmail="test@example.com"
            companyName="Test Corp"
          />
        </SessionProvider>
      </LiveApiProvider>
    );

    // Simulate chat state change
    const chatStateToggle = screen.queryByLabelText(/toggle transcript/i);
    if (chatStateToggle) {
      chatStateToggle.click();
    }

    await waitFor(() => {
      const saved = localStorage.getItem('fbc-live-chat-state');
      expect(saved).toBeTruthy();
    });
  });

  it('should restore chat state from localStorage on mount', () => {
    localStorage.setItem('fbc-live-chat-state', 'minimized');

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <SessionView
            hasAcceptedTerms={true}
            researchStatus="ready"
            leadName="Test"
            leadEmail="test@example.com"
            companyName="Test Corp"
          />
        </SessionProvider>
      </LiveApiProvider>
    );

    // Chat should be minimized (not visible)
    expect(screen.queryByTestId('live-chat-messages')).not.toBeInTheDocument();
  });

  it('should show loading spinner when research status is loading', () => {
    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <SessionView
            hasAcceptedTerms={true}
            researchStatus="loading"
            leadName="Test"
            leadEmail="test@example.com"
            companyName="Test Corp"
          />
        </SessionProvider>
      </LiveApiProvider>
    );

    expect(screen.getByText(/tailoring your briefing/i)).toBeInTheDocument();
  });

  it('should show error alert when research status is error', () => {
    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <SessionView
            hasAcceptedTerms={true}
            researchStatus="error"
            leadName="Test"
            leadEmail="test@example.com"
            companyName="Test Corp"
          />
        </SessionProvider>
      </LiveApiProvider>
    );

    expect(screen.getByText(/unable to load personalized context/i)).toBeInTheDocument();
  });

  it('should show insights panel when research is ready', () => {
    const mockInsights = {
      chainOfThought: [
        { id: '1', label: 'Test step', description: 'Test description', status: 'complete' as const },
      ],
      sources: [],
    };

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <SessionView
            hasAcceptedTerms={true}
            researchStatus="ready"
            researchInsights={mockInsights}
            leadName="Test"
            leadEmail="test@example.com"
            companyName="Test Corp"
          />
        </SessionProvider>
      </LiveApiProvider>
    );

    expect(screen.getByText(/briefing ready/i)).toBeInTheDocument();
  });

  it('should inject welcome message once when research is ready', async () => {
    const mockSendMessage = vi.fn();
    const { useUnifiedChat } = require('@/hooks/useUnifiedChat');
    useUnifiedChat.mockReturnValue({
      messages: [],
      sendMessage: mockSendMessage,
      addMessage: mockSendMessage,
      updateContext: vi.fn(),
    });

    const mockInsights = {
      chainOfThought: [
        { id: '1', label: 'Test step', description: 'Test description', status: 'complete' as const },
      ],
      sources: [],
    };

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <SessionView
            hasAcceptedTerms={true}
            researchStatus="ready"
            researchInsights={mockInsights}
            leadName="Test"
            leadEmail="test@example.com"
            companyName="Test Corp"
          />
        </SessionProvider>
      </LiveApiProvider>
    );

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: expect.stringContaining('Welcome'),
        })
      );
    });
  });
});

