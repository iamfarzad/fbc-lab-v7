'use client';

import { useEffect, useRef } from 'react';
import { useLiveApi } from '@/hooks/useLiveApi';
import { useUnifiedChatActions } from '@/core/chat/state/unified-chat-store';

// Bridges voice input (final user transcript) to the unified chat API so that
// /live shows rich AI-elements messages (metadata, sources, artifacts).
export function FBCAudioBridge() {
  const liveApi = useLiveApi();
  const { sendMessage } = useUnifiedChatActions();
  // Track the last single utterance we forwarded to unified chat
  const lastSentLineRef = useRef<string>('');

  // When a final user transcript lands, send only the newest final line
  useEffect(() => {
    const transcript = liveApi.transcript?.trim();
    
    // DEBUG: Log transcript state for debugging production issues
    if (transcript && transcript !== lastSentLineRef.current) {
      console.log('[FBCAudioBridge] Transcript received:', {
        hasTranscript: Boolean(transcript),
        transcriptLength: transcript?.length || 0,
        hasSendMessage: typeof sendMessage === 'function'
      });
    }
    
    if (!transcript) return;

    // Heuristic: treat each final utterance as a line; forward only the newest line
    const lines = transcript.split('\n').map((s) => s.trim()).filter(Boolean);
    const lastLine = lines.length > 0 ? lines[lines.length - 1] : '';
    if (!lastLine) return;
    if (lastLine === lastSentLineRef.current) return;

    if (typeof sendMessage === 'function') {
      console.log('[FBCAudioBridge] Forwarding transcript to unified chat:', lastLine);
      lastSentLineRef.current = lastLine;
      void sendMessage(lastLine);
    } else {
      console.warn('[FBCAudioBridge] sendMessage not available, transcript not forwarded:', lastLine);
    }
  }, [liveApi.transcript, sendMessage]);

  return null;
}
