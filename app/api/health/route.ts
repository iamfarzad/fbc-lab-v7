import { respond } from '@/lib/api/response'

export function GET() {
  return respond.ok({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  })
}
