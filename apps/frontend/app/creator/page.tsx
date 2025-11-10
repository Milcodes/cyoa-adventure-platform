'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { apiClient } from '@/lib/api/client'
import TopNav from '@/components/TopNav'
import {
  PlusCircle,
  Edit,
  Trash2,
  Send,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen
} from 'lucide-react'

interface Story {
  id: string
  title: string
  description: string
  genre: string
  status: 'draft' | 'under_review' | 'published' | 'rejected'
  created_at: string
  updated_at: string
}

const genreNames: Record<string, string> = {
  adventure: 'Kaland',
  horror: 'Horror',
  scifi: 'Sci-Fi',
  fantasy: 'Fantasy',
  romance: 'Romantikus',
  mystery: 'Rejtély',
  historical: 'Történelmi',
  survival: 'Túlélés'
}

const statusColors = {
  draft: 'bg-gray-500',
  under_review: 'bg-yellow-500',
  published: 'bg-green-500',
  rejected: 'bg-red-500'
}

const statusLabels = {
  draft: 'Piszkozat',
  under_review: 'Elbírálás alatt',
  published: 'Publikálva',
  rejected: 'Elutasítva'
}

export default function CreatorDashboard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user?.role !== 'author' && user?.role !== 'admin') {
      alert('Csak szerzők érhetik el ezt az oldalt')
      router.push('/dashboard')
      return
    }

    fetchMyStories()
  }, [isAuthenticated, user, router])

  const fetchMyStories = async () => {
    setLoading(true)
    setError('')

    try {
      const { data } = await apiClient.get('/stories?my_stories=true')
      setStories(data)
    } catch (err: any) {
      setError('Történetek betöltése sikertelen')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateStory = () => {
    router.push('/creator/new')
  }

  const handleEditStory = (storyId: string) => {
    router.push(`/creator/${storyId}`)
  }

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Biztosan törölöd ezt a történetet? Ez a művelet nem visszavonható.')) {
      return
    }

    try {
      await apiClient.delete(`/stories/${storyId}`)
      setStories(stories.filter(s => s.id !== storyId))
    } catch (err: any) {
      alert('Törlés sikertelen: ' + (err.response?.data?.message || 'Ismeretlen hiba'))
    }
  }

  const handleSubmitForReview = async (storyId: string) => {
    if (!confirm('Elküldjed ezt a történetet elbírálásra?')) {
      return
    }

    try {
      await apiClient.post(`/moderation/stories/${storyId}/submit`)
      alert('Történet sikeresen elküldve elbírálásra!')
      fetchMyStories()
    } catch (err: any) {
      alert('Elküldés sikertelen: ' + (err.response?.data?.message || 'Ismeretlen hiba'))
    }
  }

  const handlePreviewStory = (storyId: string) => {
    router.push(`/play/${storyId}`)
  }

  if (!isAuthenticated || (user?.role !== 'author' && user?.role !== 'admin')) {
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
              <h1 className="text-4xl font-bold mb-2">Történet Létrehozó</h1>
              <p className="text-gray-400">Készítsd el a saját interaktív kalandjaidat</p>
            </div>

            <button
              onClick={handleCreateStory}
              className="game-button flex items-center gap-2 group"
            >
              <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              Új Történet
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="game-panel p-4">
              <p className="text-sm text-gray-400 mb-1">Összes történet</p>
              <p className="text-3xl font-bold">{stories.length}</p>
            </div>
            <div className="game-panel p-4">
              <p className="text-sm text-gray-400 mb-1">Publikálva</p>
              <p className="text-3xl font-bold text-green-500">
                {stories.filter(s => s.status === 'published').length}
              </p>
            </div>
            <div className="game-panel p-4">
              <p className="text-sm text-gray-400 mb-1">Elbírálás alatt</p>
              <p className="text-3xl font-bold text-yellow-500">
                {stories.filter(s => s.status === 'under_review').length}
              </p>
            </div>
            <div className="game-panel p-4">
              <p className="text-sm text-gray-400 mb-1">Piszkozat</p>
              <p className="text-3xl font-bold text-gray-500">
                {stories.filter(s => s.status === 'draft').length}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
            </div>
          )}

          {/* Stories List */}
          {!loading && stories.length === 0 && (
            <div className="game-panel p-12 text-center">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-bold mb-2">Még nincs egyetlen történeted sem</h3>
              <p className="text-gray-400 mb-6">Kezdj el egy új történetet most!</p>
              <button onClick={handleCreateStory} className="game-button">
                Új Történet Létrehozása
              </button>
            </div>
          )}

          {!loading && stories.length > 0 && (
            <div className="space-y-4">
              {stories.map((story) => (
                <div key={story.id} className="game-panel p-6 hover:border-primary-500 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">{story.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[story.status]}`}>
                          {statusLabels[story.status]}
                        </span>
                        <span className="px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs font-semibold">
                          {genreNames[story.genre] || story.genre}
                        </span>
                      </div>

                      <p className="text-gray-400 mb-4 line-clamp-2">
                        {story.description || 'Nincs leírás'}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          Frissítve: {new Date(story.updated_at).toLocaleDateString('hu-HU')}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleEditStory(story.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Szerkesztés
                      </button>

                      <button
                        onClick={() => handlePreviewStory(story.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-game-hover hover:bg-game-border rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Előnézet
                      </button>

                      {story.status === 'draft' && (
                        <button
                          onClick={() => handleSubmitForReview(story.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                          <Send className="w-4 h-4" />
                          Elbírálásra
                        </button>
                      )}

                      {story.status === 'draft' && (
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Törlés
                        </button>
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
