import 'dotenv/config'
import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { authenticate } from './middleware/authenticate'
import { requestId } from './middleware/requestId'
import { rateLimit } from './middleware/rateLimit'
import { createLogger } from '@collab/logger'

const app = express()
const logger = createLogger('api-gateway')
const PORT = process.env.PORT ?? 3000

// ── Middleware ────────────────────────────────────────────────
app.use(requestId)

// IMPORTANT: Do NOT use express.json() here.
// The gateway must pass the raw body through to downstream services.
// Parsing it here consumes the stream and the proxy has nothing to forward.

app.use(authenticate)
app.use(rateLimit)

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok' }))

// ── Proxy factory ─────────────────────────────────────────────
const proxy = (target: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 15000,
    timeout: 15000,
    on: {
      proxyReq: (proxyReq, req: any) => {
        // Forward user identity set by authenticate middleware
        if (req.user) {
          proxyReq.setHeader('x-user-id', req.user.userId)
          proxyReq.setHeader('x-user-email', req.user.email)
        }
        proxyReq.setHeader('x-trace-id', req.headers['x-trace-id'] ?? '')
      },
      error: (err, _req, res: any) => {
        logger.error({ err }, 'Proxy error')
        res.status(502).json({ error: 'Service unavailable' })
      },
    },
  })

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', proxy(process.env.AUTH_SERVICE_URL!))
app.use('/api/documents', proxy(process.env.DOCUMENT_SERVICE_URL!))
app.use('/api/presence', proxy(process.env.PRESENCE_SERVICE_URL!))
app.use('/collab', proxy(process.env.COLLAB_SERVICE_URL!))

app.listen(PORT, () => logger.info({ port: PORT }, 'API Gateway started'))