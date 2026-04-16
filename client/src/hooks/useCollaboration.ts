import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import * as Y from 'yjs'
import { useAuthStore } from '@/store/authStore'

interface ActiveUser {
  userId: string
  userName: string
}

const USER_COLORS = [
  '#7c3aed', '#db2777', '#0891b2',
  '#059669', '#d97706', '#dc2626',
]

export function useCollaboration(documentId: string) {
  const { token, user } = useAuthStore()
  const [connected, setConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [error, setError] = useState<string | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const ydocRef = useRef<Y.Doc>(new Y.Doc())

  // Assign a consistent color per user
  const userColor = USER_COLORS[
    user?.id
      ? parseInt(user.id.replace(/-/g, '').slice(0, 8), 16) % USER_COLORS.length
      : 0
  ]

  useEffect(() => {
    if (!token || !documentId) return

    const socket = io('/', {
      path: '/collab/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setError(null)

      // Join the document room and send our name
      socket.emit('doc:join', {
        documentId,
        userName: user?.name ?? 'Anonymous',
      })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('connect_error', (err) => {
      setError(`Connection failed: ${err.message}`)
      setConnected(false)
    })

    // Receive full document state on join
    socket.on('doc:full-state', ({ state }: { state: number[] }) => {
      Y.applyUpdate(ydocRef.current, new Uint8Array(state))
    })

    // Receive incremental updates from other users
    socket.on('doc:update', ({ update }: { update: number[] }) => {
      Y.applyUpdate(ydocRef.current, new Uint8Array(update))
    })

    // Track active users
    socket.on('user:joined', ({ userId, userName }: ActiveUser) => {
      setActiveUsers((prev) => {
        if (prev.find((u) => u.userId === userId)) return prev
        return [...prev, { userId, userName }]
      })
    })

    socket.on('user:left', ({ userId }: { userId: string }) => {
      setActiveUsers((prev) => prev.filter((u) => u.userId !== userId))
    })

    // Send local Yjs updates to the server
    const handleUpdate = (update: Uint8Array, origin: any) => {
      // origin === null means the update came from this client
      // (not from the server), so we send it out
      if (origin !== 'remote') {
        socket.emit('doc:update', {
          documentId,
          update: Array.from(update),
        })
      }
    }

    ydocRef.current.on('update', handleUpdate)

    return () => {
      ydocRef.current.off('update', handleUpdate)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [token, documentId])

  return {
    ydoc: ydocRef.current,
    socket: socketRef.current,
    connected,
    activeUsers,
    error,
    userColor,
  }
}