import * as Y from 'yjs'
import { createLogger } from '@collab/logger'

const logger = createLogger('yjs-manager')
const documents = new Map<string, Y.Doc>()

export function getOrCreateDoc(documentId: string): Y.Doc {
  if (documents.has(documentId)) return documents.get(documentId)!
  const doc = new Y.Doc()
  documents.set(documentId, doc)
  logger.info({ documentId }, 'Created new Yjs document')
  return doc
}

export function applyUpdate(documentId: string, update: Uint8Array): void {
  const doc = getOrCreateDoc(documentId)
  Y.applyUpdate(doc, update)
}

export function encodeState(documentId: string): Uint8Array {
  const doc = getOrCreateDoc(documentId)
  return Y.encodeStateAsUpdate(doc)
}

export function encodeStateVector(documentId: string): Uint8Array {
  const doc = getOrCreateDoc(documentId)
  return Y.encodeStateVector(doc)
}

export function removeDoc(documentId: string): void {
  const doc = documents.get(documentId)
  if (doc) {
    doc.destroy()
    documents.delete(documentId)
    logger.info({ documentId }, 'Yjs document removed')
  }
}

export function activeDocumentCount(): number {
  return documents.size
}