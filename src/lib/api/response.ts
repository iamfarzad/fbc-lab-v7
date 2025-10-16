import { NextResponse } from 'next/server'

type ErrPayload = { ok: false; error: string; code?: string; details?: unknown }

export function ok<T>(data: T, init?: ResponseInit) {
  // Do not wrap payloads; preserve existing route shapes
  return NextResponse.json<T>(data as T, init)
}

export function error(message: string, status = 500, code?: string, details?: unknown) {
  return NextResponse.json<ErrPayload>({ ok: false, error: message, code, details }, { status })
}

export const respond = {
  ok,
  json: ok,
  error,  // Generic error with custom status
  badRequest: (msg = 'Bad request', details?: unknown) => error(msg, 400, 'BAD_REQUEST', details),
  unauthorized: (msg = 'Unauthorized', details?: unknown) => error(msg, 401, 'UNAUTHORIZED', details),
  forbidden: (msg = 'Forbidden', details?: unknown) => error(msg, 403, 'FORBIDDEN', details),
  notFound: (msg = 'Not found', details?: unknown) => error(msg, 404, 'NOT_FOUND', details),
  unprocessable: (msg = 'Unprocessable entity', details?: unknown) => error(msg, 422, 'UNPROCESSABLE', details),
  serverError: (msg = 'Internal server error', details?: unknown) => error(msg, 500, 'SERVER_ERROR', details),
}

export type ApiOk<T> = T
export type ApiError = ErrPayload
