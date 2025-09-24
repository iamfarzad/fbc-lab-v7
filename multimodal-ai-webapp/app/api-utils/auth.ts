import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/src/core/auth'

export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authorization header required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Add user info to request headers for downstream handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export async function adminAuthMiddleware(request: NextRequest): Promise<NextResponse | null> {
  // Check for token in cookie first, then Authorization header
  const token = request.cookies.get('adminToken')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  // Verify admin role
  if (payload.role !== 'admin') {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  // For API routes, we don't use NextResponse.next() - we return null to continue
  // The user info is available via the payload for downstream handlers
  return null;
}

// Re-export getCurrentUser from core for convenience in middleware
export { getCurrentUser } from '@/src/core/auth'
