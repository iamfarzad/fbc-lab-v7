const { TransformStream } = require('stream/web')

if (typeof global.TransformStream === 'undefined') {
  // Ensure streaming utilities used by provider SDKs are available in Jest.
  global.TransformStream = TransformStream
}

const requiredEnvFallbacks = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'placeholder-service-role-key'
}

for (const [key, value] of Object.entries(requiredEnvFallbacks)) {
  if (!process.env[key]) {
    process.env[key] = value
  }
}

// Silence noisy Supabase placeholder warnings in tests
const originalConsoleWarn = console.warn
console.warn = (...args) => {
  const msg = String(args[0] ?? '')
  if (
    msg.includes('Supabase not configured - using placeholder. Data persistence disabled.') ||
    msg.includes('Supabase not configured - using placeholder. WAL logging disabled.')
  ) {
    return
  }
  originalConsoleWarn(...args)
}
