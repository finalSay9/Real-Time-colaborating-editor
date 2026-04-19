// services/auth-service/src/db/userRepository.ts
import { Pool } from 'pg'
import { User } from '@collab/shared-types'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

// Retry connecting up to 10 times with 3 second gaps.
// Handles the case where postgres is healthy but not yet
// accepting connections from this specific container.
export async function waitForDb(retries = 10, delayMs = 3000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (err: any) {
      console.log(`DB connection attempt ${i}/${retries} failed: ${err.message}`)
      if (i === retries) throw err
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
}

export async function createTables() {
  await waitForDb()   // ← wait before trying to create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      password    TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `)
}

export async function findByEmail(email: string) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  )
  return rows[0] as (User & { password: string }) | undefined
}

export async function createUser(
  id: string,
  email: string,
  name: string,
  hashedPassword: string
) {
  const { rows } = await pool.query(
    `INSERT INTO users (id, email, name, password)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, name, created_at`,
    [id, email, name, hashedPassword]
  )
  return rows[0] as User
}