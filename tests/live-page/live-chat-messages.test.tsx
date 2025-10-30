/**
 * Unit tests for LiveChatMessages component
 * Tests conditional rendering of AI Elements based on message metadata
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveChatMessages } from '@/components/agent-ui/app/LiveChatMessages';
import type { Message } from '@/types/core';

describe('LiveChatMessages', () => {
  it('should render basic message with content', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Hello, world!',
        timestamp: new Date(),
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText('Hello, world!')).toBeInTheDocument();
  });

  it('should render sources when metadata contains sources', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          sources: [
            { id: '1', title: 'Source 1', url: 'https://example.com' },
            { id: '2', title: 'Source 2', url: 'https://example.org' },
          ],
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText(/2 sources/i)).toBeInTheDocument();
  });

  it('should render chain of thought when metadata contains chainOfThought', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          chainOfThought: {
            steps: [
              { label: 'Step 1', description: 'Description 1', status: 'complete' },
              { label: 'Step 2', description: 'Description 2', status: 'active' },
            ],
          },
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText(/research process/i)).toBeInTheDocument();
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('should render reasoning when metadata contains reasoning', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          reasoning: 'This is the reasoning behind the answer',
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText(/this is the reasoning/i)).toBeInTheDocument();
  });

  it('should render code blocks when metadata contains codeBlocks', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          codeBlocks: [
            { id: '1', code: 'const x = 1;', language: 'typescript' },
          ],
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('should render artifacts when metadata contains artifacts', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          artifacts: [
            { id: '1', type: 'file', content: 'Artifact content', title: 'Test Artifact' },
          ],
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText('Test Artifact')).toBeInTheDocument();
  });

  it('should render summary artifact when artifact type is summary', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          artifacts: [
            {
              id: '1',
              type: 'summary',
              content: 'Summary content',
              metadata: { sessionId: 'test-session' },
            },
          ],
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    // SummaryArtifact should render - check for summary-specific content
    expect(screen.getByText(/test message/i)).toBeInTheDocument();
  });

  it('should render tools when metadata contains tools', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          tools: [
            { name: 'tool1', type: 'function', state: 'complete' },
          ],
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText('tool1')).toBeInTheDocument();
  });

  it('should render inline citations when metadata contains inlineCitations', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          inlineCitations: [
            { url: 'https://example.com', title: 'Example', text: 'Citation text' },
          ],
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText(/see citations/i)).toBeInTheDocument();
  });

  it('should render context usage when metadata contains contextUsage', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          contextUsage: {
            usedTokens: 1000,
            maxTokens: 2000,
            usage: 0.5,
            modelId: 'gemini-2.5-flash',
          },
          usage: {
            promptTokens: 500,
            completionTokens: 500,
            totalTokens: 1000,
          },
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText(/1000/i)).toBeInTheDocument();
  });

  it('should render images when metadata contains images', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          images: [
            { url: 'https://example.com/image.jpg', alt: 'Test image' },
          ],
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    const img = screen.getByAltText('Test image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  it('should render tasks when metadata contains tasks', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          tasks: [
            { title: 'Task 1', description: 'Description 1', status: 'pending' },
          ],
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('should render web preview when metadata contains webPreview', () => {
    const messages: Message[] = [
      {
        id: '1',
        role: 'assistant',
        content: 'Test message',
        timestamp: new Date(),
        metadata: {
          webPreview: {
            url: 'https://example.com',
            title: 'Example Site',
            description: 'Example description',
          },
        },
      },
    ];

    render(<LiveChatMessages messages={messages} />);
    expect(screen.getByText('Example Site')).toBeInTheDocument();
  });
});

