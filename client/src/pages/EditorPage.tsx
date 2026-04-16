import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Placeholder from '@tiptap/extension-placeholder'
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'
import { useCollaboration } from '@/hooks/useCollaboration'
import {
  ArrowLeft, Users, Wifi, WifiOff,
  Bold, Italic, List, Heading2
} from 'lucide-react'

interface Document {
  id: string
  title: string
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const [doc, setDoc] = useState<Document | null>(null)
  const [showUsers, setShowUsers] = useState(false)

  const { ydoc, connected, activeUsers, error, userColor } =
    useCollaboration(id!)

  // Fetch document metadata
  useEffect(() => {
    if (!token || !id) return
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    axios.get(`/api/documents/${id}`)
      .then(({ data }) => setDoc(data))
      .catch(() => navigate('/dashboard'))
  }, [id, token])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable history — Yjs handles undo/redo
        history: false,
      }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCursor.configure({
        provider: {
          awareness: {
            getLocalState: () => ({
              user: { name: user?.name ?? 'Anonymous', color: userColor },
            }),
            on: () => {},
            off: () => {},
            setLocalStateField: () => {},
          },
        } as any,
        user: { name: user?.name ?? 'Anonymous', color: userColor },
      }),
      Placeholder.configure({
        placeholder: 'Start writing…',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor focus:outline-none',
      },
    },
  })

  if (!doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col">

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Back */}
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Title */}
          <h1 className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">
            {doc.title}
          </h1>

          {/* Right side */}
          <div className="flex items-center gap-2">

            {/* Connection status */}
            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full
              ${connected
                ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-500'
              }`}
            >
              {connected
                ? <Wifi className="w-3 h-3" />
                : <WifiOff className="w-3 h-3" />
              }
              <span className="hidden sm:block">
                {connected ? 'Live' : 'Offline'}
              </span>
            </div>

            {/* Active users */}
            <button
              onClick={() => setShowUsers(!showUsers)}
              className="relative flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
            >
              <Users className="w-3 h-3" />
              <span>{activeUsers.length + 1}</span>
            </button>

            {/* Users dropdown */}
            {showUsers && (
              <div className="absolute top-14 right-4 w-56 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg p-3 z-30">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Active now
                </p>
                {/* Current user */}
                <div className="flex items-center gap-2 py-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: userColor }} />
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {user?.name} <span className="text-gray-400">(you)</span>
                  </span>
                </div>
                {activeUsers.map((u) => (
                  <div key={u.userId} className="flex items-center gap-2 py-1.5">
                    <div className="w-2 h-2 rounded-full bg-indigo-400" />
                    <span className="text-sm text-gray-800 dark:text-gray-200">{u.userName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Formatting toolbar */}
        {editor && (
          <div className="max-w-4xl mx-auto px-4 pb-2 flex items-center gap-1 overflow-x-auto">
            {[
              {
                icon: <Bold className="w-4 h-4" />,
                action: () => editor.chain().focus().toggleBold().run(),
                active: editor.isActive('bold'),
                title: 'Bold',
              },
              {
                icon: <Italic className="w-4 h-4" />,
                action: () => editor.chain().focus().toggleItalic().run(),
                active: editor.isActive('italic'),
                title: 'Italic',
              },
              {
                icon: <Heading2 className="w-4 h-4" />,
                action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
                active: editor.isActive('heading', { level: 2 }),
                title: 'Heading',
              },
              {
                icon: <List className="w-4 h-4" />,
                action: () => editor.chain().focus().toggleBulletList().run(),
                active: editor.isActive('bulletList'),
                title: 'Bullet list',
              },
            ].map((tool) => (
              <button
                key={tool.title}
                onClick={tool.action}
                title={tool.title}
                className={`p-2 rounded-lg transition-colors flex-shrink-0
                  ${tool.active
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
              >
                {tool.icon}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
        </div>
      )}

      {/* Editor area */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8">
        <EditorContent
          editor={editor}
          className="min-h-[calc(100vh-200px)] prose prose-gray dark:prose-invert max-w-none"
        />
      </div>
    </div>
  )
}