/**
 * Unit tests for src/config/env.ts
 * Tests environment variable resolution and normalization
 */

import { getResolvedGeminiApiKey } from '../env'

describe('getResolvedGeminiApiKey', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear all Gemini-related env vars before each test
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_GEMINI_API_KEY
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    delete process.env.GOOGLE_API_KEY
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
  })

  it('should throw error when no API key is present', () => {
    expect(() => getResolvedGeminiApiKey()).toThrow(
      'Missing Google Generative AI API key'
    )
  })

  it('should resolve GEMINI_API_KEY with highest priority', () => {
    process.env.GEMINI_API_KEY = 'key-from-gemini'
    process.env.GOOGLE_GEMINI_API_KEY = 'key-from-google-gemini'
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'key-from-google-gen-ai'

    const key = getResolvedGeminiApiKey()

    expect(key).toBe('key-from-gemini')
  })

  it('should fallback to GOOGLE_GEMINI_API_KEY when GEMINI_API_KEY missing', () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'key-from-google-gemini'
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'key-from-google-gen-ai'

    const key = getResolvedGeminiApiKey()

    expect(key).toBe('key-from-google-gemini')
  })

  it('should fallback to GOOGLE_GENERATIVE_AI_API_KEY when others missing', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'key-from-google-gen-ai'

    const key = getResolvedGeminiApiKey()

    expect(key).toBe('key-from-google-gen-ai')
  })

  it('should fallback to GOOGLE_API_KEY as last resort', () => {
    process.env.GOOGLE_API_KEY = 'key-from-google-api'

    const key = getResolvedGeminiApiKey()

    expect(key).toBe('key-from-google-api')
  })

  it('should normalize to set both GEMINI_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY', () => {
    process.env.GOOGLE_GEMINI_API_KEY = 'test-key'

    getResolvedGeminiApiKey()

    expect(process.env.GEMINI_API_KEY).toBe('test-key')
    expect(process.env.GOOGLE_GENERATIVE_AI_API_KEY).toBe('test-key')
  })

  it('should not overwrite GEMINI_API_KEY if already set', () => {
    process.env.GEMINI_API_KEY = 'existing-key'
    process.env.GOOGLE_GEMINI_API_KEY = 'other-key'

    getResolvedGeminiApiKey()

    expect(process.env.GEMINI_API_KEY).toBe('existing-key')
  })

  it('should not overwrite GOOGLE_GENERATIVE_AI_API_KEY if already set', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'existing-key'
    process.env.GOOGLE_GEMINI_API_KEY = 'other-key'

    getResolvedGeminiApiKey()

    expect(process.env.GOOGLE_GENERATIVE_AI_API_KEY).toBe('existing-key')
  })

  it('should handle empty string as missing key', () => {
    process.env.GEMINI_API_KEY = ''
    process.env.GOOGLE_GEMINI_API_KEY = ''
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = ''
    process.env.GOOGLE_API_KEY = ''

    expect(() => getResolvedGeminiApiKey()).toThrow()
  })

  it('should return the same key when called multiple times', () => {
    process.env.GEMINI_API_KEY = 'test-key-123'

    const key1 = getResolvedGeminiApiKey()
    const key2 = getResolvedGeminiApiKey()

    expect(key1).toBe(key2)
    expect(key1).toBe('test-key-123')
  })
})

