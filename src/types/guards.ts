/**
 * Type guard utilities for runtime type checking
 */

import type { Message, Attachment, TokenUsage } from './core'

export function isMessage(obj: unknown): obj is Message {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'role' in obj &&
    'content' in obj &&
    'timestamp' in obj &&
    typeof (obj as Message).id === 'string' &&
    ['user', 'assistant', 'system'].includes((obj as Message).role) &&
    typeof (obj as Message).content === 'string'
  )
}

export function isAttachment(obj: unknown): obj is Attachment {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'type' in obj &&
    'url' in obj &&
    'mimeType' in obj
  )
}

export function isTokenUsage(obj: unknown): obj is TokenUsage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'promptTokens' in obj &&
    'completionTokens' in obj &&
    'totalTokens' in obj
  )
}

