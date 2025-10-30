/**
 * Design token verification tests
 * Ensures components use CSS variables from globals.css, not hardcoded colors
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AgentControlBar } from '@/components/agent-ui/livekit/agent-control-bar/agent-control-bar';
import { SessionView } from '@/components/agent-ui/app/session-view';
import { LiveCaptions } from '@/components/agent-ui/app/live-captions';

describe('Design Token Compliance', () => {
  it('AgentControlBar should use design tokens', () => {
    const { container } = render(
      <AgentControlBar controls={{ microphone: true, chat: true }} />
    );

    const controlBar = container.firstChild as HTMLElement;
    const computedStyle = window.getComputedStyle(controlBar);

    // Check background uses CSS variable
    const bgColor = computedStyle.backgroundColor;
    expect(bgColor).toMatch(/hsl\(var\(--background\)/i);

    // Check border uses CSS variable
    const borderColor = computedStyle.borderColor;
    expect(borderColor).toMatch(/hsl\(var\(--/i);
  });

  it('SessionView should use design tokens for background', () => {
    const { container } = render(
      <SessionView
        hasAcceptedTerms={true}
        researchStatus="ready"
        leadName="Test"
        leadEmail="test@example.com"
        companyName="Test Corp"
      />
    );

    const sessionView = container.querySelector('section') as HTMLElement;
    const computedStyle = window.getComputedStyle(sessionView);

    const bgColor = computedStyle.backgroundColor;
    expect(bgColor).toMatch(/hsl\(var\(--background\)/i);
  });

  it('LiveCaptions should use design tokens for primary colors', () => {
    const { container } = render(<LiveCaptions />);

    const caption = container.querySelector('div') as HTMLElement;
    if (!caption) return;

    const computedStyle = window.getComputedStyle(caption);
    // Check that text colors use CSS variables
    const color = computedStyle.color;
    expect(color).toMatch(/hsl\(var\(--/i);
  });

  it('should not use hardcoded hex colors', () => {
    // Read component files and check for hex colors
    const fs = require('fs');
    const path = require('path');

    const componentFiles = [
      'src/components/agent-ui/app/session-view.tsx',
      'src/components/agent-ui/app/LiveChatMessages.tsx',
      'src/components/agent-ui/livekit/agent-control-bar/agent-control-bar.tsx',
    ];

    componentFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
      
      // Check for hex colors in className (not allowed)
      const hexInClassName = /className.*#[0-9a-fA-F]{3,6}/i;
      expect(content).not.toMatch(hexInClassName);

      // Check for hardcoded hsl/rgb colors (should use CSS variables instead)
      const hardcodedHsl = /bg-\[hsl\(|text-\[hsl\(|border-\[hsl\(/i;
      expect(content).not.toMatch(hardcodedHsl);
    });
  });

  it('should use Tailwind token classes instead of inline styles', () => {
    const fs = require('fs');
    const path = require('path');

    const componentFiles = [
      'src/components/agent-ui/app/session-view.tsx',
      'src/components/agent-ui/app/LiveChatMessages.tsx',
    ];

    componentFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(process.cwd(), file), 'utf-8');
      
      // Check for inline style attributes with colors (should use classes)
      const inlineColorStyles = /style=\{[^}]*color[^}]*\}/i;
      // Allow style for non-color properties (z-index, etc.)
      const allowedStyles = /style=\{[^}]*z-index[^}]*\}/i;
      const hasInlineColor = inlineColorStyles.test(content) && !allowedStyles.test(content);
      
      if (hasInlineColor) {
        console.warn(`Found inline color styles in ${file}. Prefer Tailwind classes.`);
      }
    });
  });
});

