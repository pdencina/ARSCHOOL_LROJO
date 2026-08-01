/**
 * In-memory sliding window rate limiter for API routes.
 * 
 * Suitable for Vercel serverless: limits per-instance burst abuse.
 * For production at scale, consider upgrading to Redis (Upstash) backing.
 * 
 * Usage:
 *   const limiter = createRateLimiter({ interval: 60_000, maxRequests: 5 })
 *   const { success, remaining, reset } = limiter.check(identifier)
 */

interface RateLimitOptions {
  /** Time window in milliseconds */
  interval: number
  /** Maximum requests allowed within the window */
  maxRequests: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number // timestamp when the window resets
  limit: number
}

interface TokenBucket {
  timestamps: number[]
}

export function createRateLimiter(options: RateLimitOptions) {
  const { interval, maxRequests } = options
  const store = new Map<string, TokenBucket>()

  // Periodic cleanup to prevent memory leaks (every 60s)
  let lastCleanup = Date.now()
  const CLEANUP_INTERVAL = 60_000

  function cleanup() {
    const now = Date.now()
    if (now - lastCleanup < CLEANUP_INTERVAL) return
    lastCleanup = now

    const cutoff = now - interval
    for (const [key, bucket] of store.entries()) {
      bucket.timestamps = bucket.timestamps.filter(t => t > cutoff)
      if (bucket.timestamps.length === 0) {
        store.delete(key)
      }
    }
  }

  function check(identifier: string): RateLimitResult {
    cleanup()

    const now = Date.now()
    const cutoff = now - interval

    let bucket = store.get(identifier)
    if (!bucket) {
      bucket = { timestamps: [] }
      store.set(identifier, bucket)
    }

    // Remove timestamps outside the current window
    bucket.timestamps = bucket.timestamps.filter(t => t > cutoff)

    if (bucket.timestamps.length >= maxRequests) {
      // Rate limited
      const oldestInWindow = bucket.timestamps[0]
      const reset = oldestInWindow + interval
      return {
        success: false,
        remaining: 0,
        reset,
        limit: maxRequests,
      }
    }

    // Allow the request
    bucket.timestamps.push(now)
    return {
      success: true,
      remaining: maxRequests - bucket.timestamps.length,
      reset: now + interval,
      limit: maxRequests,
    }
  }

  return { check }
}

/**
 * Pre-configured rate limiters for payment endpoints.
 * 
 * - webpayCreateLimiter: 5 transactions per minute per user (prevent rapid-fire payments)
 * - webpayGlobalLimiter: 30 transactions per minute globally (protect Transbank quota)
 */
export const webpayCreateLimiter = createRateLimiter({
  interval: 60_000,    // 1 minute
  maxRequests: 5,      // 5 payment initiations per user per minute
})

export const webpayGlobalLimiter = createRateLimiter({
  interval: 60_000,    // 1 minute
  maxRequests: 30,     // 30 total transactions per minute across all users
})

/**
 * General API rate limiter for payment-related endpoints.
 * More permissive: 20 requests per minute per IP.
 */
export const paymentApiLimiter = createRateLimiter({
  interval: 60_000,
  maxRequests: 20,
})

/**
 * Helper: Extract client identifier from request for rate limiting.
 * Uses user ID if authenticated, falls back to IP.
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`

  // Try standard headers (Vercel, Cloudflare, nginx)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return `ip:${forwarded.split(',')[0].trim()}`

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return `ip:${realIp}`

  return `ip:unknown-${Date.now()}`
}

/**
 * Helper: Build a rate-limit error response with standard headers.
 */
export function rateLimitResponse(result: RateLimitResult) {
  return new Response(
    JSON.stringify({
      error: 'Demasiadas solicitudes. Intenta de nuevo en unos momentos.',
      retry_after: Math.ceil((result.reset - Date.now()) / 1000),
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
        'Retry-After': String(Math.ceil((result.reset - Date.now()) / 1000)),
      },
    }
  )
}
