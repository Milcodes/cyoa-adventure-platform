'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { apiClient } from '@/lib/api/client'
import TopNav from '@/components/TopNav'
import {
  Users,
  BookOpen,
  Activity,
  Shield,
  Loader2,
  AlertCircle,
  TrendingUp,
  Clock,
  CheckCircle
} from 'lucide-react'

interface SystemStats {
  users: {
    total: number
    players: number
    authors: number
    moderators: number
    admins: number
  }
  stories: {
    total: number
    published: number
    draft: number
    under_review: number
  }
  gameplay: {
    total_plays: number
    active_saves: number
    completed_games: number
  }
}

interface RecentUser {
  id: string
  email: string
  display_name: string
  role: string
  created_at: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()

  const [stats, setStats] = useState<SystemStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (user?.role !== 'admin') {
      alert('Csak adminisztrátorok férhetnek hozzá')
      router.push('/dashboard')
      return
    }

    fetchSystemStats()
  }, [isAuthenticated, user, router])

  const fetchSystemStats = async () => {
    setLoading(true)
    setError('')

    try {
      // Fetch system statistics (mock data for now)
      // In real app, these would be actual API calls
      const mockStats: SystemStats = {
        users: {
          total: 142,
          players: 120,
          authors: 18,
          moderators: 3,
          admins: 1
        },
        stories: {
          total: 45,
          published: 28,
          draft: 12,
          under_review: 5
        },
        gameplay: {
          total_plays: 1523,
          active_saves: 342,
          completed_games: 856
        }
      }

      setStats(mockStats)

      // Fetch recent users (mock)
      const mockUsers: RecentUser[] = [
        {
          id: '1',
          email: 'player1@example.com',
          display_name: 'Player One',
          role: 'player',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          email: 'author1@example.com',
          display_name: 'Author One',
          role: 'author',
          created_at: new Date(Date.now() - 86400000).toISOString()
        }
      ]

      setRecentUsers(mockUsers)
    } catch (err: any) {
      setError('Rendszeradatok betöltése sikertelen')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="pt-20 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Rendszer áttekintés és felhasználó kezelés</p>
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

          {/* Content */}
          {!loading && stats && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Rendszer Statisztikák</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Users */}
                  <div className="game-panel p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500/20 rounded-lg">
                        <Users className="w-6 h-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Összes Felhasználó</p>
                        <p className="text-3xl font-bold">{stats.users.total}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Játékosok:</span>
                        <span className="text-gray-300">{stats.users.players}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Szerzők:</span>
                        <span className="text-gray-300">{stats.users.authors}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Moderátorok:</span>
                        <span className="text-gray-300">{stats.users.moderators}</span>
                      </div>
                    </div>
                  </div>

                  {/* Total Stories */}
                  <div className="game-panel p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-500/20 rounded-lg">
                        <BookOpen className="w-6 h-6 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Összes Történet</p>
                        <p className="text-3xl font-bold">{stats.stories.total}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Publikált:</span>
                        <span className="text-green-400">{stats.stories.published}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Piszkozat:</span>
                        <span className="text-gray-300">{stats.stories.draft}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Elbírálás alatt:</span>
                        <span className="text-yellow-400">{stats.stories.under_review}</span>
                      </div>
                    </div>
                  </div>

                  {/* Gameplay Stats */}
                  <div className="game-panel p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/20 rounded-lg">
                        <Activity className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Összes Játék</p>
                        <p className="text-3xl font-bold">{stats.gameplay.total_plays}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Aktív mentések:</span>
                        <span className="text-gray-300">{stats.gameplay.active_saves}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Befejezett:</span>
                        <span className="text-green-400">{stats.gameplay.completed_games}</span>
                      </div>
                    </div>
                  </div>

                  {/* System Health */}
                  <div className="game-panel p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500/20 rounded-lg">
                        <Shield className="w-6 h-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Rendszer Státusz</p>
                        <p className="text-xl font-bold text-green-500">Működik</p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>API: Online</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Database: Online</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span>Storage: Online</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Gyors Műveletek</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => router.push('/admin/users')}
                    className="game-panel p-6 hover:border-primary-500 transition-colors text-left"
                  >
                    <Users className="w-8 h-8 text-primary-500 mb-3" />
                    <h3 className="font-bold text-lg mb-2">Felhasználó Kezelés</h3>
                    <p className="text-sm text-gray-400">
                      Felhasználók megtekintése, szerepkörök módosítása, tiltás
                    </p>
                  </button>

                  <button
                    onClick={() => router.push('/admin/stories')}
                    className="game-panel p-6 hover:border-primary-500 transition-colors text-left"
                  >
                    <BookOpen className="w-8 h-8 text-purple-500 mb-3" />
                    <h3 className="font-bold text-lg mb-2">Történet Kezelés</h3>
                    <p className="text-sm text-gray-400">
                      Összes történet megtekintése, moderálás, törlés
                    </p>
                  </button>

                  <button
                    onClick={() => router.push('/admin/analytics')}
                    className="game-panel p-6 hover:border-primary-500 transition-colors text-left"
                  >
                    <TrendingUp className="w-8 h-8 text-green-500 mb-3" />
                    <h3 className="font-bold text-lg mb-2">Analitika</h3>
                    <p className="text-sm text-gray-400">
                      Részletes statisztikák, trendek, riportok
                    </p>
                  </button>
                </div>
              </div>

              {/* Recent Users */}
              <div>
                <h2 className="text-2xl font-bold mb-4">Legutóbbi Felhasználók</h2>
                <div className="game-panel p-6">
                  {recentUsers.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Nincsenek felhasználók</p>
                  ) : (
                    <div className="space-y-3">
                      {recentUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 bg-game-dark rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                              <span className="text-white font-bold">
                                {user.display_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{user.display_name}</p>
                              <p className="text-sm text-gray-400">{user.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-xs font-semibold capitalize">
                              {user.role}
                            </span>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(user.created_at).toLocaleDateString('hu-HU')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => router.push('/admin/users')}
                    className="w-full mt-4 game-button"
                  >
                    Összes Felhasználó Megtekintése
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
