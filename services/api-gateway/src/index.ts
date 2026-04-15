import express from 'express'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { authenticate } from './middleware/authenticate'
import { requestId } from './middleware/requestId'
import { rateLimit } from './middleware/rateLimit'
import { createLogger } from '@collab/logger'

const app = express()
const logger = createLogger('api-gateway')
const PORT = process.env.PORT ?? 3000

// Order matters — requestId first so traceId exists for all logging
app.use(requestId)
app.use(express.json())
app.use(authenticate)
app.use(rateLimit)

// Health check (public, no auth)
app.get('/health', (_, res) => res.json({ status: 'ok' }))

// Proxy each path to its service.
// The gateway forwards the traceId and user headers
// so downstream services have full context.
const proxy = (target: string) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        // Forward identity so services don't re-verify JWT
        if ((req as any).user) {
          proxyReq.setHeader('x-user-id', (req as any).user.userId)
          proxyReq.setHeader('x-user-email', (req as any).user.email)
        }
        proxyReq.setHeader('x-trace-id', req.headers['x-trace-id'] ?? '')
      },
      error: (err, req, res) => {
        logger.error({ err, path: req.url }, 'Proxy error')
        ;(res as any).status(502).json({ error: 'Service unavailable' })
      },
    },
  })

app.use('/api/auth', proxy(process.env.AUTH_SERVICE_URL!))
app.use('/api/documents', proxy(process.env.DOCUMENT_SERVICE_URL!))
app.use('/api/presence', proxy(process.env.PRESENCE_SERVICE_URL!))

// WebSocket traffic for collaboration gets proxied with ws support
app.use('/collab', proxy(process.env.COLLAB_SERVICE_URL!))

app.listen(PORT, () => logger.info({ port: PORT }, 'API Gateway started'))