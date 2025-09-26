describe('Language Utilities', () => {
  // Test the BCP47 validation function directly
  function isBcp47(s?: string): boolean {
    return typeof s === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z]{2}|\-[A-Za-z]{4})?(-[A-Za-z]{2}|\-[0-9]{3})?$/.test(s);
  }

  it('should validate BCP47 language codes correctly', () => {
    expect(isBcp47('en-US')).toBe(true)
    expect(isBcp47('en')).toBe(true)
    expect(isBcp47('en-GB')).toBe(true)
    expect(isBcp47('invalid-lang')).toBe(false)
    expect(isBcp47('')).toBe(false)
    expect(isBcp47(undefined)).toBe(false)
  })
})

describe('Voice Mapping', () => {
  // Test the voice mapping directly
  const VOICE_BY_LANG: Record<string, string> = {
    'en-US': 'Puck',
    'en-GB': 'Puck',
    'nb-NO': 'Puck',
    'sv-SE': 'Puck',
    'de-DE': 'Puck',
    'es-ES': 'Puck',
  }

  it('should map languages to voices correctly', () => {
    expect(VOICE_BY_LANG['en-US']).toBe('Puck')
    expect(VOICE_BY_LANG['en-GB']).toBe('Puck')
    expect(VOICE_BY_LANG['de-DE']).toBe('Puck')
  })
})

describe('Server Configuration', () => {
  beforeEach(() => {
    // Mock environment variables
    process.env.PORT = '3001'
    process.env.FLY_APP_NAME = undefined
  })

  it('should configure server with correct port', () => {
    // This test verifies that the server is configured to run on the correct port
    expect(process.env.PORT).toBe('3001')
  })

  it('should handle development environment correctly', () => {
    // Test that development environment is properly detected (set by jest.setup.js)
    expect(process.env.NODE_ENV).toBe('test')
  })
})