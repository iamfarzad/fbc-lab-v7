'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Mic, Monitor, Video, CheckCircle2, XCircle } from 'lucide-react';

interface ToolApprovalPromptProps {
  tool: 'enable_voice' | 'enable_screen_share' | 'enable_webcam';
  reason: string;
  onApprove: () => void;
  onDecline: () => void;
}

const toolConfig = {
  enable_voice: {
    icon: Mic,
    title: 'Enable Voice Chat?',
    description: 'This will activate your microphone for voice conversation'
  },
  enable_screen_share: {
    icon: Monitor,
    title: 'Enable Screen Share?',
    description: 'This will allow sharing your screen'
  },
  enable_webcam: {
    icon: Video,
    title: 'Enable Webcam?',
    description: 'This will activate your camera'
  }
};

export function ToolApprovalPrompt({ tool, reason, onApprove, onDecline }: ToolApprovalPromptProps) {
  const config = toolConfig[tool];
  const Icon = config.icon;
  
  return (
    <Alert className="border-blue-500 bg-blue-50">
      <Icon className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">{reason}</p>
        <p className="text-xs text-muted-foreground">{config.description}</p>
        <div className="flex gap-2">
          <Button onClick={onApprove} size="sm" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Accept
          </Button>
          <Button onClick={onDecline} size="sm" variant="outline" className="gap-2">
            <XCircle className="h-4 w-4" />
            Decline
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}

