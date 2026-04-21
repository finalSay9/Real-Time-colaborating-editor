import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import Placeholder from '@tiptap/extension-placeholder'
import * as Y from 'yjs'
import { io, Socket } from 'socket.io-client'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import {
  ArrowLeft, Users, Wifi, WifiOff,
  Bold, Italic, List, Heading2, Loader2
} from 'lucide-react'

interface Document { id: string; title: string }
interface ActiveUser { userId: string; userName: string }

const USER_COLORS = ['#7c3aed','#db2777','#0891b2','#059669','#d97706','#dc2626']

function getUserColor(userId: string) {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length]
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()

  const [doc, setDoc] = useState<Document | null>(null)
  const [connected, setConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [showUsers, setShowUsers] = useState(false)
  const [editorReady, setEditorReady] = useState(false)

  const ydocRef = useRef<Y.Doc>(new Y.Doc())
  const socketRef = useRef<Socket | null>(null)

  const userColor = user?.id ? getUserColor(user.id) : '#7c3aed'

  useEffect(() => {
    if (!token || !id) return
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    axios.get(`/api/documents/${id}`)
      .then(({ data }) => setDoc(data))
      .catch(() => navigate('/dashboard'))
  }, [id, token])

  useEffect(() => {
    if (!id || !token) return

    const socket = io('/', {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('doc:join', {
        documentId: id,
        userName: user?.name ?? 'Anonymous',
      })
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message)
    })

    socket.on('doc:full-state', ({ state }: { state: number[] }) => {
      Y.applyUpdate(ydocRef.current, new Uint8Array(state))
      setEditorReady(true)
    })

    // ✅ Fixed: use 'update' not 'state'
    socket.on('doc:update', ({ update }: { update: number[] }) => {
      Y.applyUpdate(ydocRef.current, new Uint8Array(update), 'remote')
    })

    socket.on('user:joined', (data: ActiveUser) => {
      setActiveUsers(prev =>
        prev.find(u => u.userId === data.userId) ? prev : [...prev, data]
      )
    })

    socket.on('user:left', ({ userId }: { userId: string }) => {
      setActiveUsers(prev => prev.filter(u => u.userId !== userId))
    })

    const handleUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote') {
        socket.emit('doc:update', {
          documentId: id,
          update: Array.from(update),
        })
      }
    }

    ydocRef.current.on('update', handleUpdate)

    // Show editor after 2s even if server doesn't send full-state
    // (handles empty new documents)
    const timer = setTimeout(() => setEditorReady(true), 2000)

    return () => {
      clearTimeout(timer)
      ydocRef.current.off('update', handleUpdate)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
      setEditorReady(false)
    }
  }, [id, token])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,    // Collaboration extension handles undo/redo
      }),
      Collaboration.configure({
        document: ydocRef.current,
      }),
      Placeholder.configure({
        placeholder: 'Start writing…',
      }),
    ],
    editorProps: {
      attributes: { class: 'tiptap-editor focus:outline-none' },
    },
  })

  if (!doc || !editorReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {!doc ? 'Loading document…' : 'Connecting…'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">

      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">

          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h1 className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">
            {doc.title}
          </h1>

          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
              connected
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
            }`}>
              {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:block">{connected ? 'Live' : 'Connecting…'}</span>
            </div>

            <button
              onClick={() => setShowUsers(!showUsers)}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
            >
              <Users className="w-3 h-3" />
              <span>{activeUsers.length + 1}</span>
            </button>

            {showUsers && (
              <div className="absolute top-14 right-4 w-48 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg p-3 z-30">
                <p className="text-xs font-medium text-gray-500 mb-2">Active now</p>
                <div className="flex items-center gap-2 py-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: userColor }} />
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {user?.name} <span className="text-gray-400">(you)</span>
                  </span>
                </div>
                {activeUsers.map(u => (
                  <div key={u.userId} className="flex items-center gap-2 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{u.userName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {editor && (
          <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center gap-1 overflow-x-auto">
            {[
              { icon: <Bold className="w-4 h-4" />, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: 'Bold' },
              { icon: <Italic className="w-4 h-4" />, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: 'Italic' },
              { icon: <Heading2 className="w-4 h-4" />, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), title: 'Heading' },
              { icon: <List className="w-4 h-4" />, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: 'List' },
            ].map(tool => (
              <button key={tool.title} onClick={tool.action} title={tool.title}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  tool.active
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}>
                {tool.icon}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8">
        <EditorContent
          editor={editor}
          className="min-h-[calc(100vh-200px)] prose prose-gray dark:prose-invert max-w-none"
        />
      </div>
    </div>
  )
}