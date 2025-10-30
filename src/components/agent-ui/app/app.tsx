'use client';
import { SessionProvider } from '@/components/agent-ui/app/session-provider';
import { ViewController } from '@/components/agent-ui/app/view-controller';
import { Toaster } from '@/components/agent-ui/livekit/toaster';
import { FBCAudioBridge } from '@/components/agent-ui/FBCAudioBridge';
import { LiveApiProvider } from '@/hooks/LiveApiProvider';
import { AudioResumePrompt } from '@/components/agent-ui/app/audio-resume';
import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/agent-ui/livekit/button';

interface AppProps {
  sessionId: string;
  forceTermsReset?: boolean;
}

export function App({ sessionId, forceTermsReset }: AppProps) {
  return (
    <LiveApiProvider sessionId={sessionId}>
      <SessionProvider sessionId={sessionId}>
        <main className="grid h-svh grid-cols-1 place-content-center relative">
          {/* Back to home button in top-left */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/"
                  className="absolute top-4 left-4 z-50"
                >
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 rounded-full bg-background/80 backdrop-blur-sm border border-border hover:bg-background transition-colors"
                  >
                    <ArrowLeft weight="bold" className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Back to home
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ViewController forceTermsReset={forceTermsReset} />
        </main>
        <AudioResumePrompt />
        <FBCAudioBridge />
        <Toaster />
      </SessionProvider>
    </LiveApiProvider>
  );
}
