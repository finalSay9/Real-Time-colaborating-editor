import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { TokenPayload } from '@collab/shared-types'

// Attach decoded user to every request so downstream
// middleware and routes don't need to re-verify
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

// Routes that don't require a token
const PUBLIC_ROUTES = [
  { path: '/api/auth/login', method: 'POST' },
  { path: '/api/auth/register', method: 'POST' },
  { path: '/health', method: 'GET' },
]

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const isPublic = PUBLIC_ROUTES.some(
    (r) => r.path === req.path && r.method === req.method
  )
  if (isPublic) return next()

  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}