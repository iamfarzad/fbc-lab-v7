import { respond } from '@/lib/api/response'

export function GET() {
  return respond.error('Legacy /api/admin/chat disabled. Use /api/chat/unified?mode=admin', 501)
}

export function POST() {
  return respond.error('Legacy /api/admin/chat disabled. Use /api/chat/unified?mode=admin', 501)
}
