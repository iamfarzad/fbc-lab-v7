import RobotsParser from 'robots-parser'
import { vercelCache } from './vercel-cache'

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; F.B/c AI Bot/1.0)'
const ROBOTS_CACHE_TTL = 3600 // 1 hour

/**
 * Fetches and caches robots.txt file from a domain
 */
export async function fetchRobotsTxt(url: string): Promise<string | null> {
  try {
    const urlObj = new URL(url)
    const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`

    // Check cache first
    const cacheKey = `robots:${urlObj.host}`
    const cached = await vercelCache.get<string>('robots', cacheKey)
    if (cached) {
      return cached
    }

    // Fetch robots.txt
    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': DEFAULT_USER_AGENT
      },
      // Don't wait too long for robots.txt
      signal: AbortSignal.timeout(3000)
    })

    if (!response.ok) {
      // If robots.txt doesn't exist, that's allowed - everything is crawlable
      if (response.status === 404) {
        return null
      }
      // Other errors - log but don't fail
      console.warn(`Failed to fetch robots.txt from ${robotsUrl}: ${response.status}`)
      return null
    }

    const robotsTxt = await response.text()

    // Cache the result (cache null as well to avoid repeated 404s)
    await vercelCache.set('robots', cacheKey, robotsTxt || '', { ttl: ROBOTS_CACHE_TTL })

    return robotsTxt || null
  } catch (error) {
    // Network errors, timeouts, etc. - don't block, just log
    if (error instanceof Error && error.name !== 'AbortError') {
      console.warn(`Error fetching robots.txt for ${url}:`, error.message)
    }
    return null
  }
}

/**
 * Checks if a URL can be crawled according to robots.txt rules
 * @param url - The URL to check
 * @param userAgent - Optional custom user agent (defaults to F.B/c AI Bot)
 * @returns Object with allowed status and violation details
 */
export async function canCrawl(
  url: string,
  userAgent: string = DEFAULT_USER_AGENT
): Promise<{
  allowed: boolean
  reason?: string
  violated?: boolean
}> {
  try {
    const robotsTxt = await fetchRobotsTxt(url)
    
    // If no robots.txt exists, everything is allowed
    if (!robotsTxt) {
      return { allowed: true }
    }

    const urlObj = new URL(url)
    const robots = RobotsParser(robotsUrl(urlObj), robotsTxt)

    // Check if the specific URL path is disallowed
    const isAllowed = robots.isAllowed(url, userAgent)

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `URL path is disallowed by robots.txt`,
        violated: true
      }
    }

    // Also check crawl delay (informational, not blocking)
    const crawlDelay = robots.getCrawlDelay(userAgent)
    if (crawlDelay && crawlDelay > 10) {
      console.warn(`High crawl delay (${crawlDelay}s) detected for ${urlObj.host}`)
    }

    return { allowed: true }
  } catch (error) {
    // If parsing fails, default to allowed (don't block)
    console.warn(`Error parsing robots.txt for ${url}:`, error)
    return { allowed: true }
  }
}

/**
 * Helper to construct robots.txt URL from a URL object
 */
function robotsUrl(urlObj: URL): string {
  return `${urlObj.protocol}//${urlObj.host}/robots.txt`
}

