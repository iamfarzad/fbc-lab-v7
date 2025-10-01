import React from "react";

interface ChatTermsAcceptanceProps {
  agreed: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  onAgreedChange: (agreed: boolean) => void;
  onAcceptTerms: () => void;
}

export function ChatTermsAcceptance({
  agreed,
  email,
  onEmailChange,
  onAgreedChange,
  onAcceptTerms,
}: ChatTermsAcceptanceProps) {
  return (
    <div className="max-w-md mx-auto p-6 bg-card border border-border rounded-lg shadow-sm">
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">Terms & Conditions</h3>
          <p className="text-sm text-muted-foreground">
            To provide personalized AI guidance, please provide your email and accept our terms for research and data processing.
          </p>
        </div>

        {/* Email Input */}
        <div className="space-y-2">
          <label htmlFor="email-input" className="text-sm font-medium text-foreground">
            Email Address
          </label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="your.email@company.com"
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            required
          />
          <p className="text-xs text-muted-foreground">
            We'll use this to research your company and provide tailored AI guidance.
          </p>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
            <p>We'll use your information to research your company and role for tailored suggestions</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
            <p>Your data is protected under GDPR and used only for AI personalization</p>
          </div>
          <div className="flex items-start space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
            <p>You can request data deletion at any time</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="inline-terms"
            checked={agreed}
            onChange={(e) => {
              onAgreedChange(e.target.checked);
              if (e.target.checked) {
                onAcceptTerms();
              }
            }}
            className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary"
          />
          <label htmlFor="inline-terms" className="text-sm text-foreground cursor-pointer">
            I accept the terms and conditions for AI-powered personalization
          </label>
        </div>

        <button
          onClick={onAcceptTerms}
          disabled={!agreed || !email.trim()}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Continue to AI Consultation
        </button>
      </div>
    </div>
  );
}


