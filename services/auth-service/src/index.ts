import 'dotenv/config'   // ← must be first, before any other imports
import express from 'express'
import { createTables } from './db/userRepository'
import { createLogger } from '@/collab/logger'
import registerRoute from './routes/register'
import loginRoute from './routes/login'

const app = express()
const logger = createLogger('auth-service')
const PORT = process.env.PORT ?? 3001

app.use(express.json())
app.get('/health', (_, res) => res.json({ status: 'ok' }))
app.use('/api/auth', registerRoute)
app.use('/api/auth', loginRoute)

async function start() {
  try {
    await createTables()
    logger.info('Database tables ready')
    app.listen(PORT, () => {
      logger.info({ port: PORT }, 'Auth service started')
    })
  } catch (err) {
    logger.error(err, 'Failed to start auth service')
    process.exit(1)
  }
}

start()