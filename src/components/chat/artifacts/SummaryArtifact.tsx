'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Download, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface SummaryArtifactProps {
  content: string;
  sessionId: string;
  leadEmail?: string;
  gdprNotice?: {
    message: string;
    dataRetained: string[];
    dataDeleted: string[];
  };
}

export function SummaryArtifact({ 
  content, 
  sessionId, 
  leadEmail,
  gdprNotice 
}: SummaryArtifactProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/export-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fbc-consultation-summary-${sessionId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setPdfGenerated(true);
      toast.success('PDF downloaded successfully!');
      console.log('✅ PDF downloaded and stored in database');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PDF Export]', error);
      toast.error(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmail = async () => {
    if (!leadEmail) {
      toast.error('Email address not available');
      return;
    }

    setIsEmailing(true);
    try {
      const response = await fetch('/api/send-pdf-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sessionId,
          email: leadEmail 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      toast.success(`PDF sent to ${leadEmail}`);
      console.log('✅ PDF emailed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Email Export]', error);
      toast.error(`Failed to send email: ${errorMessage}`);
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-900">
          <CheckCircle2 className="h-5 w-5" />
          Consultation Summary Ready
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Content */}
        <div className="prose prose-sm max-w-none prose-headings:text-orange-900 prose-strong:text-orange-800">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        {/* GDPR Notice */}
        {gdprNotice && (
          <Alert className="border-orange-300 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-900">Privacy & Data Retention</AlertTitle>
            <AlertDescription className="text-orange-800 space-y-2">
              <p>{gdprNotice.message}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                <div>
                  <strong className="text-green-700">✓ Data Retained:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    {gdprNotice.dataRetained.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong className="text-red-700">✗ Data Deleted:</strong>
                  <ul className="mt-1 ml-4 list-disc">
                    {gdprNotice.dataDeleted.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-xs mt-3">
                Read our{' '}
                <a 
                  href="/docs/privacy-policy" 
                  target="_blank" 
                  className="underline font-medium"
                >
                  Privacy Policy
                </a>
                {' '}for complete details.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Generating PDF...' : 'Download PDF'}
          </Button>

          {leadEmail && (
            <Button 
              onClick={handleEmail}
              disabled={isEmailing || !pdfGenerated}
              variant="outline"
              className="flex-1 gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <Mail className="h-4 w-4" />
              {isEmailing ? 'Sending...' : 'Email PDF'}
            </Button>
          )}
        </div>

        {pdfGenerated && (
          <p className="text-xs text-center text-muted-foreground">
            PDF saved to database and ready for admin follow-up
          </p>
        )}
      </CardContent>
    </Card>
  );
}

