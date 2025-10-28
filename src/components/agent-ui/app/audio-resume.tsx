"use client";

import { useEffect, useState } from "react";
import { useLiveApi } from "@/hooks/useLiveApi";
import { Button } from "@/components/agent-ui/livekit/button";

export function AudioResumePrompt() {
  const live = useLiveApi();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(live.audioContextState === 'suspended' && live.isSessionActive);
  }, [live.audioContextState, live.isSessionActive]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[1000] rounded-md border bg-background/95 px-3 py-2 text-sm shadow">
      <div className="flex items-center gap-2">
        <span>Audio is paused by the browser.</span>
        <Button size="sm" variant="primary" onClick={() => live.resumeAudioContext?.()}>Enable audio</Button>
      </div>
    </div>
  );
}

