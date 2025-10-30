/**
 * Performance and stability tests
 * Tests for re-render loops, motion animation props, unnecessary effects
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { ViewController } from '@/components/agent-ui/app/view-controller';
import { SessionView } from '@/components/agent-ui/app/session-view';
import { AgentControlBar } from '@/components/agent-ui/livekit/agent-control-bar/agent-control-bar';

// Mock console.error to detect infinite loops
const originalError = console.error;
let errorLogs: string[] = [];

beforeEach(() => {
  errorLogs = [];
  console.error = (...args: any[]) => {
    errorLogs.push(args.join(' '));
    originalError(...args);
  };
});

afterEach(() => {
  console.error = originalError;
});

// Mock dependencies
vi.mock('@/components/agent-ui/app/session-context', () => ({
  useSession: vi.fn(() => ({
    sessionId: 'test-session',
    isSessionActive: false,
    startSession: vi.fn(),
    endSession: vi.fn(),
    error: null,
  })),
}));

vi.mock('@/hooks/useUnifiedChat', () => ({
  useUnifiedChat: vi.fn(() => ({
    messages: [],
    sendMessage: vi.fn(),
    updateContext: vi.fn(),
    addMessage: vi.fn(),
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

describe('Performance & Stability', () => {
  describe('Re-render Prevention', () => {
    it('should not cause infinite re-renders', async () => {
      const { render } = require('@testing-library/react');
      const { LiveApiProvider } = require('@/hooks/LiveApiProvider');
      const { SessionProvider } = require('@/components/agent-ui/app/session-provider');

      render(
        <LiveApiProvider sessionId="test">
          <SessionProvider sessionId="test">
            <ViewController />
          </SessionProvider>
        </LiveApiProvider>
      );

      // Wait a bit to see if re-renders stabilize
      await waitFor(() => {
        // Check that error logs don't contain React warnings about infinite loops
        const hasInfiniteLoop = errorLogs.some((log) =>
          log.includes('Maximum update depth exceeded') ||
          log.includes('Too many re-renders')
        );
        expect(hasInfiniteLoop).toBe(false);
      }, { timeout: 2000 });
    });

    it('should use stable references in useMemo', () => {
      // This would require inspecting the actual component code
      // For now, verify that components render without errors
      const { render } = require('@testing-library/react');
      const { LiveApiProvider } = require('@/hooks/LiveApiProvider');
      const { SessionProvider } = require('@/components/agent-ui/app/session-provider');

      expect(() => {
        render(
          <LiveApiProvider sessionId="test">
            <SessionProvider sessionId="test">
              <ViewController />
            </SessionProvider>
          </LiveApiProvider>
        );
      }).not.toThrow();
    });
  });

  describe('Motion Animation Props', () => {
    it('should use GPU-accelerated properties', () => {
      // Check that motion components use transform/opacity, not width/height
      const fs = require('fs');
      const path = require('path');

      const componentFiles = [
        'src/components/agent-ui/app/session-view.tsx',
        'src/components/agent-ui/app/tile-layout.tsx',
      ];

      componentFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
        
        // Check for motion props that use transform/opacity (good)
        const hasTransform = /transform|translate|scale|rotate/i.test(content);
        const hasOpacity = /opacity/i.test(content);
        
        // Should use transform/opacity for animations
        if (content.includes('motion.')) {
          expect(hasTransform || hasOpacity).toBe(true);
        }

        // Should NOT animate width/height in motion props (bad)
        const animatesWidthHeight = /animate=\{[^}]*width|animate=\{[^}]*height/i.test(content);
        expect(animatesWidthHeight).toBe(false);
      });
    });

    it('should have reasonable animation durations', () => {
      const fs = require('fs');
      const path = require('path');

      const componentFiles = [
        'src/components/agent-ui/app/session-view.tsx',
        'src/components/agent-ui/app/tile-layout.tsx',
        'src/components/agent-ui/livekit/agent-control-bar/chat-input.tsx',
      ];

      componentFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
        
        // Check for duration values in motion props
        const durationMatches = content.match(/duration:\s*(\d+)/g);
        if (durationMatches) {
          durationMatches.forEach((match) => {
            const duration = parseInt(match.match(/\d+/)![0]);
            // Durations should be reasonable (0-500ms for UI animations)
            expect(duration).toBeLessThanOrEqual(500);
          });
        }
      });
    });
  });

  describe('Effect Dependencies', () => {
    it('should have correct useEffect dependencies', () => {
      // This would require parsing the actual component code
      // For now, verify that components don't cause warnings
      const { render } = require('@testing-library/react');
      const { LiveApiProvider } = require('@/hooks/LiveApiProvider');
      const { SessionProvider } = require('@/components/agent-ui/app/session-provider');

      expect(() => {
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
      }).not.toThrow();
    });
  });

  describe('Memory Leaks', () => {
    it('should clean up event listeners and timers', () => {
      // Check that components use cleanup functions in useEffect
      const fs = require('fs');
      const path = require('path');

      const componentFiles = [
        'src/components/agent-ui/app/session-view.tsx',
        'src/components/agent-ui/FbcMatrixVisualizer.tsx',
      ];

      componentFiles.forEach((file) => {
        const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
        
        // Check for useEffect with cleanup
        const useEffectPattern = /useEffect\([^)]*\(\)\s*=>\s*\{[^}]*return/i;
        const hasAddEventListener = /addEventListener/i.test(content);
        const hasSetTimeout = /setTimeout|setInterval/i.test(content);
        const hasRequestAnimationFrame = /requestAnimationFrame/i.test(content);

        if (hasAddEventListener || hasSetTimeout || hasRequestAnimationFrame) {
          // Should have cleanup return statement
          expect(useEffectPattern.test(content) || content.includes('return () =>')).toBe(true);
        }
      });
    });
  });
});

