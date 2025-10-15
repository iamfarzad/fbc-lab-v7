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
  return (
    <div className={cn(
      "border bg-card p-6 space-y-4 shadow-lg max-w-md mx-auto",
      VISUAL.CORNER_RADIUS,
      "[.monochrome_&]:rounded-none [.monochrome_&]:shadow-none [.monochrome_&]:border-2"
    )}>
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
            placeholder="Your name"
            className="h-10"
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
            placeholder="work@company.com"
            className="h-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="terms"
            checked={agreed}
            onCheckedChange={(checked) => onAgreedChange(checked === true)}
          />
          <Label 
            htmlFor="terms" 
            className="text-xs text-muted-foreground cursor-pointer"
          >
            I accept the terms and conditions
          </Label>
        </div>

        <Button
          onClick={onAcceptTerms}
          disabled={!agreed || !email.trim() || !name.trim()}
          className="w-full min-h-[44px]"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
