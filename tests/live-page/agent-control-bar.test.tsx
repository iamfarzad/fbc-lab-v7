/**
 * Unit tests for AgentControlBar component
 * Tests toggle controls, file upload, export summary, schedule button
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentControlBar } from '@/components/agent-ui/livekit/agent-control-bar/agent-control-bar';
import { SessionProvider } from '@/components/agent-ui/app/session-provider';
import { LiveApiProvider } from '@/hooks/LiveApiProvider';

// Mock dependencies
vi.mock('@/components/agent-ui/app/session-context', () => ({
  useSession: vi.fn(() => ({
    sessionId: 'test-session',
    isSessionActive: true,
    endSession: vi.fn(),
    error: null,
  })),
}));

vi.mock('@/hooks/useLiveApi', () => ({
  useLiveApi: vi.fn(() => ({
    isRecording: false,
    isSessionActive: true,
    uploadAttachments: vi.fn(),
  })),
}));

vi.mock('@/hooks/useAgentUIAdapter', () => ({
  useAgentUIAdapter: vi.fn(() => ({
    toggleMicrophone: vi.fn(),
  })),
}));

vi.mock('@/hooks/useCamera', () => ({
  useCamera: vi.fn(() => ({
    isActive: false,
    startCamera: vi.fn(),
    stopCamera: vi.fn(),
  })),
}));

vi.mock('@/hooks/useScreenShare', () => ({
  useScreenShare: vi.fn(() => ({
    isActive: false,
    startScreenShare: vi.fn(),
    stopScreenShare: vi.fn(),
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

global.fetch = vi.fn();

describe('AgentControlBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({}),
      blob: async () => new Blob(),
    });
  });

  it('should toggle microphone when button clicked', async () => {
    const mockToggleMicrophone = vi.fn();
    const { useAgentUIAdapter } = require('@/hooks/useAgentUIAdapter');
    useAgentUIAdapter.mockReturnValue({
      toggleMicrophone: mockToggleMicrophone,
    });

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <AgentControlBar controls={{ microphone: true }} />
        </SessionProvider>
      </LiveApiProvider>
    );

    const micButton = screen.getByLabelText(/toggle microphone/i);
    fireEvent.click(micButton);

    await waitFor(() => {
      expect(mockToggleMicrophone).toHaveBeenCalled();
    });
  });

  it('should toggle camera when button clicked', async () => {
    const mockStartCamera = vi.fn();
    const mockStopCamera = vi.fn();
    const { useCamera } = require('@/hooks/useCamera');
    useCamera.mockReturnValue({
      isActive: false,
      startCamera: mockStartCamera,
      stopCamera: mockStopCamera,
    });

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <AgentControlBar controls={{ camera: true }} camera={{ isActive: false, startCamera: mockStartCamera, stopCamera: mockStopCamera } as any} />
        </SessionProvider>
      </LiveApiProvider>
    );

    const cameraButton = screen.getByLabelText(/toggle camera/i);
    fireEvent.click(cameraButton);

    await waitFor(() => {
      expect(mockStartCamera).toHaveBeenCalled();
    });
  });

  it('should handle file upload', async () => {
    const mockUploadAttachments = vi.fn().mockResolvedValue({
      ok: true,
      attachments: [{ id: '1', type: 'document' }],
    });
    const mockSendMessage = vi.fn();
    const { useLiveApi } = require('@/hooks/useLiveApi');
    useLiveApi.mockReturnValue({
      isRecording: false,
      isSessionActive: true,
      uploadAttachments: mockUploadAttachments,
    });

    const mockUnifiedChat = {
      sendMessage: mockSendMessage,
      messages: [],
    };

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <AgentControlBar controls={{ chat: true }} unifiedChat={mockUnifiedChat as any} />
        </SessionProvider>
      </LiveApiProvider>
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    Object.defineProperty(fileInput, 'files', {
      value: dataTransfer.files,
      writable: false,
    });

    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(mockUploadAttachments).toHaveBeenCalled();
    });
  });

  it('should export summary PDF when button clicked', async () => {
    const mockBlob = new Blob(['test pdf'], { type: 'application/pdf' });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    });

    // Mock URL.createObjectURL and click
    const mockCreateObjectURL = vi.fn(() => 'blob:test-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const mockClick = vi.fn();
    const mockCreateElement = vi.fn(() => ({
      href: '',
      download: '',
      click: mockClick,
    })) as any;
    Object.defineProperty(document, 'createElement', {
      value: mockCreateElement,
      writable: true,
    });

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <AgentControlBar controls={{ leave: true }} />
        </SessionProvider>
      </LiveApiProvider>
    );

    const moreButton = screen.getByLabelText(/more actions/i);
    fireEvent.click(moreButton);

    const exportButton = await screen.findByText(/export summary pdf/i);
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/export-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'test-session' }),
      });
    });
  });

  it('should schedule call when button clicked', () => {
    const mockOpen = vi.fn();
    global.window.open = mockOpen;

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <AgentControlBar controls={{ leave: true }} />
        </SessionProvider>
      </LiveApiProvider>
    );

    const moreButton = screen.getByLabelText(/more actions/i);
    fireEvent.click(moreButton);

    const scheduleButton = screen.getByText(/schedule a call/i);
    fireEvent.click(scheduleButton);

    expect(mockOpen).toHaveBeenCalled();
  });

  it('should update chat state when transcript toggle clicked', async () => {
    const mockOnChatStateChange = vi.fn();

    render(
      <LiveApiProvider sessionId="test">
        <SessionProvider sessionId="test">
          <AgentControlBar
            controls={{ chat: true }}
            chatState="normal"
            onChatStateChange={mockOnChatStateChange}
          />
        </SessionProvider>
      </LiveApiProvider>
    );

    const transcriptButton = screen.getByLabelText(/toggle transcript/i);
    fireEvent.click(transcriptButton);

    await waitFor(() => {
      expect(mockOnChatStateChange).toHaveBeenCalled();
    });
  });
});

