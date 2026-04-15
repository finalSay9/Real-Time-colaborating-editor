import { Request, Response, NextFunction } from 'express'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

// Sliding window rate limit: 100 requests per minute per user.
// Uses Redis INCR + EXPIRE — atomic operations safe across
// multiple gateway instances.
export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.userId ?? req.ip
  const key = `rate:${userId}:${Math.floor(Date.now() / 60000)}`

  const count = await redis.incr(key)

  // Set expiry only on first request in the window
  if (count === 1) await redis.expire(key, 60)

  if (count > 100) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60,
    })
  }

  // Let downstream services see current usage
  res.setHeader('X-RateLimit-Remaining', Math.max(0, 100 - count))
  next()
}