import { NextResponse } from 'next/server';
import { respond } from '@/lib/api/response'
import { getSupabase } from '@/core/supabase/server';
import { generatePdfWithPuppeteer } from '@/core/pdf-generator-puppeteer';
import { logger } from '@/lib/logger';
import { multimodalContextManager } from '@/core/context/multimodal-context';
import { walLog } from '@/core/context/write-ahead-log';
import { auditLog } from '@/core/security/audit-logger';

export async function POST(request: Request) {
  try {
    const { sessionId, leadEmail, artifacts = [], research = [] } = await request.json();
    if (!sessionId) {
      return respond.badRequest('Missing sessionId');
    }

    // Flush WAL to ensure all pending writes are synced
    console.log('🔄 Flushing WAL before PDF generation...')
    await walLog.flushSession(sessionId)

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

    // Load multimodal context (voice, webcam, screen, uploads)
    console.log('📦 Loading multimodal context...')
    const multimodalContext = await multimodalContextManager.getConversationContext(
      sessionId,
      true, // include visual
      true  // include audio
    )

    // Assemble summary data
    const summaryData = {
      leadInfo: leadData,
      conversationHistory: activities,
      leadEmail: leadEmail || leadData.email,
      sessionId: leadData.sessionId || sessionId,
      researchHighlights: research,
      artifactInsights: artifacts,
      // NEW: Add multimodal data
      multimodalContext: {
        visualAnalyses: multimodalContext.visualContext,
        voiceTranscripts: multimodalContext.audioContext,
        uploadedFiles: multimodalContext.uploadContext,
        summary: multimodalContext.summary
      }
    };

    console.log(`📊 PDF data assembled: ${activities.length} messages, ${multimodalContext.summary.modalitiesUsed.join(', ')}`)

    // Generate PDF with temporary path
    console.log('[export-summary] Starting PDF generation', {
      sessionId,
      timestamp: new Date().toISOString(),
      env: {
        nodeEnv: process.env.NODE_ENV,
        pdfUsePdfLib: process.env.PDF_USE_PDFLIB
      }
    });

    const tempPath = `/tmp/summary-${Date.now()}.pdf`;
    const startTime = Date.now();
    console.log('[export-summary] Calling Puppeteer...');

    let pdfBuffer: Uint8Array;
    try {
      pdfBuffer = await Promise.race([
        generatePdfWithPuppeteer(summaryData, tempPath),
        new Promise<Uint8Array>((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timeout after 50s')), 50000)
        )
      ]) as Uint8Array;
      
      console.log(`[export-summary] PDF generated in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('[export-summary] PDF generation failed:', {
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      });
      
      return respond.serverError('PDF generation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Store PDF in Supabase Storage
    const pdfFileName = `${sessionId}/${Date.now()}.pdf`
    console.log(`📤 Uploading PDF to Supabase Storage: ${pdfFileName}`)
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('conversation-pdfs')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      logger.error('Failed to store PDF in Supabase Storage', uploadError)
      console.error('❌ PDF storage failed:', uploadError)
    } else {
      // Update conversation_contexts with PDF URL
      const { error: updateError } = await supabase
        .from('conversation_contexts')
        .update({
          pdf_url: uploadData.path,
          pdf_generated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)

      if (updateError) {
        logger.error('Failed to update conversation_contexts with PDF URL', updateError)
      } else {
        logger.info('PDF stored successfully', { sessionId, path: uploadData.path })
        console.log(`✅ PDF stored and database updated: ${uploadData.path}`)
        
        // Audit log the PDF generation
        await auditLog.logPDFGenerated(sessionId, uploadData.path, pdfBuffer.byteLength)
      }
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="summary-${sessionId}.pdf"`,
        'Content-Length': pdfBuffer.byteLength.toString()
      }
    });
  } catch (error) {
    logger.error('Export summary failed', error instanceof Error ? error : undefined);
    return respond.serverError('Failed to generate summary');
  }
}
