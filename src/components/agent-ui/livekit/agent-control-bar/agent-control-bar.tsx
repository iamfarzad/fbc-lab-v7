'use client';

import { type HTMLAttributes, useCallback, useState } from 'react';
import { ChatTextIcon, CameraIcon, MonitorIcon, PaperclipIcon, DownloadSimpleIcon, CalendarBlankIcon, PlusIcon } from '@phosphor-icons/react/dist/ssr';
import { useSession } from '@/components/agent-ui/app/session-context';
import { Button } from '@/components/agent-ui/livekit/button';
import { Toggle } from '@/components/agent-ui/livekit/toggle';
import { cn } from '@/lib/utils';
import { ChatInput } from './chat-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAgentUIAdapter } from '@/hooks/useAgentUIAdapter';
import { useLiveApi } from '@/hooks/useLiveApi';
import { CONTACT_CONFIG } from '@/config/constants'
import { toast } from 'sonner'
import { useRef } from 'react'
import { VoiceIcon } from '@/components/ui/voice-button';
import { LiveWaveform } from '@/components/ui/live-waveform';
// useSession already imported above

export interface ControlBarControls {
  leave?: boolean;
  camera?: boolean;
  microphone?: boolean;
  screenShare?: boolean;
  chat?: boolean;
}

import { useCamera as useCameraHook } from '@/hooks/useCamera'
import { useScreenShare as useScreenShareHook } from '@/hooks/useScreenShare'

type CameraHook = ReturnType<typeof useCameraHook>
type ScreenHook = ReturnType<typeof useScreenShareHook>

type ChatPanelState = 'minimized' | 'normal' | 'expanded'

export interface AgentControlBarProps  {
  controls?: ControlBarControls;
  onDisconnect?: () => void;
  onChatOpenChange?: (open: boolean) => void; // backwards compatibility
  chatState?: ChatPanelState;
  onChatStateChange?: (state: ChatPanelState) => void;
  camera?: CameraHook;
  screenShare?: ScreenHook;
  unifiedChat?: ReturnType<typeof import('@/hooks/useUnifiedChat').useUnifiedChat>;
}

/**
 * A control bar specifically designed for voice assistant interfaces
 */
export function AgentControlBar({
  controls,
  className,
  onDisconnect,
  onChatOpenChange,
  chatState,
  onChatStateChange,
  camera: cameraProp,
  screenShare: screenShareProp,
  unifiedChat,
  ...props
}: AgentControlBarProps & HTMLAttributes<HTMLDivElement>) {
  const adapter = useAgentUIAdapter();
  const liveApi = useLiveApi();
  // Always call hooks, but prefer shared instances passed from parent to keep UI in sync
  const cameraHook = useCameraHook()
  const screenShareHook = useScreenShareHook()
  const camera = cameraProp ?? cameraHook
  const screenShare = screenShareProp ?? screenShareHook
  const [chatOpenInternal, setChatOpenInternal] = useState(false);
  const { isSessionActive, endSession, sessionId } = useSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null)


  const handleSendMessage = async (message: string) => {
    if (unifiedChat) {
      await unifiedChat.sendMessage(message);
    } else {
      console.warn('AgentControlBar: No unified chat instance provided as prop');
    }
  };

  const nextChatState = useCallback((state: ChatPanelState): ChatPanelState => {
    return state === 'minimized' ? 'normal' : state === 'normal' ? 'expanded' : 'minimized'
  }, [])

  const handleToggleTranscript = useCallback(() => {
    if (chatState && onChatStateChange) {
      const next = nextChatState(chatState)
      onChatStateChange(next)
      onChatOpenChange?.(next !== 'minimized')
    } else {
      // Fallback to boolean toggle
      setChatOpenInternal((prev) => {
        const nextOpen = !prev
        onChatOpenChange?.(nextOpen)
        return nextOpen
      })
    }
  }, [chatState, onChatStateChange, onChatOpenChange, nextChatState])

  const handleDisconnect = useCallback(async () => {
    endSession();
    onDisconnect?.();
  }, [endSession, onDisconnect]);

  const handleFileButtonClick = useCallback(() => {
    if (!fileInputRef.current) return
    fileInputRef.current.value = ''
    fileInputRef.current.click()
  }, [])

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(async (e) => {
    try {
      const files = e.target.files ? Array.from(e.target.files) : []
      if (!files.length || !sessionId) return
      const res = await liveApi.uploadAttachments(files, sessionId)
      if (!res.ok) {
        toast.error(res.error || 'Upload failed')
        return
      }
      const count = res.attachments?.length || files.length
      toast.success(`Uploaded ${count} file${count === 1 ? '' : 's'}`)
      if (res.prompt) {
        // Kick off a chat turn using server-provided prompt (e.g., extracted from docs)
        if (unifiedChat) {
          void unifiedChat.sendMessage(res.prompt)
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload error')
    }
  }, [liveApi, sessionId, unifiedChat])

  const handleExportSummary = useCallback(async () => {
    try {
      if (!sessionId) {
        toast.error('No session to export')
        return
      }
      toast.message('Generating PDF summary...')
      const response = await fetch('/api/export-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${response.status}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fbc-consultation-summary-${String(sessionId).slice(0, 8)}.pdf`
      a.click()
      try { URL.revokeObjectURL(url) } catch { /* ignore */ }
      toast.success('Summary PDF downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }, [sessionId])

  const handleSchedule = useCallback(() => {
    const url = CONTACT_CONFIG.SCHEDULING.BOOKING_URL
    try {
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      // As a fallback, navigate in the same tab
      window.location.href = url
    }
  }, [])

  const visibleControls = {
    leave: controls?.leave ?? true,
    microphone: controls?.microphone ?? true,
    screenShare: controls?.screenShare ?? true,
    camera: controls?.camera ?? true,
    chat: controls?.chat ?? true,
  };

  const isAgentAvailable = liveApi.isSessionActive

  const chatOpenNormalized = chatState ? chatState !== 'minimized' : chatOpenInternal

  return (
    <div
      aria-label="Voice assistant controls"
      className={cn(
        'bg-background/95 backdrop-blur-sm border-input/50 dark:border-muted/50',
        'flex flex-col rounded-3xl border p-3',
        'shadow-lg shadow-black/5 dark:shadow-black/20',
        'transition-shadow duration-200 hover:shadow-xl hover:shadow-black/10',
        className
      )}
      {...props}
    >
      {/* Chat Input */}
      {visibleControls.chat && (
        <ChatInput
          chatOpen={chatOpenNormalized}
          isAgentAvailable={isAgentAvailable}
          onSend={handleSendMessage}
        />
      )}

      <div className="flex gap-2">
        <div className="flex grow gap-2">
          {/* Toggle Microphone */}
          {visibleControls.microphone && (
            <Toggle
              size="icon"
              variant="secondary"
              aria-label="Toggle microphone"
              pressed={liveApi.isRecording}
              onPressedChange={() => adapter.toggleMicrophone()}
              className={cn(
                'transition-all duration-200',
                liveApi.isRecording && 'ring-2 ring-primary/30 ring-offset-1 ring-offset-background'
              )}
            >
              <VoiceIcon 
                size={16} 
                isActive={liveApi.isRecording} 
                isProcessing={false}
              />
            </Toggle>
          )}

          {/* Toggle Camera */}
          {visibleControls.camera && (
            <Toggle
              size="icon"
              variant="secondary"
              aria-label="Toggle camera"
              pressed={camera.isActive}
              onPressedChange={() => {
                if (camera.isActive) camera.stopCamera(); else void camera.startCamera();
              }}
              className={cn(
                'transition-all duration-200',
                camera.isActive && 'ring-2 ring-primary/30 ring-offset-1 ring-offset-background'
              )}
            >
              <CameraIcon weight="bold" />
            </Toggle>
          )}

          {/* Toggle Screen Share */}
          {visibleControls.screenShare && (
            <Toggle
              size="icon"
              variant="secondary"
              aria-label="Toggle screen share"
              pressed={screenShare.isActive}
              onPressedChange={() => {
                if (screenShare.isActive) screenShare.stopScreenShare(); else void screenShare.startScreenShare();
              }}
              className={cn(
                'transition-all duration-200',
                screenShare.isActive && 'ring-2 ring-primary/30 ring-offset-1 ring-offset-background'
              )}
            >
              <MonitorIcon weight="bold" />
            </Toggle>
          )}

          {/* Toggle Transcript */}
          <Toggle
            size="icon"
            variant="secondary"
            aria-label="Toggle transcript"
            pressed={chatState ? chatState !== 'minimized' : chatOpenInternal}
            onPressedChange={handleToggleTranscript}
            className={cn(
              'transition-all duration-200',
              (chatState ? chatState !== 'minimized' : chatOpenInternal) && 'ring-2 ring-primary/30 ring-offset-1 ring-offset-background'
            )}
          >
            <ChatTextIcon weight="bold" />
          </Toggle>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,application/pdf,text/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Actions Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Toggle
                size="icon"
                variant="secondary"
                aria-label="More actions"
                pressed={false}
                className="transition-all duration-200"
              >
                <PlusIcon weight="bold" />
              </Toggle>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleFileButtonClick} className="cursor-pointer">
                <PaperclipIcon className="mr-2 h-4 w-4" />
                Upload files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportSummary} className="cursor-pointer">
                <DownloadSimpleIcon className="mr-2 h-4 w-4" />
                Export summary PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSchedule} className="cursor-pointer">
                <CalendarBlankIcon className="mr-2 h-4 w-4" />
                Schedule a call
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Disconnect */}
        {visibleControls.leave && (
          <Button
            variant="destructive"
            onClick={handleDisconnect}
            disabled={!isSessionActive}
            className={cn(
              'transition-all duration-200',
              'hover:scale-[1.02] active:scale-[0.98]',
              'shadow-sm hover:shadow-md',
              'relative overflow-hidden p-0',
              !isSessionActive && 'opacity-50 cursor-not-allowed'
            )}
            style={{ width: '548px', height: '80px' }}
          >
            <LiveWaveform
              mode="scrolling"
              active={true}
              height={80}
              barWidth={3}
              barGap={2}
              barColor="currentColor"
              fadeEdges={true}
              className="block h-full w-full"
            />
          </Button>
        )}
      </div>
    </div>
  );
}
