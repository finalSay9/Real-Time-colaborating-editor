import { Pool } from 'pg'
import { Document } from '@collab/shared-types'
import { v4 as uuid } from 'uuid'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS documents (
      id          UUID PRIMARY KEY,
      title       TEXT NOT NULL,
      owner_id    UUID NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id           UUID PRIMARY KEY,
      document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      state        BYTEA NOT NULL,
      version      INTEGER NOT NULL DEFAULT 1,
      saved_at     TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_document_id
      ON snapshots(document_id);
  `)
}

export async function createDocument(title: string, ownerId: string) {
  const { rows } = await pool.query(
    `INSERT INTO documents (id, title, owner_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [uuid(), title, ownerId]
  )
  return rows[0] as Document
}

export async function getDocument(id: string) {
  const { rows } = await pool.query(
    'SELECT * FROM documents WHERE id = $1',
    [id]
  )
  return rows[0] as Document | undefined
}

export async function listDocuments(ownerId: string) {
  const { rows } = await pool.query(
    'SELECT * FROM documents WHERE owner_id = $1 ORDER BY updated_at DESC',
    [ownerId]
  )
  return rows as Document[]
}

export async function saveSnapshot(
  documentId: string,
  state: Buffer,
  version: number
) {
  await pool.query(
    `INSERT INTO snapshots (id, document_id, state, version)
     VALUES ($1, $2, $3, $4)`,
    [uuid(), documentId, state, version]
  )

  await pool.query(
    'UPDATE documents SET updated_at = NOW() WHERE id = $1',
    [documentId]
  )
}

export async function getLatestSnapshot(documentId: string) {
  const { rows } = await pool.query(
    `SELECT * FROM snapshots
     WHERE document_id = $1
     ORDER BY version DESC
     LIMIT 1`,
    [documentId]
  )
  return rows[0]
}