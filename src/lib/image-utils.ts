import { createHash } from 'crypto'

/**
 * Generate a consistent hash for image content
 * Used for caching duplicate image analyses
 * 
 * Extracted from duplicate implementations in:
 * - app/api/tools/image/route.ts
 * - app/api/tools/webcam/route.ts
 */
export function generateImageHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').substring(0, 16)
}

