import { NextResponse } from 'next/server';
import { getSupabase } from '@/core/supabase/server';
import { generatePdfWithPuppeteer } from '@/core/pdf-generator-puppeteer';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const { sessionId, leadEmail, artifacts = [], research = [] } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const supabase = getSupabase();
    
    // Fetch lead info
    const { data: leadData, error: leadError } = await supabase
      .from('leads')
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
      leadEmail: leadEmail || leadData.email,
      sessionId: leadData.sessionId || sessionId,
      researchHighlights: research,
      artifactInsights: artifacts
    };

    // Generate PDF with temporary path
    const tempPath = `/tmp/summary-${Date.now()}.pdf`;
    const pdfBuffer = await generatePdfWithPuppeteer(summaryData, tempPath);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="summary-${sessionId}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString()
      }
    });
  } catch (error) {
    logger.error('Export summary failed', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
