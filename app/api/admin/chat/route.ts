import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json(
    { ok: false, error: 'Legacy /api/admin/chat disabled. Use /api/chat/unified?mode=admin' },
    { status: 501 }
  )
}

export function POST() {
  return NextResponse.json(
    { ok: false, error: 'Legacy /api/admin/chat disabled. Use /api/chat/unified?mode=admin' },
    { status: 501 }
  )
}
