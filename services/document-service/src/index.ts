import 'dotenv/config'
import express, { Request, Response } from 'express'
import { createLogger } from '@collab/logger'
import {
  createTables,
  createDocument,
  getDocument,
  listDocuments,
} from './db/documentRepository'
import { startConsumer } from './kafka/consumer'

const app = express()
const logger = createLogger('document-service')
const PORT = process.env.PORT ?? 3003

app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))

// Gateway strips /api/documents prefix so we mount at /
// GET / → list documents
app.get('/', async (req: Request, res: Response) => {
  const ownerId = req.headers['x-user-id'] as string
  if (!ownerId) return res.status(400).json({ error: 'x-user-id header required' })
  try {
    const docs = await listDocuments(ownerId)
    res.json(docs)
  } catch (err) {
    logger.error(err, 'Failed to list documents')
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST / → create document
app.post('/', async (req: Request, res: Response) => {
  const ownerId = req.headers['x-user-id'] as string
  const { title } = req.body
  if (!ownerId) return res.status(400).json({ error: 'x-user-id header required' })
  if (!title) return res.status(400).json({ error: 'title required' })
  try {
    const doc = await createDocument(title, ownerId)
    res.status(201).json(doc)
  } catch (err) {
    logger.error(err, 'Failed to create document')
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /:id → get single document
app.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await getDocument(req.params.id)
    if (!doc) return res.status(404).json({ error: 'Not found' })
    res.json(doc)
  } catch (err) {
    logger.error(err, 'Failed to get document')
    res.status(500).json({ error: 'Internal server error' })
  }
})

async function start() {
  try {
    await createTables()
    logger.info('Database tables ready')

    // Start HTTP server first — don't wait for Kafka
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Document service started')
    })

    // Start Kafka consumer separately — if it fails, HTTP still works
    startConsumer().catch((err) => {
      logger.error(err, 'Kafka consumer failed to start — continuing without it')
    })
  } catch (err) {
    logger.error(err, 'Failed to start document service')
    process.exit(1)
  }
}

start()