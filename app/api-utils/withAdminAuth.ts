import { NextRequest, NextResponse } from 'next/server'

export function withAdminAuth(handler: (req: NextRequest) => Promise<Response | NextResponse>) {
  return async function(req: NextRequest) {
    let role = ''
    try {
      // tolerate tests passing plain objects
      role = (req as any)?.headers?.get ? (req as any).headers.get('x-user-role') || '' : ''
    } catch {}
    if (role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return handler(req)
  }
}


