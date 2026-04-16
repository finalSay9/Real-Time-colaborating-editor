import { Server, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { TokenPayload } from '@collab/shared-types'
import { createLogger } from '@collab/logger'
import {
  getOrCreateDoc,
  applyUpdate,
  encodeState,
  removeDoc,
  activeDocumentCount,
} from '../crdt/yjsManager'
import {
  broadcastUpdate,
  onUpdate,
} from '../sync/redisPubSub'
import {
  joinDocument,
  leaveDocument,
  getDocumentSessions,
  documentUserCount,
} from '../sync/sessionStore'
import { publishEvent } from '../kafka/producer'

const logger = createLogger('socket-handler')

// Bytes accumulated per document since last snapshot trigger.
// When this exceeds the threshold, we tell document-service
// to save a snapshot via Kafka.
const pendingBytes = new Map<string, number>()
const SNAPSHOT_THRESHOLD = 50_000  // 50KB of edits triggers a snapshot

export function initSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL ?? '*' },
    // Binary transport is more efficient for Yjs updates
    transports: ['websocket', 'polling'],
  })

  // ── Authentication middleware ───────────────────────────────
  // Every socket connection must provide a valid JWT.
  // This runs before any event handlers.
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ??
      socket.handshake.headers?.authorization?.split(' ')[1]

    if (!token) {
      return next(new Error('Authentication required'))
    }

    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as TokenPayload

      // Attach to socket for use in event handlers
      ;(socket as any).user = payload
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  // ── Redis pub/sub → broadcast to local sockets ─────────────
  // When another server instance publishes an update,
  // we receive it here and forward to all local clients
  // in that document EXCEPT the original sender.
  onUpdate((documentId, update, senderId) => {
    // Apply to our local Yjs doc to keep it in sync
    applyUpdate(documentId, update)

    // Forward to all local clients in this document
    // who are NOT the original sender
    const sessions = getDocumentSessions(documentId)
    sessions.forEach(({ socketId }) => {
      if (socketId !== senderId) {
        io.to(socketId).emit('doc:update', {
          documentId,
          update: Array.from(update),
        })
      }
    })
  })

  // ── Connection handler ──────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as TokenPayload
    logger.info({ socketId: socket.id, userId: user.userId }, 'Client connected')

    // ── Join a document room ──────────────────────────────────
    socket.on('doc:join', async ({ documentId, userName }: {
      documentId: string
      userName: string
    }) => {
      try {
        // Track the session
        joinDocument({
          socketId: socket.id,
          userId: user.userId,
          userName,
          documentId,
          joinedAt: Date.now(),
        })

        socket.join(documentId)

        // Send the full current document state to the new client.
        // They'll apply this as the base, then receive incremental
        // updates from this point forward.
        const fullState = encodeState(documentId)
        socket.emit('doc:full-state', {
          documentId,
          state: Array.from(fullState),
        })

        // Tell everyone else in the room a new user joined
        socket.to(documentId).emit('user:joined', {
          userId: user.userId,
          userName,
          documentId,
          activeUsers: documentUserCount(documentId),
        })

        // Publish to Kafka for analytics / audit trail
        await publishEvent({
          type: 'user.connected',
          documentId,
          userId: user.userId,
          userName,
          timestamp: Date.now(),
        })

        logger.info({ userId: user.userId, documentId }, 'User joined document')
      } catch (err) {
        logger.error(err, 'Error joining document')
        socket.emit('error', { message: 'Failed to join document' })
      }
    })

    // ── Receive an edit from this client ──────────────────────
    socket.on('doc:update', async ({ documentId, update }: {
      documentId: string
      update: number[]
    }) => {
      try {
        const updateBytes = new Uint8Array(update)

        // 1. Apply locally to our in-memory Yjs doc
        applyUpdate(documentId, updateBytes)

        // 2. Broadcast to other instances via Redis pub/sub.
        //    Each instance will forward to their local clients.
        await broadcastUpdate(documentId, updateBytes, socket.id)

        // 3. Send directly to other local clients in same room
        //    (faster than waiting for the Redis round-trip)
        socket.to(documentId).emit('doc:update', {
          documentId,
          update,
        })

        // 4. Track pending bytes for snapshot decisions
        const current = (pendingBytes.get(documentId) ?? 0) + update.length
        pendingBytes.set(documentId, current)

        // 5. Trigger a snapshot if enough edits have accumulated
        if (current >= SNAPSHOT_THRESHOLD) {
          pendingBytes.set(documentId, 0)

          await publishEvent({
            type: 'document.changed',
            documentId,
            userId: user.userId,
            timestamp: Date.now(),
            updateSize: current,
          })

          logger.info({ documentId, bytes: current }, 'Snapshot triggered')
        }
      } catch (err) {
        logger.error(err, 'Error processing update')
      }
    })

    // ── Client sends awareness update (cursor position) ───────
    socket.on('awareness:update', ({ documentId, awarenessUpdate }: {
      documentId: string
      awarenessUpdate: number[]
    }) => {
      // Forward cursor positions to all others in the room.
      // No persistence needed — cursors are ephemeral.
      socket.to(documentId).emit('awareness:update', {
        userId: user.userId,
        awarenessUpdate,
      })
    })

    // ── Disconnect ────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const session = leaveDocument(socket.id)

      if (session) {
        // Notify remaining users
        socket.to(session.documentId).emit('user:left', {
          userId: session.userId,
          documentId: session.documentId,
          activeUsers: documentUserCount(session.documentId),
        })

        await publishEvent({
          type: 'user.disconnected',
          documentId: session.documentId,
          userId: session.userId,
          timestamp: Date.now(),
        })

        // If nobody is left in the document, free memory.
        // The Yjs doc will be recreated from a snapshot next time.
        if (documentUserCount(session.documentId) === 0) {
          removeDoc(session.documentId)
        }

        logger.info(
          { userId: session.userId, documentId: session.documentId },
          'User left document'
        )
      }
    })
  })

  logger.info('Socket.io server initialized')
  return io
}