// Tracks which socket connections are in which document.
// Pure in-memory — this is fine because it only reflects
// the current state of THIS server instance.

interface Session {
  socketId: string
  userId: string
  userName: string
  documentId: string
  joinedAt: number
}

// documentId → Set of sessions
const sessions = new Map<string, Set<Session>>()
// socketId → session (for quick lookup on disconnect)
const bySocket = new Map<string, Session>()

export function joinDocument(session: Session) {
  if (!sessions.has(session.documentId)) {
    sessions.set(session.documentId, new Set())
  }
  sessions.get(session.documentId)!.add(session)
  bySocket.set(session.socketId, session)
}

export function leaveDocument(socketId: string): Session | undefined {
  const session = bySocket.get(socketId)
  if (!session) return undefined

  sessions.get(session.documentId)?.delete(session)

  // Clean up empty rooms
  if (sessions.get(session.documentId)?.size === 0) {
    sessions.delete(session.documentId)
  }

  bySocket.delete(socketId)
  return session
}

export function getDocumentSessions(documentId: string): Session[] {
  return [...(sessions.get(documentId) ?? [])]
}

export function getSessionBySocket(socketId: string): Session | undefined {
  return bySocket.get(socketId)
}

export function documentUserCount(documentId: string): number {
  return sessions.get(documentId)?.size ?? 0
}