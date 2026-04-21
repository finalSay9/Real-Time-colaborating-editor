// services/api-gateway/src/middleware/authenticate.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { TokenPayload } from '@collab/shared-types'

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

const PUBLIC_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/health',
]

export function authenticate(req: Request, res: Response, next: NextFunction) {
  // Check if this path is public
  const isPublic = PUBLIC_PATHS.some((path) => req.path.startsWith(path))
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