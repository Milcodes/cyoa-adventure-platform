'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { apiClient } from '@/lib/api/client'
import {
  Play,
  Clock,
  Star,
  Users,
  ArrowLeft,
  Loader2,
  BookOpen,
  Award
} from 'lucide-react'

interface Story {
  id: string
  title: string
  description: string
  genre: string
  thumbnail_url?: string
  created_by: {
    id: string
    display_name: string
  }
  created_at: string
  avg_playtime_minutes?: number
  total_plays?: number
  avg_rating?: number
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

function StoriesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const genre = searchParams.get('genre')
  const { isAuthenticated } = useAuthStore()

  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    fetchStories()
  }, [genre, isAuthenticated, router])

  const fetchStories = async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.append('status', 'published')
      if (genre) {
        params.append('genre', genre)
      }

      const { data } = await apiClient.get(`/stories?${params.toString()}`)
      setStories(data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Történetek betöltése sikertelen')
    } finally {
      setLoading(false)
    }
  }

  const handlePlayStory = (storyId: string) => {
    router.push(`/play/${storyId}`)
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Vissza a műfajokhoz
          </button>

          <h1 className="text-4xl font-bold mb-2">
            {genre ? genreNames[genre] || genre : 'Összes történet'}
          </h1>
          <p className="text-gray-400">
            {loading ? 'Betöltés...' : `${stories.length} történet található`}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
          </div>
        )}

        {/* Empty State */}
        {!loading && stories.length === 0 && (
          <div className="game-panel p-12 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-bold mb-2">Még nincsenek történetek</h3>
            <p className="text-gray-400 mb-6">
              {genre
                ? `Ebben a műfajban még nem található elérhető történet`
                : 'Még nem található elérhető történet'}
            </p>
            <button
              onClick={handleBackToDashboard}
              className="game-button"
            >
              Vissza a műfajokhoz
            </button>
          </div>
        )}

        {/* Story Grid - Netflix Style */}
        {!loading && stories.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stories.map((story) => (
              <div
                key={story.id}
                className="story-card group cursor-pointer"
                onClick={() => handlePlayStory(story.id)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-primary-900 to-purple-900">
                  {story.thumbnail_url ? (
                    <img
                      src={story.thumbnail_url}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12 text-white/30" />
                    </div>
                  )}

                  {/* Overlay on Hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-primary-500 rounded-full p-4 transform scale-0 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-8 h-8 text-white" fill="white" />
                    </div>
                  </div>

                  {/* Genre Badge */}
                  <div className="absolute top-2 right-2 px-3 py-1 bg-black/70 rounded-full text-xs font-semibold">
                    {genreNames[story.genre] || story.genre}
                  </div>
                </div>

                {/* Story Info */}
                <div>
                  <h3 className="text-lg font-bold mb-1 group-hover:text-primary-400 transition-colors line-clamp-1">
                    {story.title}
                  </h3>

                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {story.description || 'Nincsen leírás'}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {story.avg_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        <span>{story.avg_rating.toFixed(1)}</span>
                      </div>
                    )}

                    {story.total_plays !== undefined && (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{story.total_plays}</span>
                      </div>
                    )}

                    {story.avg_playtime_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{story.avg_playtime_minutes} perc</span>
                      </div>
                    )}
                  </div>

                  {/* Author */}
                  <div className="mt-2 pt-2 border-t border-game-border">
                    <p className="text-xs text-gray-500">
                      Szerző: <span className="text-gray-400">{story.created_by.display_name}</span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Featured Section (if showing all stories) */}
        {!genre && !loading && stories.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-500" />
              Kiemelt történetek
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {stories.slice(0, 2).map((story) => (
                <div
                  key={story.id}
                  className="game-panel p-6 cursor-pointer hover:border-primary-500 transition-colors group"
                  onClick={() => handlePlayStory(story.id)}
                >
                  <div className="flex gap-6">
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-gradient-to-br from-primary-900 to-purple-900 flex-shrink-0">
                      {story.thumbnail_url ? (
                        <img
                          src={story.thumbnail_url}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-white/30" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary-400 transition-colors">
                        {story.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                        {story.description || 'Nincsen leírás'}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full">
                          {genreNames[story.genre] || story.genre}
                        </span>
                        <span className="text-gray-500">
                          {story.created_by.display_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function StoriesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
      </div>
    }>
      <StoriesContent />
    </Suspense>
  )
}
