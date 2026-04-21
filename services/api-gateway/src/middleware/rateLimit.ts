// services/api-gateway/src/middleware/rateLimit.ts
import { Request, Response, NextFunction } from 'express'
import { Redis } from 'ioredis'
import { createLogger } from '@collab/logger'
const logger = createLogger('api-gateway')

const redis = new Redis(process.env.REDIS_URL!)

export async function rateLimit(req: Request, res: Response, next: NextFunction) {
  // Use userId if authenticated, otherwise fall back to IP
  const identifier = req.user?.userId ?? req.ip ?? 'anonymous'
  const window = Math.floor(Date.now() / 60000)
  const key = `rate:${identifier}:${window}`

  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 60)

    if (count > 100) {
      return res.status(429).json({ error: 'Too many requests', retryAfter: 60 })
    }

    res.setHeader('X-RateLimit-Remaining', Math.max(0, 100 - count))
    next()
  } catch (err) {
    // If Redis is down, let the request through rather than blocking everything
    logger.warn('Rate limit Redis error, skipping')
    next()
  }
}