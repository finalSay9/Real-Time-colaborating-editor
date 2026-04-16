import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await axios.post('/api/auth/login', { email, password })
          axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
          set({ user: data.user, token: data.token, isLoading: false })
        } catch (err: any) {
          set({
            error: err.response?.data?.error ?? 'Login failed',
            isLoading: false,
          })
          throw err
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true, error: null })
        try {
          const { data } = await axios.post('/api/auth/register', {
            name, email, password,
          })
          axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
          set({ user: data.user, token: data.token, isLoading: false })
        } catch (err: any) {
          set({
            error: err.response?.data?.error ?? 'Registration failed',
            isLoading: false,
          })
          throw err
        }
      },

      logout: () => {
        delete axios.defaults.headers.common['Authorization']
        set({ user: null, token: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      // Only persist token + user, not loading state
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
)