'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { apiClient } from '@/lib/api/client'
import TopNav from '@/components/TopNav'
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  AlertCircle,
  FileText,
  User,
  Calendar
} from 'lucide-react'

interface PendingModeration {
  id: string
  story_id: string
  author_id: string
  submitted_at: string
  author_notes?: string
  story: {
    title: string
    description: string
    genre: string
  }
  author: {
    display_name: string
    email: string
  }
}

export default function ModeratorDashboard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  const [pendingStories, setPendingStories] = useState<PendingModeration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user?.role !== 'moderator' && user?.role !== 'admin') {
      alert('Csak moderátorok és adminisztrátorok férhetnek hozzá')
      router.push('/dashboard')
      return
    }

    fetchPendingStories()
  }, [isAuthenticated, user, router])

  const fetchPendingStories = async () => {
    setLoading(true)
    setError('')

    try {
      const { data } = await apiClient.get('/moderation/pending')
      setPendingStories(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Történetek betöltése sikertelen')
    } finally {
      setLoading(false)
    }
  }

  const handleReviewStory = (moderationId: string) => {
    router.push(`/moderator/review/${moderationId}`)
  }

  const handleViewHistory = () => {
    router.push('/moderator/history')
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Moderátor Dashboard</h1>
              <p className="text-gray-400">Ellenőrizd és hagyd jóvá a beküldött történeteket</p>
            </div>

            <button
              onClick={handleViewHistory}
              className="game-button flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Előzmények
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="game-panel p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Függőben lévő</p>
                  <p className="text-3xl font-bold">{pendingStories.length}</p>
                </div>
              </div>
            </div>

            <div className="game-panel p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Mai jóváhagyások</p>
                  <p className="text-3xl font-bold">0</p>
                </div>
              </div>
            </div>

            <div className="game-panel p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Mai elutasítások</p>
                  <p className="text-3xl font-bold">0</p>
                </div>
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
          {!loading && pendingStories.length === 0 && (
            <div className="game-panel p-12 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-xl font-bold mb-2">Minden történet ellenőrizve!</h3>
              <p className="text-gray-400 mb-6">
                Jelenleg nincsenek jóváhagyásra váró történetek
              </p>
              <button onClick={handleViewHistory} className="game-button">
                Előzmények megtekintése
              </button>
            </div>
          )}

          {/* Pending Stories Queue */}
          {!loading && pendingStories.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-6">
                Jóváhagyásra váró történetek ({pendingStories.length})
              </h2>

              <div className="space-y-4">
                {pendingStories.map((moderation) => (
                  <div
                    key={moderation.id}
                    className="game-panel p-6 hover:border-primary-500 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Story Title */}
                        <h3 className="text-xl font-bold mb-2">
                          {moderation.story.title}
                        </h3>

                        {/* Story Description */}
                        <p className="text-gray-400 mb-4 line-clamp-2">
                          {moderation.story.description || 'Nincs leírás'}
                        </p>

                        {/* Metadata */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-500">Szerző:</span>
                            <span className="text-gray-300">{moderation.author.display_name}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-500">Műfaj:</span>
                            <span className="text-gray-300 capitalize">{moderation.story.genre}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-500">Beküldve:</span>
                            <span className="text-gray-300">
                              {new Date(moderation.submitted_at).toLocaleDateString('hu-HU')}
                            </span>
                          </div>
                        </div>

                        {/* Author Notes */}
                        {moderation.author_notes && (
                          <div className="mt-4 p-3 bg-game-dark rounded-lg border border-game-border">
                            <p className="text-xs text-gray-500 mb-1">Szerző megjegyzése:</p>
                            <p className="text-sm text-gray-300">{moderation.author_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleReviewStory(moderation.id)}
                        className="game-button flex items-center gap-2 whitespace-nowrap"
                      >
                        <Eye className="w-5 h-5" />
                        Ellenőrzés
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
