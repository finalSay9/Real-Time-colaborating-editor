import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { findByEmail } from '../db/userRepository'
import { signToken } from '../services/tokenService'
import { createLogger } from '@collab/logger'

const router = Router()
const logger = createLogger('auth-service')

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password required' })
  }

  try {
    const user = await findByEmail(email)

    // Always run bcrypt.compare even if user not found —
    // this prevents timing attacks that reveal valid emails
    const passwordMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, '$2b$12$invalidhashfortimingattack')

    if (!user || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = signToken({ userId: user.id, email: user.email })

    logger.info({ userId: user.id }, 'User logged in')
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (err) {
    logger.error(err, 'Login failed')
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router