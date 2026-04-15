import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { createUser, findByEmail } from '../db/userRepository'
import { signToken } from '../services/tokenService'
import { createLogger } from '@collab/logger'

const router = Router()
const logger = createLogger('auth-service')

router.post('/register', async (req: Request, res: Response) => {
  const { email, name, password } = req.body

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'email, name, password required' })
  }

  try {
    // Check duplicate before hashing (saves CPU on common mistake)
    const existing = await findByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    // bcrypt cost factor 12 — slow enough to resist brute force,
    // fast enough not to bog down the service
    const hashed = await bcrypt.hash(password, 12)
    const user = await createUser(uuid(), email, name, hashed)

    const token = signToken({ userId: user.id, email: user.email })

    logger.info({ userId: user.id }, 'User registered')
    res.status(201).json({ token, user })
  } catch (err) {
    logger.error(err, 'Registration failed')
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router