'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/authStore'
import {
  User,
  Settings,
  LogOut,
  Home,
  BookOpen,
  ChevronDown
} from 'lucide-react'

interface TopNavProps {
  storyTitle?: string
  showStoryTitle?: boolean
}

export default function TopNav({ storyTitle, showStoryTitle = false }: TopNavProps) {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const handleGoHome = () => {
    router.push('/dashboard')
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-game-dark/95 backdrop-blur-sm border-b border-game-border">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Side - Logo & Story Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoHome}
              className="flex items-center gap-2 hover:text-primary-400 transition-colors"
            >
              <BookOpen className="w-6 h-6" />
              <span className="font-bold text-lg hidden sm:inline">CYOA Platform</span>
            </button>

            {showStoryTitle && storyTitle && (
              <>
                <div className="w-px h-6 bg-game-border" />
                <span className="text-gray-400 hidden md:inline truncate max-w-md">
                  {storyTitle}
                </span>
              </>
            )}
          </div>

          {/* Right Side - User Menu */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoHome}
              className="p-2 hover:bg-game-panel rounded-lg transition-colors"
              title="Főoldal"
            >
              <Home className="w-5 h-5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-game-panel rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <span className="hidden sm:inline font-medium">
                  {user?.display_name || 'Játékos'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 game-panel rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="p-4 border-b border-game-border">
                      <p className="font-semibold">{user?.display_name || 'Játékos'}</p>
                      <p className="text-sm text-gray-400">{user?.email}</p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{user?.role}</p>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={() => {
                          router.push('/settings')
                          setShowUserMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-game-hover transition-colors flex items-center gap-3"
                      >
                        <Settings className="w-4 h-4" />
                        Beállítások
                      </button>

                      <button
                        onClick={() => {
                          handleLogout()
                          setShowUserMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-game-hover transition-colors flex items-center gap-3 text-red-400"
                      >
                        <LogOut className="w-4 h-4" />
                        Kijelentkezés
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
