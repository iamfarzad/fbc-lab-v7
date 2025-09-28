import { NextRequest } from 'next/server';
import { createHealthCheckHandler } from '@/src/lib/api-middleware';

// Health check endpoint for monitoring system status
export async function GET(request: NextRequest) {
  return createHealthCheckHandler();
}
