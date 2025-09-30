import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      errorId: string
      message: string
      stack: string
      componentStack: string
      timestamp: string
      userAgent: string
      url: string
      source: string
    };
    const { errorId, message, stack, componentStack, timestamp, userAgent, url, source } = body;

    // Log the error to console for debugging
    console.error('Error Analytics:', {
      errorId,
      message,
      stack,
      componentStack,
      timestamp,
      userAgent,
      url,
      source
    });

    // Here you would typically send the error to your analytics service
    // For example: Sentry, LogRocket, custom analytics, etc.
    
    // For now, we'll just acknowledge receipt
    return NextResponse.json({ 
      success: true, 
      errorId,
      message: 'Error logged successfully' 
    });
  } catch (error) {
    console.error('Failed to log error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to log error' },
      { status: 500 }
    );
  }
}
