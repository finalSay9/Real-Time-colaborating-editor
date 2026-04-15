export interface Document {
  id: string
  title: string
  ownerId: string
  createdAt: Date
  updatedAt: Date
}

export interface Snapshot {
  id: string
  documentId: string
  state: Buffer        // Yjs binary state vector
  version: number
  savedAt: Date
}

export interface Operation {
  documentId: string
  userId: string
  update: Uint8Array   // Yjs binary update
  timestamp: number
}