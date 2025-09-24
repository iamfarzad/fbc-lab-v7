export function useIdempotencyKey(prefix: string = 'req'): string {
  const rand = Math.random().toString(36).slice(2, 8)
  const ts = Date.now().toString(36)
  return `${prefix}_${ts}_${rand}`
}


