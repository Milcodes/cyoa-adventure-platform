'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import { apiClient } from '@/lib/api/client'
import TopNav from '@/components/TopNav'
import {
  ArrowLeft,
  Search,
  Filter,
  UserX,
  Shield,
  Edit,
  Loader2
} from 'lucide-react'

interface User {
  id: string
  email: string
  display_name: string
  role: 'player' | 'author' | 'moderator' | 'admin'
  created_at: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { user: currentUser, isAuthenticated } = useAuthStore()

  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')

  useEffect(() => {
    if (!isAuthenticated || currentUser?.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    // Mock data - replace with actual API call
    const mockUsers: User[] = [
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
      },
      {
        id: '3',
        email: 'mod1@example.com',
        display_name: 'Moderator One',
        role: 'moderator',
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ]

    setUsers(mockUsers)
    setFilteredUsers(mockUsers)
    setLoading(false)
  }, [isAuthenticated, currentUser, router])

  useEffect(() => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(
        (u) =>
          u.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }, [searchTerm, roleFilter, users])

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (confirm(`Biztosan módosítod a felhasználó szerepét?`)) {
      alert(`Role change: ${userId} → ${newRole} (API not implemented yet)`)
    }
  }

  const handleBanUser = async (userId: string) => {
    if (confirm('Biztosan kitiltod ezt a felhasználót?')) {
      alert(`Ban user: ${userId} (API not implemented yet)`)
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav />

      <main className="pt-20 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Vissza az admin dashboard-hoz
          </button>

          <h1 className="text-4xl font-bold mb-8">Felhasználó Kezelés</h1>

          {/* Filters */}
          <div className="game-panel p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Keresés név vagy email alapján..."
                  className="w-full pl-10 pr-4 py-2 bg-game-dark border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                />
              </div>

              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 bg-game-dark border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                >
                  <option value="all">Összes szerepkör</option>
                  <option value="player">Játékos</option>
                  <option value="author">Szerző</option>
                  <option value="moderator">Moderátor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="game-panel p-4 text-center">
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-gray-400">Összes</p>
            </div>
            <div className="game-panel p-4 text-center">
              <p className="text-2xl font-bold">{users.filter((u) => u.role === 'player').length}</p>
              <p className="text-sm text-gray-400">Játékos</p>
            </div>
            <div className="game-panel p-4 text-center">
              <p className="text-2xl font-bold">{users.filter((u) => u.role === 'author').length}</p>
              <p className="text-sm text-gray-400">Szerző</p>
            </div>
            <div className="game-panel p-4 text-center">
              <p className="text-2xl font-bold">{users.filter((u) => u.role === 'moderator').length}</p>
              <p className="text-sm text-gray-400">Moderátor</p>
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="game-panel p-6">
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-game-dark rounded-lg hover:bg-game-hover transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {user.display_name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1">
                        <p className="font-bold">{user.display_name}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                          user.role === 'admin'
                            ? 'bg-red-500/20 text-red-400'
                            : user.role === 'moderator'
                            ? 'bg-purple-500/20 text-purple-400'
                            : user.role === 'author'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {user.role}
                      </span>

                      <p className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('hu-HU')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleChangeRole(user.id, 'author')}
                        className="p-2 hover:bg-primary-500/20 rounded-lg transition-colors"
                        title="Szerepkör módosítása"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleBanUser(user.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Felhasználó tiltása"
                        disabled={user.role === 'admin'}
                      >
                        <UserX className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredUsers.length === 0 && (
                <p className="text-center text-gray-400 py-8">
                  Nincs találat a keresési feltételeknek megfelelően
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
