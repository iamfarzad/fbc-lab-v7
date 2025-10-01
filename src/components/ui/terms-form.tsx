import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

interface TermsFormProps {
  open: boolean;
  onAccept: (name: string, email: string) => void;
  onDecline: () => void;
}

export function TermsForm({ open, onAccept, onDecline }: TermsFormProps) {
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleAccept = () => {
    if (agreed && email) {
      onAccept(name, email);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAgreed(e.target.checked);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onDecline()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please provide your name and work email, then accept our terms for personalized research.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work Email (required)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.work@email.com"
              required
            />
          </div>
          <p className="text-sm text-muted-foreground">
            By accepting, you agree to our terms of service, including data processing for AI personalization. 
            We use your information to provide tailored suggestions. Your data is protected under GDPR.
          </p>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox"
              id="terms"
              checked={agreed}
              onChange={handleCheckboxChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <Label htmlFor="terms" className="text-sm">
              I accept the terms and conditions
            </Label>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={onDecline}>
            Decline
          </Button>
          <Button type="button" disabled={!agreed || !email} onClick={handleAccept}>
            Accept and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
