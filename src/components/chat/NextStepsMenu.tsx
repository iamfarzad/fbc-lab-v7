'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Calendar, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface NextStepsMenuProps {
  sessionId: string;
  show: boolean;
}

export function NextStepsMenu({ sessionId, show }: NextStepsMenuProps) {
  const [generating, setGenerating] = useState(false);
  
  if (!show) return null;

  const handleDownloadSummary = async () => {
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
        a.download = 'FBC-Conversation-Summary.md';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          title="Next steps"
        >
          <FileText className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleDownloadSummary} disabled={generating}>
          <Download className="mr-2 h-4 w-4" />
          <span>{generating ? 'Generating...' : 'Download Summary'}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.open('https://calendly.com/farzad-fbc', '_blank')}>
          <Calendar className="mr-2 h-4 w-4" />
          <span>Book Free 30-Min Call</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

