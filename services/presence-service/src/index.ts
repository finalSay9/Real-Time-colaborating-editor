import express from 'express'
import { Redis } from 'ioredis'
import { createLogger }  from '@collab/logger'

const app = express()
const logger = createLogger('presence-service')
const PORT = process.env.PORT ?? 3004

const redis = new Redis(process.env.REDIS_URL ?? 'redis://redis:6379')

app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))

// Store cursor position for a user in a document
app.post('/api/presence/:documentId', async (req, res) => {
  const { documentId } = req.params
  const userId = req.headers['x-user-id'] as string
  const { cursor, userName, color } = req.body

  if (!userId) return res.status(400).json({ error: 'x-user-id header required' })

  // Store in Redis hash — auto-expires after 30s of inactivity
  const key = `presence:${documentId}`
  await redis.hset(key, userId, JSON.stringify({ userId, userName, cursor, color }))
  await redis.expire(key, 30)

  res.json({ ok: true })
})

// Get all active users in a document
app.get('/api/presence/:documentId', async (req, res) => {
  const { documentId } = req.params
  const data = await redis.hgetall(`presence:${documentId}`)
  const users = Object.values(data).map((v) => JSON.parse(v))
  res.json(users)
})

// Remove user from a document
app.delete('/api/presence/:documentId', async (req, res) => {
  const { documentId } = req.params
  const userId = req.headers['x-user-id'] as string
  await redis.hdel(`presence:${documentId}`, userId)
  res.json({ ok: true })
})

redis.on('connect', () => logger.info('Redis connected'))
redis.on('error', (err) => logger.error(err, 'Redis error'))

app.listen(PORT, () => logger.info({ port: PORT }, 'Presence service started'))
