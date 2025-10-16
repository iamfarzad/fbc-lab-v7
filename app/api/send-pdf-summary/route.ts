import { NextResponse } from 'next/server';
import { respond } from '@/lib/api/response'
import { getSupabase } from '@/core/supabase/server';
import { generatePdfWithPuppeteer } from '@/core/pdf-generator-puppeteer';
import { logger } from '@/lib/logger';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { sessionId, toEmail, leadName } = await request.json();
    if (!sessionId || !toEmail) {
      return respond.badRequest('Missing sessionId or toEmail');
    }

    const supabase = getSupabase();
    
    // Fetch lead info
    const { data: leadData, error: leadError } = await supabase
      .from('lead_summaries')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (leadError) throw leadError;

    // Fetch conversation history
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (activitiesError) throw activitiesError;

    // Assemble summary data
    const summaryData = {
      leadInfo: leadData,
      conversationHistory: activities,
      leadName: leadName || leadData.name,
      sessionId: leadData.sessionId || 'email-summary'
    };

    // Generate PDF with temporary path
    const tempPath = `/tmp/summary-${Date.now()}.pdf`;
    const pdfBuffer = await generatePdfWithPuppeteer(summaryData, tempPath);
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    if (!process.env.RESEND_API_KEY) {
      // Fallback: return PDF directly
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="summary-${sessionId}.pdf"`,
          'Content-Length': pdfBuffer.byteLength.toString()
        }
      });
    }

    // Send email via Resend
    const { data, error: emailError } = await resend.emails.send({
      from: 'F.B/c AI <ai@fbc.com>',
      to: [toEmail],
      subject: 'Your F.B/c AI Consultation Summary',
      text: 'Please find your consultation summary attached.',
      attachments: [
        {
          filename: `summary-${sessionId}.pdf`,
          content: pdfBase64
        }
      ]
    });

    if (emailError) {
      throw new Error(emailError.message || 'Failed to send email');
    }

    return respond.ok({ success: true, messageId: data?.id });
  } catch (error) {
    logger.error('Send PDF summary failed', error instanceof Error ? error : undefined);
    return respond.serverError('Failed to send summary');
  }
}
