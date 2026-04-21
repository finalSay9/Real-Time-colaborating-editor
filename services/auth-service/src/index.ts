import 'dotenv/config'
import express from 'express'
import { createTables } from './db/userRepository'
import { createLogger } from '@collab/logger'
import registerRoute from './routes/register'
import loginRoute from './routes/login'

const app = express()
const logger = createLogger('auth-service')
const PORT = process.env.PORT ?? 3001

app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))

// Mount at root — gateway strips /api/auth prefix before forwarding
// so auth-service receives /register and /login directly
app.use('/', registerRoute)
app.use('/', loginRoute)

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