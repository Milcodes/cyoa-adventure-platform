'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { apiClient } from '@/lib/api/client'
import { useAuthStore } from '@/lib/store/authStore'
import { UserPlus, Mail, Lock, User, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    preferredLanguage: 'hu',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await apiClient.post('/auth/register', formData)
      // Backend sends access_token (snake_case)
      login(data.access_token, data.user)

      // Set cookie for middleware
      document.cookie = `token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Regisztráció sikertelen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="game-panel p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <UserPlus className="w-16 h-16 mx-auto mb-4 text-purple-500" />
          <h1 className="text-3xl font-bold">Regisztráció</h1>
          <p className="text-gray-400 mt-2">Kezdd el az utazást</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Megjelenítendő név</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-game-panel border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                placeholder="Játékos név"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-game-panel border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                placeholder="email@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Jelszó</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-game-panel border border-game-border rounded-lg focus:border-primary-500 focus:outline-none"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Minimum 6 karakter</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full game-button flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Regisztráció...
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Regisztráció
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Van már fiókod?{' '}
            <Link href="/auth/login" className="text-primary-500 hover:text-primary-400">
              Jelentkezz be
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
