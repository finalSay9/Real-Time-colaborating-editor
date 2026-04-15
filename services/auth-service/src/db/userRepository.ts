import { Pool } from 'pg'
import { User } from '@collab/shared-types'

// One pool per service — never share DB connections across services
export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function createTables() {
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