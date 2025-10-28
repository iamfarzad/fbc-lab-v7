"use client";

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatTermsAcceptance } from '@/components/chat/components/ChatTermsAcceptance';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';

interface TermsOverlayProps {
  open: boolean;
  name: string;
  email: string;
  agreed: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onAgreedChange: (value: boolean) => void;
  onAcceptTerms: () => void;
  onForceAccept?: () => void;
  error?: string | null;
}

export function TermsOverlay({
  open,
  name,
  email,
  agreed,
  onNameChange,
  onEmailChange,
  onAgreedChange,
  onAcceptTerms,
  onForceAccept,
  error,
}: TermsOverlayProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        className={cn(
          'max-w-lg border-none bg-background/95 backdrop-blur-lg p-0 overflow-hidden shadow-2xl',
          'monochrome:rounded-none monochrome:border-2 monochrome:bg-background'
        )}
      >
        <DialogTitle className="sr-only">Live concierge access onboarding</DialogTitle>
        <div className="relative grid gap-0">
          <div className="absolute inset-x-0 -top-8 flex justify-center">
            <div className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground shadow-md">
              Live concierge access
            </div>
          </div>

          <div className="space-y-3 px-6 pt-10 pb-1 text-center">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Before we jump in…
            </h2>
            <p className="text-muted-foreground text-sm">
              Share a few details so F.B/c can tailor the session to you and prepare the right sources.
            </p>
          </div>

          <div className="px-6 pb-6">
            <ChatTermsAcceptance
              name={name}
              email={email}
              agreed={agreed}
              onNameChange={onNameChange}
              onEmailChange={onEmailChange}
              onAgreedChange={onAgreedChange}
              onAcceptTerms={onAcceptTerms}
            />

            {error && (
              <Alert variant="destructive" className="mt-4">
                <TriangleAlert className="size-4" />
                <AlertTitle>Connection issue</AlertTitle>
                <AlertDescription className="text-[13px]">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {onForceAccept && (
              <Button
                variant="ghost"
                className="mt-3 w-full text-[12px] text-muted-foreground hover:text-foreground"
                onClick={onForceAccept}
              >
                Skip form (demo mode)
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
