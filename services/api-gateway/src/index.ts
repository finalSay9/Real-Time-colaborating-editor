import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware'

const app = express()
const PORT = Number(process.env.PORT) || 3000

// Parse body BEFORE proxying — fixRequestBody will re-stream it
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Simple auth check for protected routes
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }
  next()
}

// Auth routes — public, no auth needed
app.use('/api/auth', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
  changeOrigin: true,
  on: {
    proxyReq: fixRequestBody,   // ← this re-attaches the parsed body
    error: (_err, _req, res: any) => {
      res.status(502).json({ error: 'Auth service unavailable' })
    },
  },
}))

// Document routes — protected
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

// Presence routes — protected
app.use('/api/presence', requireAuth, createProxyMiddleware({
  target: process.env.PRESENCE_SERVICE_URL || 'http://presence-service:3004',
  changeOrigin: true,
  on: {
    proxyReq: fixRequestBody,
  },
}))

// Collaboration WebSocket — protected
app.use('/collab', createProxyMiddleware({
  target: process.env.COLLAB_SERVICE_URL || 'http://collaboration-service:3002',
  changeOrigin: true,
  ws: true,
}))

app.listen(PORT, () => {
  console.log(`[api-gateway] started on port ${PORT}`)
})