'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { apiClient } from '@/lib/api/client'
import TopNav from '@/components/TopNav'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  MessageSquare,
  Filter
} from 'lucide-react'

interface ModerationHistory {
  id: string
  story_id: string
  author_id: string
  moderator_id: string
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at?: string
  author_notes?: string
  moderator_notes?: string
  story: {
    title: string
    genre: string
  }
  author: {
    display_name: string
  }
  moderator?: {
    display_name: string
  }
}

export default function ModerationHistoryPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  const [history, setHistory] = useState<ModerationHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user?.role !== 'moderator' && user?.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    fetchHistory()
  }, [isAuthenticated, user, router])

  const fetchHistory = async () => {
    setLoading(true)
    setError('')

    try {
      const { data } = await apiClient.get('/moderation/history')
      setHistory(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Előzmények betöltése sikertelen')
    } finally {
      setLoading(false)
    }
  }

  const filteredHistory = history.filter((item) => {
    if (statusFilter === 'all') return item.status !== 'pending'
    return item.status === statusFilter
  })

  const stats = {
    total: history.filter((h) => h.status !== 'pending').length,
    approved: history.filter((h) => h.status === 'approved').length,
    rejected: history.filter((h) => h.status === 'rejected').length
  }

  if (!isAuthenticated || (user?.role !== 'moderator' && user?.role !== 'admin')) {
    return null
  }

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="pt-20 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <button
            onClick={() => router.push('/moderator')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Vissza a dashboard-hoz
          </button>

          <h1 className="text-4xl font-bold mb-8">Elbírálási előzmények</h1>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="game-panel p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Összes elbírált</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="game-panel p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Jóváhagyva</p>
                  <p className="text-3xl font-bold text-green-500">{stats.approved}</p>
                </div>
              </div>
            </div>

            <div className="game-panel p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Elutasítva</p>
                  <p className="text-3xl font-bold text-red-500">{stats.rejected}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="game-panel p-4 mb-6">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-400">Szűrés:</span>

              <div className="flex gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-game-hover text-gray-400 hover:text-white'
                  }`}
                >
                  Összes
                </button>

                <button
                  onClick={() => setStatusFilter('approved')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    statusFilter === 'approved'
                      ? 'bg-green-500 text-white'
                      : 'bg-game-hover text-gray-400 hover:text-white'
                  }`}
                >
                  Jóváhagyott
                </button>

                <button
                  onClick={() => setStatusFilter('rejected')}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    statusFilter === 'rejected'
                      ? 'bg-red-500 text-white'
                      : 'bg-game-hover text-gray-400 hover:text-white'
                  }`}
                >
                  Elutasított
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredHistory.length === 0 && (
            <div className="game-panel p-12 text-center">
              <Clock className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-bold mb-2">Nincsenek előzmények</h3>
              <p className="text-gray-400">
                {statusFilter === 'all'
                  ? 'Még nem történt egyetlen elbírálás sem'
                  : `Nincs ${statusFilter === 'approved' ? 'jóváhagyott' : 'elutasított'} történet`}
              </p>
            </div>
          )}

          {/* History List */}
          {!loading && filteredHistory.length > 0 && (
            <div className="space-y-4">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className={`game-panel p-6 border-l-4 ${
                    item.status === 'approved'
                      ? 'border-l-green-500'
                      : 'border-l-red-500'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {/* Title & Status */}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{item.story.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'approved'
                              ? 'bg-green-500/20 text-green-500'
                              : 'bg-red-500/20 text-red-500'
                          }`}
                        >
                          {item.status === 'approved' ? 'Jóváhagyva' : 'Elutasítva'}
                        </span>
                      </div>

                      {/* Metadata */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500">Szerző:</span>
                          <span className="text-gray-300">{item.author.display_name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Műfaj:</span>
                          <span className="text-gray-300 capitalize">{item.story.genre}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500">Beküldve:</span>
                          <span className="text-gray-300">
                            {new Date(item.submitted_at).toLocaleDateString('hu-HU')}
                          </span>
                        </div>

                        {item.reviewed_at && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Elbírálva:</span>
                            <span className="text-gray-300">
                              {new Date(item.reviewed_at).toLocaleDateString('hu-HU')}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {item.moderator_notes && (
                        <div className="p-3 bg-game-dark rounded-lg border border-game-border">
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" />
                            Moderátor megjegyzése:
                          </p>
                          <p className="text-sm text-gray-300">{item.moderator_notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div>
                      {item.status === 'approved' ? (
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                          <XCircle className="w-6 h-6 text-red-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
