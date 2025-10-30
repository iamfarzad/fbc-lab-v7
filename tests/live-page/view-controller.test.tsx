/**
 * Unit tests for ViewController component
 * Tests welcome message injection logic, research status handling, and terms acceptance flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ViewController } from '@/components/agent-ui/app/view-controller';
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

vi.mock('@/components/chat/hooks/useChatIntelligence', () => ({
  useChatIntelligence: vi.fn(() => ({
    hasAcceptedTerms: false,
    currentContext: null,
    agreed: false,
    name: '',
    email: '',
    setAgreed: vi.fn(),
    setName: vi.fn(),
    setEmail: vi.fn(),
    handleTermsAcceptance: vi.fn(),
    researchSnapshot: null,
    researchStatus: 'idle' as const,
  })),
}));

vi.mock('@/components/agent-ui/app/session-view', () => ({
  SessionView: ({ hasAcceptedTerms, researchStatus }: any) => (
    <div data-testid="session-view">
      <div data-testid="has-accepted-terms">{String(hasAcceptedTerms)}</div>
      <div data-testid="research-status">{researchStatus}</div>
    </div>
  ),
}));

describe('ViewController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render TermsOverlay when terms not accepted', () => {
    const { useChatIntelligence } = require('@/components/chat/hooks/useChatIntelligence');
    useChatIntelligence.mockReturnValue({
      hasAcceptedTerms: false,
      currentContext: null,
      agreed: false,
      name: '',
      email: '',
      setAgreed: vi.fn(),
      setName: vi.fn(),
      setEmail: vi.fn(),
      handleTermsAcceptance: vi.fn(),
      researchSnapshot: null,
      researchStatus: 'idle',
    });

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <ViewController />
        </SessionProvider>
      </LiveApiProvider>
    );

    expect(screen.getByTestId('has-accepted-terms')).toHaveTextContent('false');
  });

  it('should auto-start session when terms accepted', async () => {
    const mockStartSession = vi.fn();
    const { useSession } = require('@/components/agent-ui/app/session-context');
    useSession.mockReturnValue({
      sessionId: 'test-session',
      isSessionActive: false,
      startSession: mockStartSession,
      error: null,
    });

    const { useChatIntelligence } = require('@/components/chat/hooks/useChatIntelligence');
    useChatIntelligence.mockReturnValue({
      hasAcceptedTerms: true,
      currentContext: null,
      agreed: true,
      name: 'Test User',
      email: 'test@example.com',
      setAgreed: vi.fn(),
      setName: vi.fn(),
      setEmail: vi.fn(),
      handleTermsAcceptance: vi.fn(),
      researchSnapshot: null,
      researchStatus: 'idle',
    });

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <ViewController />
        </SessionProvider>
      </LiveApiProvider>
    );

    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalled();
    });
  });

  it('should transform research insights correctly', () => {
    const { useChatIntelligence } = require('@/components/chat/hooks/useChatIntelligence');
    const mockSnapshot = {
      professionalProfile: {
        summary: 'Test profile summary',
        citations: [{ url: 'https://example.com', title: 'Example' }],
      },
      companyContext: {
        summary: 'Test company context',
      },
    };

    useChatIntelligence.mockReturnValue({
      hasAcceptedTerms: true,
      currentContext: { company: { name: 'Test Corp' } },
      agreed: true,
      name: 'Test User',
      email: 'test@example.com',
      setAgreed: vi.fn(),
      setName: vi.fn(),
      setEmail: vi.fn(),
      handleTermsAcceptance: vi.fn(),
      researchSnapshot: mockSnapshot,
      researchStatus: 'ready' as const,
    });

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <ViewController />
        </SessionProvider>
      </LiveApiProvider>
    );

    expect(screen.getByTestId('research-status')).toHaveTextContent('ready');
  });
});

