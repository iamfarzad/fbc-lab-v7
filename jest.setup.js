const { TransformStream } = require('stream/web')

if (typeof global.TransformStream === 'undefined') {
  // Ensure streaming utilities used by provider SDKs are available in Jest.
  global.TransformStream = TransformStream
}

// Polyfill Web Request API for Next.js types
// Headers must be defined first since Request/Response depend on it
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init = {}) {
      this._headers = {}
      if (init instanceof Headers) {
        init.forEach((value, key) => {
          this._headers[key.toLowerCase()] = value
        })
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => {
          this._headers[key.toLowerCase()] = value
        })
      } else {
        Object.entries(init).forEach(([key, value]) => {
          this._headers[key.toLowerCase()] = value
        })
      }
    }
    
    get(name) {
      return this._headers[name.toLowerCase()] || null
    }
    
    set(name, value) {
      this._headers[name.toLowerCase()] = value
    }
    
    has(name) {
      return name.toLowerCase() in this._headers
    }
    
    delete(name) {
      delete this._headers[name.toLowerCase()]
    }
    
    forEach(callback) {
      Object.entries(this._headers).forEach(([key, value]) => {
        callback(value, key, this)
      })
    }
    
    keys() {
      return Object.keys(this._headers)
    }
    
    values() {
      return Object.values(this._headers)
    }
    
    entries() {
      return Object.entries(this._headers)
    }
  }
}

// Now define Request and Response after Headers
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init.method || 'GET'
      this.headers = new Headers(init.headers || {})
      this.body = init.body || null
      this.cache = init.cache || 'default'
      this.credentials = init.credentials || 'same-origin'
      this.mode = init.mode || 'cors'
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new Headers(init.headers || {})
      this.ok = this.status >= 200 && this.status < 300
    }
    
    json() {
      return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
    }
    
    text() {
      return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body))
    }
  }
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
