import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { VISUAL } from "../design-tokens";

interface ChatTermsAcceptanceProps {
  name: string;
  email: string;
  agreed: boolean;
  onNameChange: (name: string) => void;
  onEmailChange: (email: string) => void;
  onAgreedChange: (agreed: boolean) => void;
  onAcceptTerms: () => void;
}

export function ChatTermsAcceptance({
  name,
  email,
  agreed,
  onNameChange,
  onEmailChange,
  onAgreedChange,
  onAcceptTerms,
}: ChatTermsAcceptanceProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (agreed && email.trim() && name.trim()) {
      onAcceptTerms();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && agreed && email.trim() && name.trim()) {
      e.preventDefault();
      onAcceptTerms();
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={cn(
        "border bg-card p-6 space-y-4 shadow-lg max-w-md mx-auto",
        VISUAL.CORNER_RADIUS,
        "[.monochrome_&]:rounded-none [.monochrome_&]:shadow-none [.monochrome_&]:border-2"
      )}
      role="form"
      aria-label="Terms and conditions acceptance form"
    >
      <div className="text-xs uppercase tracking-widest text-muted-foreground text-center">
        Continue with F.B/c
      </div>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-xs text-muted-foreground mb-1">
            Name
          </Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Your name"
            className="h-10"
            aria-required="true"
            aria-invalid={!name.trim()}
            autoComplete="name"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-xs text-muted-foreground mb-1">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="work@company.com"
            className="h-10"
            aria-required="true"
            aria-invalid={!email.trim()}
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked) => onAgreedChange(checked === true)}
              onKeyDown={handleKeyDown}
              className="mt-0.5"
              aria-required="true"
            />
            <Label 
              htmlFor="terms" 
              className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
            >
              I agree to the{' '}
              <a 
                href="/docs/terms-and-conditions" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Terms and Conditions
              </a>
              {' '}and{' '}
              <a 
                href="/docs/privacy-policy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
            </Label>
          </div>
          <p id="terms-description" className="text-[10px] text-muted-foreground ml-6 leading-relaxed">
            Your data will be processed according to GDPR regulations. Voice transcripts and visual captures are automatically deleted after 7 days.
          </p>
        </div>

        <Button
          type="submit"
          disabled={!agreed || !email.trim() || !name.trim()}
          className="w-full min-h-[44px]"
          aria-describedby="terms-description"
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
