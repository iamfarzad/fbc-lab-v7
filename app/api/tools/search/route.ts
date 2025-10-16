import { NextRequest } from 'next/server';
import { respond } from '@/lib/api/response'
import { GoogleGroundingProvider } from '@/src/core/intelligence/providers/search/google-grounding';

const groundingProvider = new GoogleGroundingProvider();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const queryRaw = body?.query;
    const urlsRaw = body?.urls;

    const query = typeof queryRaw === 'string' ? queryRaw.trim() : '';
    if (!query) {
      return respond.badRequest('Missing query for web search.')
    }

    const urls =
      Array.isArray(urlsRaw) && urlsRaw.length
        ? urlsRaw
            .map((url: unknown) => (typeof url === 'string' ? url : ''))
            .filter(Boolean)
        : undefined;

    const result = await groundingProvider.groundedAnswer(query, urls);

    return respond.ok({
      success: true,
      result: {
        summary: result.text,
        citations: result.citations ?? [],
        urlsUsed:
          (result.citations ?? [])
            .map((citation) => citation.uri)
            .filter((uri): uri is string => Boolean(uri)) ?? [],
      },
    })
  } catch (error) {
    console.error('[tools/search] Web search failed:', error);
    return respond.serverError('Web search failed. Please try again.')
  }
}
