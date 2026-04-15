import jwt from 'jsonwebtoken'
import { TokenPayload } from '@collab/shared-types'

const SECRET = process.env.JWT_SECRET!
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d'

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): TokenPayload {
  // Throws if invalid or expired — callers should catch this
  return jwt.verify(token, SECRET) as TokenPayload
}