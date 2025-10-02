import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-border/30 bg-card px-4 py-4 sm:px-6 sm:py-5 rounded-[24px] shadow-[0_16px_48px_-40px_rgba(12,18,26,0.35)]">
      <div className="text-[11px] uppercase tracking-[0.35em] text-muted-foreground/70">
        Continue with F.B/c
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        {/* Name Input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Your name"
            className="px-3 py-2 text-xs border border-border/40 rounded-full bg-card/80 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40 focus:border-transparent"
          />
        </div>

        {/* Email Input */}
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="work@company.com"
            className="px-3 py-2 text-xs border border-border/40 rounded-full bg-card/80 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent))]/40 focus:border-transparent"
          />
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="inline-terms"
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            className="w-4 h-4 text-[hsl(var(--accent))] bg-card border-border/40 rounded focus:ring-[hsl(var(--accent))]/40"
          />
          <label htmlFor="inline-terms" className="text-xs text-muted-foreground/80 cursor-pointer">
            Accept terms
          </label>
        </div>

        {/* Submit Button */}
        <Button
          onClick={onAcceptTerms}
          disabled={!agreed || !email.trim() || !name.trim()}
          className="rounded-full bg-[hsl(var(--accent))] px-4 text-xs font-semibold tracking-[0.2em] text-[hsl(var(--accent-foreground))] transition-colors duration-150 hover:bg-[hsl(var(--accent))]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

