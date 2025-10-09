import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Camera, Monitor, Shield, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VISUAL } from '../design-tokens';

interface PermissionExplanationDialogProps {
  type: 'voice' | 'camera' | 'screen' | null;
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const permissionInfo = {
  voice: {
    icon: Mic,
    title: 'Microphone Access Needed',
    description: 'To enable voice conversations with F.B/c AI, we need access to your microphone.',
    details: [
      'Your voice will be transcribed in real-time',
      'Audio is sent securely to Google\'s Gemini API',
      'No recordings are stored permanently',
      'You can stop at any time',
    ],
    privacy: 'We respect your privacy. Audio is processed for transcription only and is not saved or shared with third parties.',
  },
  camera: {
    icon: Camera,
    title: 'Camera Access Needed',
    description: 'To enable visual context in conversations, we need access to your camera.',
    details: [
      'Share visual context with the AI',
      'Preview shows exactly what the AI sees',
      'Video is sent securely for analysis',
      'You can switch between available cameras',
    ],
    privacy: 'Camera feed is used for AI analysis only. No video is recorded or stored.',
  },
  screen: {
    icon: Monitor,
    title: 'Screen Sharing Permission',
    description: 'To help you with on-screen tasks, we need permission to see your screen.',
    details: [
      'Choose to share entire screen, window, or browser tab',
      'AI can analyze and help with what you show',
      'Preview shows exactly what\'s being shared',
      'Stop sharing anytime',
    ],
    privacy: 'Screen content is analyzed in real-time only. No screenshots or recordings are saved.',
  },
};

export function PermissionExplanationDialog({
  type,
  isOpen,
  onAccept,
  onDecline,
}: PermissionExplanationDialogProps) {
  if (!type) return null;

  const info = permissionInfo[type];
  const Icon = info.icon;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent className={cn("sm:max-w-[500px]", VISUAL.CORNER_RADIUS)}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-accent/10">
              <Icon className="h-6 w-6 text-accent" />
            </div>
            <DialogTitle className="text-xl">{info.title}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {info.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* What will happen */}
          <div className={cn("bg-muted/50 p-4 space-y-2", VISUAL.CORNER_RADIUS)}>
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">What will happen:</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {info.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Privacy note */}
          <div className={cn("bg-blue-500/10 border border-blue-500/20 p-3", VISUAL.CORNER_RADIUS)}>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                {info.privacy}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onDecline}
            className="min-w-[100px]"
          >
            Not Now
          </Button>
          <Button
            onClick={onAccept}
            className="min-w-[100px] bg-accent hover:bg-accent/90"
          >
            Allow Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

