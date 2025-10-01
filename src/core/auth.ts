const TOKEN_PREFIX = 'fbctoken:'

export interface JWTPayload {
  userId: string
  email: string
  role: 'admin' | 'user'
  exp: number
}

function encode(payload: object): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
}

function decode(token: string): any | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

export async function createToken(payload: Omit<JWTPayload, 'exp'>): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60
  const body = { ...payload, exp }
  return TOKEN_PREFIX + encode(body)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  if (!token) return null
  const normalized = token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : token
  const payload = decode(normalized)
  if (!payload) return null
  const { userId, email, role, exp } = payload as Partial<JWTPayload>
  if (!userId || !email || !role || typeof exp !== 'number') return null
  const now = Math.floor(Date.now() / 1000)
  if (exp < now) return null
  return { userId, email, role, exp }
}

export function getCurrentUser(request: Request): JWTPayload | null {
  const userId = request.headers.get('x-user-id')
  const email = request.headers.get('x-user-email')
  const role = request.headers.get('x-user-role') as 'admin' | 'user' | null
  if (!userId || !email || !role) return null
  return { userId, email, role, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 }
}
