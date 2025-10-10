'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, ExternalLink } from 'lucide-react';

interface CalendarWidgetProps {
  title: string;
  description?: string;
  url?: string;
}

export function CalendarWidget({ 
  title, 
  description, 
  url = 'https://calendly.com/farzad-fbc'
}: CalendarWidgetProps) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <CalendarIcon className="h-5 w-5 text-blue-600 mt-1" />
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <CardDescription className="mt-1">{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => window.open(url, '_blank')} 
          className="w-full gap-2"
        >
          <CalendarIcon className="h-4 w-4" />
          Book Free 30-Min Call
          <ExternalLink className="h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Opens in Calendly
        </p>
      </CardContent>
    </Card>
  );
}

