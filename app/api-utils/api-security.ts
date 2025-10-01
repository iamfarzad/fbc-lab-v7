import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const ALLOWED_ORIGINS = [
  'https://fbcai.com', 
  'https://farzadbayat.com', 
  'https://www.farzadbayat.com',
  'https://fb-c-lab-v2.vercel.app',
  'http://localhost:3000', 
  'http://localhost:3001'
] // Development and production origins

export function withAPISecurity(handler: (req: NextRequest) => Promise<Response | NextResponse>) {
  return async (req: NextRequest) => {
    // 1) CORS
    const origin = req.headers.get('origin')
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      const response = await handler(req)
      if (response instanceof NextResponse) {
        response.headers.set('Access-Control-Allow-Origin', origin)
        response.headers.set('Vary', 'Origin')
        return response
      } else {
        // Handle regular Response objects
        const newResponse = new Response(response.body, response)
        newResponse.headers.set('Access-Control-Allow-Origin', origin)
        newResponse.headers.set('Vary', 'Origin')
        return newResponse
      }
    } else if (origin) {
      // Disallow all other origins
      return new NextResponse('Forbidden', { status: 403 })
    }

    // No origin header, proceed normally
    return await handler(req)
  }
}

function asErr(e: unknown): e is { message?: string } { return typeof e === "object" && e !== null; }

// 2) Payload size limit middleware
export function withPayloadLimit(handler: (req: NextRequest) => Promise<Response | NextResponse>, limit?: string) {
  return async (req: NextRequest) => {
    try {
      const contentLength = req.headers.get('content-length')
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength, 10)
        const sizeLimit = limit || '100kb';
        const limitInBytes = parseSizeLimit(sizeLimit)
        
        if (sizeInBytes > limitInBytes) {
          return new NextResponse(
            JSON.stringify({ error: 'Payload Too Large' }), 
            { 
              status: 413,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      }
      
      return await handler(req)
    } catch (err: unknown) {
      const msg = asErr(err) && typeof err.message === "string" ? err.message : "unknown";
      if ((err as any)?.statusCode === 413 || /request entity too large/i.test(msg)) {
        return new NextResponse(
          JSON.stringify({ error: 'Payload Too Large' }), 
          { 
            status: 413,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
      throw err
    }
  }
}

// 3) Webhook signature validator
export function verifyWebhookSignature(secret: string) {
  return async (req: NextRequest) => {
    const signature = req.headers.get('x-webhook-signature')
    
    if (!signature) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing signature' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Clone the request to read the body without consuming it
    const clonedReq = req.clone()
    const body = await clonedReq.text()
    
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    // Fix buffer length issue by ensuring both strings are the same length
    const normalizedSignature = signature.replace(/^sha256=/, '')
    const normalizedExpected = expected
    
    if (normalizedSignature.length !== normalizedExpected.length) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid signature format' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (!crypto.timingSafeEqual(Buffer.from(normalizedSignature, 'hex'), Buffer.from(normalizedExpected, 'hex'))) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid signature' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return null // Continue to handler
  }
}

// Helper function to parse size limits
function parseSizeLimit(limit: string): number {
  const units = { k: 1024, m: 1024 ** 2, g: 1024 ** 3, t: 1024 ** 4 } as const;

  const match = limit.toLowerCase().match(/^(\d+)([kmg]?b)$/)
  if (!match) {
    throw new Error(`Invalid size limit format: ${limit}`)
  }

  const [, size, unit] = match
  if (!size) return 0; // guard against undefined

  if (unit && unit in units) {
    const unitKey = unit.replace('b', '') as keyof typeof units;
    const multiplier = units[unitKey] ?? 1;
    return Number.parseInt(size, 10) * multiplier;
  }
  return Number.parseInt(size, 10);
}

// Combined security middleware
export function withFullSecurity(
  handler: (req: NextRequest) => Promise<Response | NextResponse>, 
  options: { 
    payloadLimit?: string
    requireWebhookSignature?: boolean
    webhookSecret?: string
  } = {}
) {
  return async (req: NextRequest) => {
    // Apply webhook signature validation if required
    if (options.requireWebhookSignature) {
      const { webhookSecret } = options
      if (!webhookSecret) {
        return new NextResponse(
          JSON.stringify({ error: 'Webhook secret not configured' }),
          { status: 500 }
        )
      }
      const signatureResult = await verifyWebhookSignature(webhookSecret)(req)
      if (signatureResult) {
        return signatureResult
      }
    }

    // Apply payload limit
    const limitedHandler = withPayloadLimit(handler, options.payloadLimit)
    
    // Apply CORS
    return withAPISecurity(limitedHandler)(req)
  }
}

// Admin authentication middleware
export function withAdminAuth(handler: (req: NextRequest) => Promise<Response | NextResponse>) {
  return async function(req: NextRequest) {
    let role = ''
    try {
      // tolerate tests passing plain objects
      role = (req as any)?.headers?.get ? (req as any).headers.get('x-user-role') || '' : ''
    } catch {
      // Ignore header access failures; fall back to default role
    }
    if (role.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return handler(req)
  }
}


// API guard middleware
export function withApiGuard(_options: {
  schema?: unknown
  requireSession?: boolean
  rateLimit?: { windowMs: number; max: number }
} = {}) {
  void _options
  return function(handler: (req: NextRequest) => Promise<Response | NextResponse>) {
    return async function(req: NextRequest) {
      // For now, just pass through to the handler
      // In a real implementation, this would validate the schema, check session, and apply rate limiting
      return handler(req)
    }
  }
}
