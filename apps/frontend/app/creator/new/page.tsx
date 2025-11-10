'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import TopNav from '@/components/TopNav'
import { ArrowLeft, Loader2, BookOpen } from 'lucide-react'

const genres = [
  { id: 'adventure', name: 'Kaland' },
  { id: 'horror', name: 'Horror' },
  { id: 'scifi', name: 'Sci-Fi' },
  { id: 'fantasy', name: 'Fantasy' },
  { id: 'romance', name: 'Romantikus' },
  { id: 'mystery', name: 'Rejtély' },
  { id: 'historical', name: 'Történelmi' },
  { id: 'survival', name: 'Túlélés' }
]

export default function NewStoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    genre: 'adventure'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await apiClient.post('/stories', formData)
      router.push(`/creator/${data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Történet létrehozása sikertelen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="pt-20 px-6 pb-12">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => router.push('/creator')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Vissza a történeteimhez
          </button>

          <div className="game-panel p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Új Történet Létrehozása</h1>
                <p className="text-gray-400">Add meg az alapvető információkat</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Történet címe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-game-panel border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                  placeholder="Pl.: A Kincskeresés"
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Leírás
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-game-panel border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                  placeholder="Rövid leírás a történetedről..."
                  rows={4}
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.description.length} / 1000 karakter
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Műfaj <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {genres.map((genre) => (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, genre: genre.id })}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        formData.genre === genre.id
                          ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                          : 'border-game-border hover:border-game-hover'
                      }`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/creator')}
                  className="flex-1 px-6 py-3 bg-game-hover hover:bg-game-border rounded-lg transition-colors"
                  disabled={loading}
                >
                  Mégse
                </button>
                <button
                  type="submit"
                  className="flex-1 game-button flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Létrehozás...
                    </>
                  ) : (
                    'Történet Létrehozása'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
