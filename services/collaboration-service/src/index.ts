import 'dotenv/config'
import { createServer } from 'http'
import express from 'express'
import { createLogger } from '@collab/logger'
import { initPubSub } from './sync/redisPubSub'
import { connectProducer, disconnectProducer } from './kafka/producer'
import { initSocketServer } from './gateway/socketHandler'
import { activeDocumentCount } from './crdt/yjsManager'

const app = express()
const logger = createLogger('collab-service')
const PORT = process.env.PORT ?? 3002

// Health + basic metrics endpoint for Prometheus
app.get('/health', (_, res) => res.json({ status: 'ok' }))
app.get('/metrics', (_, res) => {
  res.json({
    activeDocuments: activeDocumentCount(),
    uptime: process.uptime(),
  })
})

async function start() {
  try {
    // Connect to Kafka before accepting any socket connections
    await connectProducer()

    // Connect Redis pub/sub
    await initPubSub()

    // Wrap express in an http.Server so Socket.io can attach
    const httpServer = createServer(app)
    initSocketServer(httpServer)

    httpServer.listen(PORT, () => {
      logger.info({ port: PORT }, 'Collaboration service started')
    })

    // Graceful shutdown — finish in-flight operations before exiting
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Shutting down')
      await disconnectProducer()
      process.exit(0)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (err) {
    logger.error(err, 'Failed to start collaboration service')
    process.exit(1)
  }
}

start()