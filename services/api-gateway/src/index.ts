import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'
import jwt from 'jsonwebtoken'

const app = express()
const PORT = Number(process.env.PORT) || 3000
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey-changeinprod'

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// Middleware to extract user from JWT and attach to headers
const attachUser = (req: Request, _res: Response, next: NextFunction) => {
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(auth.split(' ')[1], JWT_SECRET) as any
      req.headers['x-user-id'] = payload.userId
      req.headers['x-user-email'] = payload.email
    } catch {
      // Invalid token — let downstream service handle it
    }
  }
  next()
}

// Require valid token
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers['x-user-id']) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

app.use(attachUser)

// Auth — public
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  changeOrigin: true,
  on: {
    proxyReq: fixRequestBody,
    error: (_err, _req, res: any) => {
      res.status(502).json({ error: 'Auth service unavailable' })
    },
  },
}))

// Documents — protected
app.use('/api/documents', requireAuth, createProxyMiddleware({
  target: process.env.DOCUMENT_SERVICE_URL || 'http://document-service:3003',
  changeOrigin: true,
  on: {
    proxyReq: fixRequestBody,
    error: (_err, _req, res: any) => {
      res.status(502).json({ error: 'Document service unavailable' })
    },
  },
}))

// Presence — protected
app.use('/api/presence', requireAuth, createProxyMiddleware({
  target: process.env.PRESENCE_SERVICE_URL || 'http://presence-service:3004',
  changeOrigin: true,
  on: {
    proxyReq: fixRequestBody,
    error: (_err, _req, res: any) => {
      res.status(502).json({ error: 'Presence service unavailable' })
    },
  },
}))

// Collab WebSocket
app.use('/collab', createProxyMiddleware({
  target: process.env.COLLAB_SERVICE_URL || 'http://collaboration-service:3002',
  changeOrigin: true,
  ws: true,
}))

app.listen(PORT, () => {
  console.log(`[api-gateway] started on port ${PORT}`)
})