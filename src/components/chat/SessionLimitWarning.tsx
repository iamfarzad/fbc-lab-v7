'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Calendar } from 'lucide-react';

interface SessionLimitWarningProps {
  sessionId: string;
  usage: any;
}

export function SessionLimitWarning({ sessionId, usage }: SessionLimitWarningProps) {
  const [showProposal, setShowProposal] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  if (!usage) return null;
  
  const sessionMinutes = (Date.now() - usage.started_at) / 60000;
  const timeLeft = Math.max(0, usage.max_session_duration - sessionMinutes);
  
  // Show proposal option after user has engaged (5+ messages OR 5+ minutes)
  const hasEngaged = usage.messages_sent >= 5 || sessionMinutes >= 5;
  
  // Show warning at 5 minutes left
  const showWarning = timeLeft <= 5 && timeLeft > 0;
  
  // Session ended
  const sessionEnded = timeLeft <= 0;
  
  useEffect(() => {
    if (sessionEnded || hasEngaged) {
      setShowProposal(true);
    }
  }, [sessionEnded, hasEngaged]);
  
  const handleDownloadProposal = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'FBC-Proposal.pdf';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        console.error('Failed to generate proposal');
      }
    } catch (error) {
      console.error('Failed to generate proposal:', error);
    } finally {
      setGenerating(false);
    }
  };
  
  // Show proposal download anytime after engagement
  if (showProposal && hasEngaged && !sessionEnded) {
    return (
      <Alert className="border-blue-500 bg-blue-50 mb-4">
        <AlertDescription className="space-y-3">
          <p className="font-semibold">💼 Ready to take the next step?</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleDownloadProposal} disabled={generating} size="sm">
              <Download className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'Download Proposal'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open('https://calendly.com/farzad-fbc', '_blank')}>
              <Calendar className="w-4 h-4 mr-2" />
              Book Call
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your personalized proposal and next steps - available anytime during our conversation.
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  
  // Session ended - show final CTA
  if (sessionEnded && showProposal) {
    return (
      <Alert className="border-green-500 bg-green-50 mb-4">
        <AlertDescription className="space-y-4">
          <p className="font-semibold">🎉 Great conversation! Here's your personalized proposal:</p>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleDownloadProposal} disabled={generating}>
              <Download className="w-4 h-4 mr-2" />
              {generating ? 'Generating PDF...' : 'Download Your Proposal'}
            </Button>
            <Button variant="outline" onClick={() => window.open('https://calendly.com/farzad-fbc', '_blank')}>
              <Calendar className="w-4 h-4 mr-2" />
              Book Strategy Call
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your demo session has ended. You can continue chatting about the proposal, but premium features (voice, screen share, research) are now disabled. Ready to unlock the full experience? Book a call!
          </p>
        </AlertDescription>
      </Alert>
    );
  }
  
  if (showWarning) {
    return (
      <Alert className="border-yellow-500 bg-yellow-50 mb-4">
        <AlertDescription>
          ⏰ {Math.ceil(timeLeft)} minutes left in your session. We'll generate a personalized proposal when time's up!
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}

