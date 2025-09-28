import { kv } from '@vercel/kv';
import { logger } from './logger';

// Cache configuration
export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for invalidation
  revalidate?: number; // Revalidation time for ISR
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

// Default cache configurations
export const CACHE_CONFIGS = {
  // Session data - short term with frequent updates
  SESSION: { ttl: 300, tags: ['session'] }, // 5 minutes

  // Context data - medium term
  CONTEXT: { ttl: 1800, tags: ['context'] }, // 30 minutes

  // Intelligence results - longer term
  INTELLIGENCE: { ttl: 3600, tags: ['intelligence'] }, // 1 hour

  // User preferences - very long term
  PREFERENCES: { ttl: 86400, tags: ['preferences'] }, // 24 hours

  // API responses - short to medium term
  API_RESPONSE: { ttl: 600, tags: ['api'] }, // 10 minutes
} as const;

// Vercel KV Cache Manager
export class VercelCache {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.VERCEL_KV_ENABLED !== 'false';
  }

  // Generate cache key
  private generateKey(namespace: string, identifier: string): string {
    return `fbc_cache:${namespace}:${identifier}`;
  }

  // Set cache entry
  async set<T>(
    namespace: string,
    identifier: string,
    data: T,
    config: CacheConfig = {}
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: config.ttl || CACHE_CONFIGS.API_RESPONSE.ttl,
        tags: config.tags || []
      };

      const key = this.generateKey(namespace, identifier);
      const ttlSeconds = Math.floor((config.ttl || CACHE_CONFIGS.API_RESPONSE.ttl) / 1000);

      await kv.set(key, entry, { ex: ttlSeconds });

      logger.debug('Cache set', {
        namespace,
        identifier,
        ttl: ttlSeconds,
        size: JSON.stringify(data).length
      });
    } catch (error) {
      logger.error('Cache set failed', error instanceof Error ? error : new Error('Unknown error'), {
        namespace,
        identifier,
        type: 'cache_error'
      });
    }
  }

  // Get cache entry
  async get<T>(namespace: string, identifier: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      const key = this.generateKey(namespace, identifier);
      const entry = await kv.get<CacheEntry<T>>(key);

      if (!entry) {
        logger.debug('Cache miss', { namespace, identifier });
        return null;
      }

      // Check if expired
      const isExpired = Date.now() - entry.timestamp > (entry.ttl * 1000);
      if (isExpired) {
        await this.delete(namespace, identifier);
        logger.debug('Cache expired', { namespace, identifier });
        return null;
      }

      logger.debug('Cache hit', {
        namespace,
        identifier,
        age: Math.floor((Date.now() - entry.timestamp) / 1000)
      });

      return entry.data;
    } catch (error) {
      logger.error('Cache get failed', error instanceof Error ? error : new Error('Unknown error'), {
        namespace,
        identifier,
        type: 'cache_error'
      });
      return null;
    }
  }

  // Delete cache entry
  async delete(namespace: string, identifier: string): Promise<void> {
    if (!this.enabled) return;

    try {
      const key = this.generateKey(namespace, identifier);
      await kv.del(key);

      logger.debug('Cache deleted', { namespace, identifier });
    } catch (error) {
      logger.error('Cache delete failed', error instanceof Error ? error : new Error('Unknown error'), {
        namespace,
        identifier,
        type: 'cache_error'
      });
    }
  }

  // Invalidate by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.enabled || tags.length === 0) return;

    try {
      // Note: Vercel KV doesn't have native tag-based invalidation
      // We'll implement a simple pattern-based approach
      const pattern = `fbc_cache:*:*`;
      const keys = await kv.keys(pattern);

      // For now, we'll do selective invalidation based on common patterns
      // In production, consider using a more sophisticated tagging system
      logger.info('Cache invalidation requested', { tags, type: 'cache_invalidation' });
    } catch (error) {
      logger.error('Cache invalidation failed', error instanceof Error ? error : new Error('Unknown error'), {
        tags,
        type: 'cache_error'
      });
    }
  }

  // Get cache statistics
  async getStats(): Promise<{
    enabled: boolean;
    // Note: Vercel KV doesn't provide detailed stats like Redis
    // We could implement our own stats tracking if needed
  }> {
    return {
      enabled: this.enabled
    };
  }
}

// Export singleton instance
export const vercelCache = new VercelCache();

// Cache decorators for API routes
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    namespace: string;
    ttl?: number;
    tags?: string[];
    keyGenerator?: (...args: T) => string;
  }
) {
  return async (...args: T): Promise<R> => {
    const { namespace, ttl, tags, keyGenerator } = options;

    // Generate cache key
    const identifier = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    const cacheKey = `${namespace}:${identifier}`;

    // Try to get from cache first
    const cached = await vercelCache.get<R>(namespace, identifier);
    if (cached !== null) {
      logger.debug('Using cached result', { cacheKey, type: 'cache_hit' });
      return cached;
    }

    // Execute function and cache result
    logger.debug('Executing function and caching result', { cacheKey, type: 'cache_miss' });
    const result = await fn(...args);

    await vercelCache.set(namespace, identifier, result, {
      ttl,
      tags
    });

    return result;
  };
}

// Response caching headers for HTTP caching
export function getCacheHeaders(config: {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  cacheControl?: string;
} = {}): Record<string, string> {
  const {
    maxAge = 300, // 5 minutes default
    sMaxAge = 600, // 10 minutes for CDN
    staleWhileRevalidate = 86400, // 24 hours background revalidation
    cacheControl
  } = config;

  if (cacheControl) {
    return { 'Cache-Control': cacheControl };
  }

  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    'Vercel-CDN-Cache-Control': `max-age=${sMaxAge}`,
  };
}

// Cache utilities for common operations
export const CacheUtils = {
  // Session cache key generator
  sessionKey: (sessionId: string, type: string = 'data') =>
    `session_${sessionId}_${type}`,

  // Context cache key generator
  contextKey: (sessionId: string, contextType: string = 'general') =>
    `context_${sessionId}_${contextType}`,

  // Intelligence cache key generator
  intelligenceKey: (operation: string, params: Record<string, any>) =>
    `intelligence_${operation}_${JSON.stringify(params)}`,

  // API response cache key generator
  apiResponseKey: (method: string, url: string, params?: Record<string, any>) =>
    `api_${method}_${url}_${JSON.stringify(params || {})}`,
};

// Cache middleware for API routes
export function withResponseCache(
  handler: (request: Request) => Promise<Response>,
  options: {
    maxAge?: number;
    revalidate?: boolean;
    tags?: string[];
  } = {}
) {
  return async (request: Request): Promise<Response> => {
    const { maxAge = 300, revalidate = false, tags = [] } = options;

    // Execute handler
    const response = await handler(request);

    // Clone response to modify headers
    const newResponse = new Response(response.body, response);

    // Add cache headers
    const cacheHeaders = getCacheHeaders({ maxAge });
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      newResponse.headers.set(key, value);
    });

    // Add custom cache tags if provided
    if (tags.length > 0) {
      newResponse.headers.set('X-Cache-Tags', tags.join(','));
    }

    // Add revalidation info
    if (revalidate) {
      newResponse.headers.set('X-Revalidate', 'true');
    }

    return newResponse;
  };
}

// ISR helper for pages
export function generateISRConfig(revalidate: number = 3600) {
  return {
    revalidate,
    // Note: Next.js ISR will handle the regeneration automatically
  };
}

// Memory cache fallback for development
class MemoryCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  async set(key: string, data: any, ttlSeconds: number): Promise<void> {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

// Use memory cache in development, Vercel KV in production
export const cache = process.env.VERCEL_ENV === 'production' ? vercelCache : new MemoryCache() as any;
