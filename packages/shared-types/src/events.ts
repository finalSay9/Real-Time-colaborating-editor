// These are the typed Kafka event contracts.
// Both producer and consumer import from here —
// if the shape changes, TypeScript catches it everywhere.

export interface DocumentChangedEvent {
  type: 'document.changed'
  documentId: string
  userId: string
  timestamp: number
  updateSize: number   // bytes — used for deciding when to snapshot
}

export interface UserConnectedEvent {
  type: 'user.connected'
  documentId: string
  userId: string
  userName: string
  timestamp: number
}

export interface UserDisconnectedEvent {
  type: 'user.disconnected'
  documentId: string
  userId: string
  timestamp: number
}

export type KafkaEvent =
  | DocumentChangedEvent
  | UserConnectedEvent
  | UserDisconnectedEvent