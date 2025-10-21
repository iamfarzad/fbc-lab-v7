/**
 * Environment resolution helpers
 * Centralizes how we read and normalize environment variables so
 * production (Vercel) and local dev behave the same.
 */

/**
 * Resolve the Google/Gemini API key from any supported env var and
 * normalize to both GEMINI_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY
 * for downstream libraries (ai-sdk, @google/genai).
 */
export function getResolvedGeminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''

  if (!key) {
    throw new Error('Missing Google Generative AI API key (set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)')
  }

  // Normalize for consumers
  if (!process.env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = key
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = key
  }

  return key
}

