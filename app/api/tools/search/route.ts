import { NextRequest, NextResponse } from 'next/server';
import { GoogleGroundingProvider } from '@/src/core/intelligence/providers/search/google-grounding';

const groundingProvider = new GoogleGroundingProvider();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const queryRaw = body?.query;
    const urlsRaw = body?.urls;

    const query = typeof queryRaw === 'string' ? queryRaw.trim() : '';
    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Missing query for web search.' },
        { status: 400 },
      );
    }

    const urls =
      Array.isArray(urlsRaw) && urlsRaw.length
        ? urlsRaw
            .map((url: unknown) => (typeof url === 'string' ? url : ''))
            .filter(Boolean)
        : undefined;

    const result = await groundingProvider.groundedAnswer(query, urls);

    return NextResponse.json({
      success: true,
      result: {
        summary: result.text,
        citations: result.citations ?? [],
        urlsUsed:
          (result.citations ?? [])
            .map((citation) => citation.uri)
            .filter((uri): uri is string => Boolean(uri)) ?? [],
      },
    });
  } catch (error) {
    console.error('[tools/search] Web search failed:', error);
    return NextResponse.json(
      { success: false, error: 'Web search failed. Please try again.' },
      { status: 500 },
    );
  }
}
