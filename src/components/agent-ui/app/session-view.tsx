'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChatTranscript } from '@/components/agent-ui/app/chat-transcript';
import { PreConnectMessage } from '@/components/agent-ui/app/preconnect-message';
import { LiveCaptions } from '@/components/agent-ui/app/live-captions';
import { TileLayout } from '@/components/agent-ui/app/tile-layout';
import {
  AgentControlBar,
  type ControlBarControls,
} from '@/components/agent-ui/livekit/agent-control-bar/agent-control-bar';
import { useChatMessages } from '@/components/agent-ui/hooks/useChatMessages';
import { useConnectionTimeout } from '@/components/agent-ui/hooks/useConnectionTimout';
import { useDebugMode } from '@/components/agent-ui/hooks/useDebug';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../livekit/scroll-area/scroll-area';
import { AGENT_UI_CONFIG, FEATURE_FLAGS } from '@/config/constants';
import { useSession } from '@/components/agent-ui/app/session-provider';
import { useCamera } from '@/hooks/useCamera'
import { useScreenShare } from '@/hooks/useScreenShare'
import { useLiveApi } from '@/hooks/useLiveApi'
import { useUnifiedChat } from '@/hooks/useUnifiedChat'
import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtHeader, ChainOfThoughtStep } from '@/components/ai-elements/reasoning/chain-of-thought';
import { Sources, SourcesContent, SourcesTrigger, Source } from '@/components/ai-elements/sources/sources';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, TriangleAlert } from 'lucide-react';

const MotionBottom = motion.create('div');

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';
const BOTTOM_VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
      translateY: '0%',
    },
    hidden: {
      opacity: 0,
      translateY: '100%',
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.3,
    delay: 0.5,
    ease: 'easeOut' as const,
  },
};

interface FadeProps {
  top?: boolean;
  bottom?: boolean;
  className?: string;
}

export type SessionInsights = {
  chainOfThought: Array<{
    id: string;
    label: string;
    description?: string;
    status: 'complete' | 'active' | 'pending';
  }>;
  sources: Array<{ id: string; title: string; url: string; description?: string }>;
  summary?: string;
};

export function Fade({ top = false, bottom = false, className }: FadeProps) {
  return (
    <div
      className={cn(
        'from-background pointer-events-none h-4 bg-linear-to-b to-transparent',
        top && 'bg-linear-to-b',
        bottom && 'bg-linear-to-t',
        className
      )}
    />
  );
}

interface SessionViewProps extends React.ComponentProps<'section'> {
  termsOverlay?: React.ReactNode;
  hasAcceptedTerms: boolean;
  researchStatus: 'idle' | 'loading' | 'ready' | 'skipped' | 'error';
  researchInsights?: SessionInsights | null;
  showWelcomeBanner?: boolean;
  onDismissWelcome?: () => void;
  leadName?: string;
  companyName?: string;
}

export const SessionView = ({
  termsOverlay,
  hasAcceptedTerms,
  researchStatus,
  researchInsights,
  showWelcomeBanner,
  onDismissWelcome,
  leadName,
  companyName,
  ...props
}: SessionViewProps) => {
  useConnectionTimeout(200_000);
  useDebugMode({ enabled: IN_DEVELOPMENT });

  const { sessionId, isSessionActive } = useSession();
  const messages = useChatMessages(sessionId);
  const live = useLiveApi();
  // Shared media hook instances for both layout and controls to stay in sync
  const camera = useCamera({
    sessionId,
    voiceConnectionId: live.session?.connectionId,
    sendRealtimeInput: live.sendRealtimeInput,
    sendContextUpdate: (u) => live.sendContextUpdate(u),
    enableAutoCapture: Boolean(isSessionActive),
    captureInterval: 12000,
  })
  const screenShare = useScreenShare({
    sessionId,
    voiceConnectionId: live.session?.connectionId,
    sendRealtimeInput: live.sendRealtimeInput,
    sendContextUpdate: (u) => live.sendContextUpdate(u),
    enableAutoCapture: Boolean(isSessionActive),
    captureInterval: 4000,
  })
  // Bridge key flags into unified chat context so /api/chat/unified can use them
  const chat = useUnifiedChat({ sessionId })
  React.useEffect(() => {
    chat.updateContext?.({
      voiceActive: isSessionActive,
      webcamActive: camera.isActive,
      screenShareActive: screenShare.isActive,
    } as any)
  }, [isSessionActive, camera.isActive, screenShare.isActive])

  // Chat panel states: minimized | normal | expanded
  type ChatPanelState = 'minimized' | 'normal' | 'expanded'
  const [chatState, setChatState] = useState<ChatPanelState>(() => {
    if (typeof window === 'undefined') return 'normal'
    const saved = window.localStorage.getItem('fbc-live-chat-state') as ChatPanelState | null
    return saved === 'minimized' || saved === 'expanded' || saved === 'normal' ? saved : 'normal'
  })
  useEffect(() => {
    try { window.localStorage.setItem('fbc-live-chat-state', chatState) } catch {}
  }, [chatState])
  const isMinimized = chatState === 'minimized'
  const isExpanded = chatState === 'expanded'

  const controls: ControlBarControls = {
    leave: true,
    microphone: true,
    chat: AGENT_UI_CONFIG.features.chat,
    camera: AGENT_UI_CONFIG.features.video,
    screenShare: AGENT_UI_CONFIG.features.screenShare,
  };

  const insightsPanel = React.useMemo(() => {
    if (!hasAcceptedTerms) return null;

    if (researchStatus === 'error') {
      return (
        <Alert variant="destructive" className="pointer-events-auto absolute right-3 top-4 z-[60] max-w-xs">
          <TriangleAlert className="size-4" />
          <AlertDescription className="text-[12px]">
            Unable to load personalized context. You can still use the assistant freely.
          </AlertDescription>
        </Alert>
      );
    }

    if (researchStatus === 'loading' || researchStatus === 'idle') {
      return (
        <div className="pointer-events-auto absolute right-3 top-4 z-[60] w-[240px] rounded-2xl border bg-card/90 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            Tailoring your briefing…
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Pulling public records, team info, and recent updates so we can hit the ground running.
          </p>
        </div>
      );
    }

    if (researchStatus === 'skipped') {
      return (
        <div className="pointer-events-auto absolute right-3 top-4 z-[60] w-[240px] rounded-2xl border border-dashed bg-card/80 p-3 text-[11px] shadow-md backdrop-blur">
          <span className="font-medium text-foreground">Limited briefing</span>
          <p className="mt-1 text-muted-foreground">
            Using the details you provided. Share a business email next time for deeper research.
          </p>
        </div>
      );
    }

    if (researchInsights) {
      return (
        <div className="pointer-events-auto absolute right-3 top-4 z-[60] w-[260px] space-y-2">
          <div className="rounded-2xl border bg-card/90 p-3 shadow-lg backdrop-blur">
            <ChainOfThought>
              <ChainOfThoughtHeader>{companyName ? `Briefing ready · ${companyName}` : 'Briefing ready'}</ChainOfThoughtHeader>
              <ChainOfThoughtContent>
                {researchInsights.chainOfThought.map((step) => (
                  <ChainOfThoughtStep
                    key={step.id}
                    label={step.label}
                    description={step.description}
                    status={step.status ?? 'complete'}
                  />
                ))}
              </ChainOfThoughtContent>
            </ChainOfThought>
            {researchInsights.summary && (
              <p className="mt-2 text-[11px] text-muted-foreground whitespace-pre-line">
                {researchInsights.summary}
              </p>
            )}
          </div>
          {researchInsights.sources.length > 0 && (
            <Sources>
              <SourcesTrigger count={researchInsights.sources.length} />
              <SourcesContent>
                {researchInsights.sources.map((source) => (
                  <div key={source.id} className="flex flex-col">
                    <Source href={source.url} title={source.title} />
                    {source.description && (
                      <span className="pl-5 text-[10px] text-muted-foreground">{source.description}</span>
                    )}
                  </div>
                ))}
              </SourcesContent>
            </Sources>
          )}
        </div>
      );
    }

    return null;
  }, [hasAcceptedTerms, researchStatus, researchInsights, companyName]);

  return (
    <section className="bg-background relative z-10 h-full w-full overflow-hidden" {...props}>
      {insightsPanel}
      {termsOverlay}
      {/* Chat Transcript */}
      <div className={cn('fixed inset-0 grid grid-cols-1 grid-rows-1', isMinimized && 'pointer-events-none')}>
        <Fade top className="absolute inset-x-4 top-0 h-40" />
        <ScrollArea className="px-4 pt-40 pb-[150px] md:px-6 md:pb-[180px]">
          <ChatTranscript
            hidden={isMinimized}
            messages={messages}
            className={cn(
              'mx-auto space-y-3 transition-opacity duration-300 ease-out',
              isExpanded ? 'max-w-3xl md:max-w-4xl' : 'max-w-2xl'
            )}
          />
        </ScrollArea>
      </div>

      {/* Tile Layout */}
      <TileLayout chatOpen={!isMinimized} camera={camera} screen={screenShare} />

      {/* Bottom */}
      <MotionBottom
        {...BOTTOM_VIEW_MOTION_PROPS}
        className="fixed inset-x-3 bottom-0 z-50 md:inset-x-12"
      >
        {AGENT_UI_CONFIG.features.transcripts && (
          <PreConnectMessage messages={messages} className="pb-4" />
        )}
        {FEATURE_FLAGS.SHOW_VOICE_OVERLAY && (
          <div className="mx-auto max-w-2xl pb-1">
            <LiveCaptions />
          </div>
        )}
        <div className="bg-background relative mx-auto max-w-2xl pb-3 md:pb-12">
          <Fade bottom className="absolute inset-x-0 top-0 h-4 -translate-y-full" />
          {showWelcomeBanner && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-3 flex items-start gap-2 rounded-2xl border bg-card/90 px-4 py-3 text-left shadow-md backdrop-blur"
            >
              <Sparkles className="mt-0.5 size-4 text-primary" />
              <div className="text-[12px] text-muted-foreground">
                <p className="font-medium text-foreground">Welcome {leadName || 'there'}! We’re live.</p>
                <p className="mt-1">
                  Ask anything, or say <span className="font-semibold">“What did you find out about me?”</span> to review the briefing sources.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDismissWelcome?.()}
                className="ml-auto text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </motion.div>
          )}
          <AgentControlBar
            controls={controls}
            chatState={chatState}
            onChatStateChange={setChatState}
            camera={camera}
            screenShare={screenShare}
          />
        </div>
      </MotionBottom>
      {/* Bridge is already mounted at App level via LiveApiProvider/App */}
    </section>
  );
};
