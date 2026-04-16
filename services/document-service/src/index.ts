import 'dotenv/config'
import express, { Request, Response } from 'express'
import { createLogger } from '@collab/logger'
import { createTables, createDocument, getDocument, listDocuments } from './db/documentRepository'
import { startConsumer } from './kafka/consumer'

const app = express()
const logger = createLogger('document-service')
const PORT = process.env.PORT ?? 3003

app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))

// x-user-id is set by the API gateway after verifying the JWT
app.post('/api/documents', async (req: Request, res: Response) => {
  const ownerId = req.headers['x-user-id'] as string
  const { title } = req.body

  if (!title) return res.status(400).json({ error: 'title required' })

  try {
    const doc = await createDocument(title, ownerId)
    res.status(201).json(doc)
  } catch (err) {
    logger.error(err, 'Failed to create document')
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/api/documents', async (req: Request, res: Response) => {
  const ownerId = req.headers['x-user-id'] as string
  const docs = await listDocuments(ownerId)
  res.json(docs)
})

app.get('/api/documents/:id', async (req: Request, res: Response) => {
  const doc = await getDocument(req.params.id)
  if (!doc) return res.status(404).json({ error: 'Not found' })
  res.json(doc)
})

async function start() {
  try {
    await createTables()
    await startConsumer()

    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Document service started')
    })
  } catch (err) {
    logger.error(err, 'Failed to start document service')
    process.exit(1)
  }
}

start()