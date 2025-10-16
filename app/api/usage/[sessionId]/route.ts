import { NextRequest } from 'next/server';
import { respond } from '@/lib/api/response'
import { usageLimiter } from '@/src/lib/usage-limits';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const usage = await usageLimiter.getUsage(sessionId);
    
    if (!usage) {
      return respond.notFound('Session not found')
    }
    
    return respond.ok(usage);
  } catch (error) {
    console.error('Usage fetch error:', error);
    return respond.serverError('Failed to fetch usage');
  }
}
