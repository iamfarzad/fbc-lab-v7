import { NextResponse } from 'next/server';
import { respond } from '@/lib/api/response';
import { GEMINI_CONFIG, GEMINI_MODELS } from '@/config/constants';
import { multimodalContextManager } from '@/core/context/multimodal-context';
import { walLog } from '@/core/context/write-ahead-log';
import { LIVE_FUNCTION_DECLARATIONS } from '@/config/live-tools';

type ExportRequest = {
  sessionId?: string | null;
};

export async function POST(request: Request) {
  try {
    const { sessionId }: ExportRequest = await request.json();
    if (!sessionId) {
      return respond.badRequest('Missing sessionId');
    }

    // Ensure any buffered writes are synced before exporting.
    try {
      await walLog.flushSession(sessionId);
    } catch (err) {
      console.warn(`[session-export] WAL flush failed for ${sessionId}:`, err);
    }

    const context = await multimodalContextManager.getContext(sessionId);
    if (!context) {
      return respond.notFound('Session not found');
    }

    const conversation = context.conversationHistory.map((entry) => ({
      id: entry.id,
      role: entry.metadata?.speaker ?? 'assistant',
      modality: entry.modality,
      text: entry.content,
      timestamp: entry.timestamp,
      metadata: entry.metadata,
    }));

    const payload = {
      configuration: {
        model: `models/${process.env.GEMINI_LIVE_MODEL || GEMINI_MODELS.DEFAULT_VOICE}`,
        systemPrompt: GEMINI_CONFIG.SYSTEM_PROMPT,
      },
      tools: LIVE_FUNCTION_DECLARATIONS,
      session: {
        id: sessionId,
        createdAt: context.metadata.createdAt,
        lastUpdated: context.metadata.lastUpdated,
        modalitiesUsed: context.metadata.modalitiesUsed,
        totalTokens: context.metadata.totalTokens,
      },
      conversation,
      visualContext: context.visualContext,
      audioContext: context.audioContext,
      uploads: context.uploadContext,
      leadContext: context.leadContext,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Content-Disposition': `attachment; filename="session-${sessionId}.json"`,
      },
    });
  } catch (error) {
    console.error('[session-export] Failed to export session:', error);
    return respond.serverError('Failed to export session');
  }
}
