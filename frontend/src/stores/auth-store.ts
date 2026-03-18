import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/api'
import type { User, UserCreate, UserLogin, TokenResponse } from '@/types'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: UserLogin) => Promise<void>
  register: (data: UserCreate) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials: UserLogin) => {
        set({ isLoading: true })
        try {
          const response = await api.post<TokenResponse>('/auth/login', credentials)
          const { access_token, refresh_token } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          set({
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
          })
          await get().fetchMe()
        } finally {
          set({ isLoading: false })
        }
      },

      register: async (data: UserCreate) => {
        set({ isLoading: true })
        try {
          await api.post('/auth/register', data)
        } finally {
          set({ isLoading: false })
        }
      },

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      refresh: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return
        try {
          const response = await api.post<TokenResponse>('/auth/refresh', {
            refresh_token: refreshToken,
          })
          const { access_token, refresh_token } = response.data
          localStorage.setItem('access_token', access_token)
          localStorage.setItem('refresh_token', refresh_token)
          set({
            accessToken: access_token,
            refreshToken: refresh_token,
          })
        } catch {
          get().logout()
        }
      },

      fetchMe: async () => {
        try {
          const response = await api.get<User>('/auth/me')
          set({ user: response.data })
        } catch {
          get().logout()
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          localStorage.setItem('access_token', state.accessToken)
        }
        if (state?.refreshToken) {
          localStorage.setItem('refresh_token', state.refreshToken)
        }
      },
    }
  )
)
