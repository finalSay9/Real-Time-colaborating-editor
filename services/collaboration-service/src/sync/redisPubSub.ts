import { Redis } from 'ioredis'
import { createLogger } from '@collab/logger'

const logger = createLogger('redis-pubsub')

// Two separate Redis clients — ioredis requires this because
// a client in subscribe mode can't send other commands
const publisher = new Redis(process.env.REDIS_URL!)
const subscriber = new Redis(process.env.REDIS_URL!)

type UpdateHandler = (documentId: string, update: Uint8Array, senderId: string) => void

const handlers: UpdateHandler[] = []

export async function initPubSub() {
  // Subscribe to all document update channels using a pattern
  await subscriber.psubscribe('doc:*')

  subscriber.on('pmessage', (_pattern, channel, message) => {
    // channel format: "doc:{documentId}"
    const documentId = channel.replace('doc:', '')

    const parsed = JSON.parse(message)
    const update = new Uint8Array(Buffer.from(parsed.update, 'base64'))
    const senderId = parsed.senderId

    // Notify all registered handlers (the socket handler)
    handlers.forEach((h) => h(documentId, update, senderId))
  })

  logger.info('Redis pub/sub initialized')
}

// Called by socket handler when a client sends an edit
export async function broadcastUpdate(
  documentId: string,
  update: Uint8Array,
  senderId: string
) {
  const payload = JSON.stringify({
    // Convert binary to base64 for JSON transport
    update: Buffer.from(update).toString('base64'),
    senderId,
  })

  await publisher.publish(`doc:${documentId}`, payload)
}

export function onUpdate(handler: UpdateHandler) {
  handlers.push(handler)
}

export { publisher }