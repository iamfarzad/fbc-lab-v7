'use client';
import { SessionProvider } from '@/components/agent-ui/app/session-provider';
import { ViewController } from '@/components/agent-ui/app/view-controller';
import { Toaster } from '@/components/agent-ui/livekit/toaster';
import { FBCAudioBridge } from '@/components/agent-ui/FBCAudioBridge';
import { LiveApiProvider } from '@/hooks/LiveApiProvider';
import { AudioResumePrompt } from '@/components/agent-ui/app/audio-resume';

interface AppProps {
  sessionId: string;
  forceTermsReset?: boolean;
}

export function App({ sessionId, forceTermsReset }: AppProps) {
  return (
    <LiveApiProvider sessionId={sessionId}>
      <SessionProvider sessionId={sessionId}>
        <main className="grid h-svh grid-cols-1 place-content-center">
          <ViewController forceTermsReset={forceTermsReset} />
        </main>
        <AudioResumePrompt />
        <FBCAudioBridge />
        <Toaster />
      </SessionProvider>
    </LiveApiProvider>
  );
}
