/**
 * PII Detection and Redaction for GDPR Compliance
 * 
 * Detects and optionally redacts Personally Identifiable Information
 * in text content before storage or processing.
 * 
 * For production: Consider upgrading to AWS Comprehend, Google DLP API,
 * or similar enterprise-grade PII detection services.
 */

const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  // Add more patterns as needed
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  passport: /\b[A-Z]{1,2}\d{6,9}\b/g,
}

export interface PIIDetectionResult {
  hasPII: boolean
  types: string[]
  matches: string[]
}

/**
 * Detect PII in text content
 */
export function detectPII(text: string): PIIDetectionResult {
  const types: string[] = []
  const matches: string[] = []

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const found = text.match(pattern)
    if (found) {
      types.push(type)
      matches.push(...found)
    }
  }

  return {
    hasPII: types.length > 0,
    types,
    matches
  }
}

/**
 * Redact PII from text
 */
export function redactPII(text: string, replaceWith: string = '[REDACTED]'): string {
  let redacted = text

  for (const pattern of Object.values(PII_PATTERNS)) {
    redacted = redacted.replace(pattern, replaceWith)
  }

  return redacted
}

/**
 * Determine if text should be redacted based on context
 * 
 * Business logic:
 * - Don't redact lead email (it's expected in terms acceptance)
 * - Always redact credit cards, SSNs, passports (high-risk PII)
 * - Redact unexpected PII types in conversation
 */
export function shouldRedact(text: string, context?: { isTermsAcceptance?: boolean }): boolean {
  const detection = detectPII(text)

  if (!detection.hasPII) return false

  // Never redact during terms acceptance (email is expected)
  if (context?.isTermsAcceptance) {
    return false
  }

  // Always redact high-risk PII
  if (
    detection.types.includes('creditCard') ||
    detection.types.includes('ssn') ||
    detection.types.includes('passport')
  ) {
    return true
  }

  // Allow single email (likely the lead's work email)
  if (detection.types.length === 1 && detection.types[0] === 'email') {
    return false
  }

  // Redact multiple PII types or unexpected combinations
  return detection.types.length > 1
}

/**
 * Safe text processing - detect and optionally redact PII
 */
export function processSensitiveText(
  text: string,
  options: {
    detectOnly?: boolean
    context?: { isTermsAcceptance?: boolean }
  } = {}
): {
  processed: string
  piiDetected: PIIDetectionResult
  wasRedacted: boolean
} {
  const piiDetected = detectPII(text)
  const shouldRedactText = shouldRedact(text, options.context)

  if (!shouldRedactText || options.detectOnly) {
    return {
      processed: text,
      piiDetected,
      wasRedacted: false
    }
  }

  return {
    processed: redactPII(text),
    piiDetected,
    wasRedacted: true
  }
}

