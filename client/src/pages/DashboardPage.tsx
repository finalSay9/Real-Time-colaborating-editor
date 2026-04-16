import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import { Button } from '../components/ui/Button'
import {
  FileText, Plus, LogOut, Clock,
  Users, ChevronRight, Loader2
} from 'lucide-react'

interface Document {
  id: string
  title: string
  owner_id: string
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const { user, logout, token } = useAuthStore()
  const navigate = useNavigate()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showNewDoc, setShowNewDoc] = useState(false)

  useEffect(() => {
    if (!token) { navigate('/'); return }
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    fetchDocs()
  }, [token])

  const fetchDocs = async () => {
    try {
      const { data } = await axios.get('/api/documents')
      setDocs(data)
    } finally {
      setLoading(false)
    }
  }

  const createDoc = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const { data } = await axios.post('/api/documents', {
        title: newTitle.trim()
      })
      setDocs((prev) => [data, ...prev])
      setNewTitle('')
      setShowNewDoc(false)
      navigate(`/doc/${data.id}`)
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white hidden sm:block">
              CollabEditor
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* User avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
                {user?.name}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              My documents
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {docs.length} document{docs.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => setShowNewDoc(true)} size="md">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:block">New document</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* New doc form */}
        {showNewDoc && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Document title
            </p>
            <div className="flex gap-3">
              <input
                autoFocus
                type="text"
                placeholder="Untitled document"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createDoc()}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button onClick={createDoc} loading={creating} size="md">
                Create
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={() => { setShowNewDoc(false); setNewTitle('') }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Document list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              No documents yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Create your first document to get started
            </p>
            <Button onClick={() => setShowNewDoc(true)}>
              <Plus className="w-4 h-4" />
              Create document
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {docs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => navigate(`/doc/${doc.id}`)}
                className="w-full text-left bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {formatDate(doc.updated_at)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}