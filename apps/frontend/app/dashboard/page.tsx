'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import {
  Compass,
  Ghost,
  Rocket,
  Sword,
  Heart,
  Brain,
  Crown,
  Mountain,
  PlusCircle,
  Sparkles
} from 'lucide-react'

interface Genre {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  description: string
}

const genres: Genre[] = [
  {
    id: 'adventure',
    name: 'Kaland',
    icon: Compass,
    color: 'from-blue-500 to-cyan-500',
    description: 'Fedezd fel az ismeretlent'
  },
  {
    id: 'horror',
    name: 'Horror',
    icon: Ghost,
    color: 'from-purple-600 to-pink-600',
    description: 'Merülj el a sötétségben'
  },
  {
    id: 'scifi',
    name: 'Sci-Fi',
    icon: Rocket,
    color: 'from-indigo-500 to-blue-600',
    description: 'Utazz a jövőbe'
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    icon: Sword,
    color: 'from-amber-500 to-orange-600',
    description: 'Varázslatos világok várnak'
  },
  {
    id: 'romance',
    name: 'Romantikus',
    icon: Heart,
    color: 'from-rose-500 to-pink-500',
    description: 'Szerelmes történetek'
  },
  {
    id: 'mystery',
    name: 'Rejtély',
    icon: Brain,
    color: 'from-slate-600 to-slate-800',
    description: 'Oldj meg titkokat'
  },
  {
    id: 'historical',
    name: 'Történelmi',
    icon: Crown,
    color: 'from-yellow-600 to-amber-700',
    description: 'Élj át történelmi korokat'
  },
  {
    id: 'survival',
    name: 'Túlélés',
    icon: Mountain,
    color: 'from-green-600 to-emerald-700',
    description: 'Küzdj a túlélésért'
  }
]

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  const handleGenreClick = (genreId: string) => {
    router.push(`/stories?genre=${genreId}`)
  }

  const handleNewStory = () => {
    router.push('/creator/new')
  }

  const canCreateStory = user?.role === 'author' || user?.role === 'admin'

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Üdvözöllek, {user?.display_name || 'Játékos'}! 👋
            </h1>
            <p className="text-gray-400 text-lg">
              Válassz egy műfajt és kezdd el a kalandodat
            </p>
          </div>

          {canCreateStory && (
            <button
              onClick={handleNewStory}
              className="game-button flex items-center gap-2 group"
            >
              <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              Új Történet
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="game-panel p-4 flex items-center gap-4">
            <div className="p-3 bg-primary-500/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Összesen játszott</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>

          <div className="game-panel p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Compass className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Befejezett</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>

          <div className="game-panel p-4 flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Crown className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Kedvencek</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Genre Grid */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Műfajok</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {genres.map((genre) => {
            const Icon = genre.icon
            return (
              <button
                key={genre.id}
                onClick={() => handleGenreClick(genre.id)}
                className="genre-tile group"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${genre.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-lg`} />

                <div className="relative z-10">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${genre.color} flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary-400 transition-colors">
                    {genre.name}
                  </h3>

                  <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                    {genre.description}
                  </p>
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${genre.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-b-lg`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Continue Playing Section */}
      <div className="max-w-7xl mx-auto mt-12">
        <h2 className="text-2xl font-bold mb-6">Folytatás</h2>
        <div className="game-panel p-8 text-center">
          <Ghost className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400">Még nem kezdtél el egyetlen történetet sem</p>
          <p className="text-sm text-gray-500 mt-2">Válassz egy műfajt fent a kezdéshez!</p>
        </div>
      </div>
    </div>
  )
}
