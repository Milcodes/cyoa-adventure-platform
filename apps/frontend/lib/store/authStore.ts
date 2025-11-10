import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  display_name: string | null
  role: 'player' | 'author' | 'moderator' | 'admin'
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: User) => void
  logout: () => void
  updateUser: (user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (token, user) => {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        set({ token, user, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        set({ token: null, user: null, isAuthenticated: false })
      },
      updateUser: (user) => {
        localStorage.setItem('user', JSON.stringify(user))
        set({ user })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
