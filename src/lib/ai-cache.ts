/**
 * AI SDK Tools Cache Configuration
 *
 * The original implementation depended on `@ai-sdk-tools/cache` and
 * `@upstash/redis`. Those packages are optional in this project, so we attempt
 * to load them dynamically. When they're not available we transparently fall
 * back to a lightweight in-memory cache with TTL support so local builds and
 * tests keep working.
 */

type CreateCachedFn = ((options: Record<string, unknown>) => CacheAdapter) | null
type RedisFactory = (() => unknown) | null
type RequireFn = (specifier: string) => any

type CacheEntry = {
  value: unknown
  expiresAt: number
}

export type CacheAdapter = {
  get: <T = unknown>(key: string) => Promise<T | undefined> | T | undefined
  set: <T = unknown>(key: string, value: T, ttl?: number) => Promise<void> | void
  delete?: (key: string) => void
  clear?: () => void
  wrap?: <T = unknown>(key: string, fn: () => Promise<T>) => Promise<T>
}

let cachedFactory: CreateCachedFn | undefined
let redisFactory: RedisFactory | undefined
let dependenciesLoaded = false

const isServerEnvironment = typeof window === 'undefined'

function loadOptionalDependencies() {
  if (dependenciesLoaded) return
  dependenciesLoaded = true

  if (!isServerEnvironment) {
    cachedFactory = null
    redisFactory = null
    return
  }

  let localRequire: RequireFn | undefined
  try {
     
    localRequire = eval('require')
  } catch {
    localRequire = undefined
  }

  if (!localRequire) {
    cachedFactory = null
    redisFactory = null
    return
  }

  try {
    const cacheModule = localRequire('@ai-sdk-tools/cache')
    if (cacheModule?.createCached) {
      cachedFactory = cacheModule.createCached.bind(cacheModule)
    } else {
      cachedFactory = null
    }
  } catch {
    cachedFactory = null
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[ai-cache] @ai-sdk-tools/cache not found; using in-memory cache fallback.')
    }
  }

  try {
    const redisModule = localRequire('@upstash/redis')
    if (redisModule?.Redis?.fromEnv) {
      redisFactory = () => redisModule.Redis.fromEnv()
    } else {
      redisFactory = null
    }
  } catch {
    redisFactory = null
  }
}

function createInMemoryCache(options: { ttl?: number; keyPrefix?: string; debug?: boolean }): CacheAdapter {
  const ttl = options.ttl ?? 5 * 60 * 1000
  const keyPrefix = options.keyPrefix ?? ''
  const debug = options.debug ?? false
  const store = new Map<string, CacheEntry>()

  const resolveKey = (key: string) => `${keyPrefix}${key}`
  const log = (message: string) => {
    if (debug) {
      console.log(`[ai-cache fallback] ${message}`)
    }
  }

  const get = <T = unknown>(key: string): T | undefined => {
    const entry = store.get(resolveKey(key))
    if (!entry) return undefined
    if (Date.now() > entry.expiresAt) {
      store.delete(resolveKey(key))
      log(`expire -> ${key}`)
      return undefined
    }
    log(`hit -> ${key}`)
    return entry.value as T
  }

  const set = <T = unknown>(key: string, value: T, customTtl?: number) => {
    const expiry = Date.now() + (customTtl ?? ttl)
    store.set(resolveKey(key), { value, expiresAt: expiry })
    log(`set -> ${key} (ttl=${customTtl ?? ttl})`)
  }

  const wrap = async <T = unknown>(key: string, fn: () => Promise<T>): Promise<T> => {
    const cached = get<T>(key)
    if (cached !== undefined) return cached
    const result = await fn()
    set(key, result)
    return result
  }

  return {
    get,
    set,
    delete: (key: string) => store.delete(resolveKey(key)),
    clear: () => store.clear(),
    wrap,
  }
}

function createCache(options: {
  ttl: number
  keyPrefix?: string
  debug?: boolean
  preferRedis?: boolean
}): CacheAdapter {
  loadOptionalDependencies()

  if (cachedFactory) {
    const factoryOptions: Record<string, unknown> = {
      ttl: options.ttl,
      keyPrefix: options.keyPrefix,
      debug: options.debug,
    }

    if (options.preferRedis && redisFactory) {
      factoryOptions.cache = redisFactory()
    }

    try {
      return cachedFactory(factoryOptions)
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[ai-cache] Failed to initialise external cache. Falling back to in-memory cache.', error)
      }
    }
  }

  return createInMemoryCache(options)
}

const isRedisConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL)
const isDev = process.env.NODE_ENV === 'development'

/**
 * Environment-aware cache setup
 * - Production (Redis configured): Upstash Redis when dependency is available
 * - Development / fallback: in-memory cache with TTL
 */
export const cached = createCache({
  ttl: isRedisConfigured ? 60 * 60 * 1000 : 5 * 60 * 1000,
  keyPrefix: isRedisConfigured ? 'ai-tools:' : undefined,
  debug: isDev,
  preferRedis: isRedisConfigured,
})

/**
 * Long-term cache for data that rarely changes (24 hours)
 * Use for: Lead research, company data, person profiles
 */
export const createLongCache = (ttl = 24 * 60 * 60 * 1000) =>
  createCache({
    ttl,
    keyPrefix: 'ai-tools:long:',
    debug: isDev,
    preferRedis: isRedisConfigured,
  })

/**
 * Short-term cache for frequently changing data (5 minutes)
 * Use for: Multimodal context, session data
 */
export const createShortCache = (ttl = 5 * 60 * 1000) =>
  createCache({
    ttl,
    keyPrefix: 'ai-tools:short:',
    debug: isDev,
    preferRedis: isRedisConfigured,
  })

/**
 * Medium-term cache for search results (1-2 hours)
 * Use for: Grounding searches, web research, URL context
 */
export const createMediumCache = (ttl = 2 * 60 * 60 * 1000) =>
  createCache({
    ttl,
    keyPrefix: 'ai-tools:medium:',
    debug: isDev,
    preferRedis: isRedisConfigured,
  })

/**
 * Vision cache for image/screenshot analysis (30 minutes)
 * Use for: Webcam captures, screen analysis, document processing
 */
export const createVisionCache = (ttl = 30 * 60 * 1000) =>
  createCache({
    ttl,
    keyPrefix: 'ai-tools:vision:',
    debug: isDev,
    preferRedis: isRedisConfigured,
  })

/**
 * Cache TTL Constants (in milliseconds)
 */
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 60 * 60 * 1000,    // 1 hour
  LONG: 2 * 60 * 60 * 1000,  // 2 hours
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
  VISION: 30 * 60 * 1000,    // 30 minutes
  DOCUMENT: 60 * 60 * 1000,  // 1 hour
  URL: 2 * 60 * 60 * 1000,   // 2 hours
} as const

/**
 * Helper to check if cache is available
 */
export function isCacheAvailable(): boolean {
  loadOptionalDependencies()
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && redisFactory && cachedFactory)
}

/**
 * Helper to get cache stats (for monitoring)
 */
export function getCacheConfig() {
  return {
    enabled: isCacheAvailable(),
    backend: isCacheAvailable() ? 'redis' : 'memory',
    environment: process.env.NODE_ENV,
    debug: process.env.NODE_ENV === 'development'
  }
}

/**
 * Create a simple cached function wrapper (non-tool approach)
 * For use with regular async functions that don't need tool schema
 */
export function createCachedFunction<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: {
    ttl?: number
    keyPrefix?: string
    keyGenerator?: (...args: TArgs) => string
  } = {}
) {
  const {
    ttl = 60 * 60 * 1000,
    keyPrefix = 'fn:',
    keyGenerator = (...args) => JSON.stringify(args)
  } = options

  // Simple in-memory cache for development
  const cache = new Map<string, { data: TResult; expires: number }>()

  return async (...args: TArgs): Promise<TResult> => {
    const key = keyPrefix + keyGenerator(...args)
    
    // Check cache
    const cached = cache.get(key)
    if (cached && Date.now() < cached.expires) {
      console.log(`✅ [Cache HIT] ${key.substring(0, 50)}...`)
      return cached.data
    }

    // Execute function
    console.log(`❌ [Cache MISS] ${key.substring(0, 50)}...`)
    const result = await fn(...args)
    
    // Store in cache
    cache.set(key, { data: result, expires: Date.now() + ttl })
    
    return result
  }
}
