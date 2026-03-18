import { create } from 'zustand'
import api from '@/lib/api'
import type { Notification } from '@/types'

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean

  fetchNotifications: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  addNotification: (notification: Notification) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const response = await api.get<Notification[]>('/notifications')
      const notifications = response.data
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.is_read).length,
      })
    } finally {
      set({ isLoading: false })
    }
  },

  markRead: async (id: string) => {
    await api.put(`/notifications/${id}/read`)
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      )
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.is_read).length,
      }
    })
  },

  markAllRead: async () => {
    await api.put('/notifications/read-all')
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },

  addNotification: (notification: Notification) => {
    set((state) => {
      const notifications = [notification, ...state.notifications]
      return {
        notifications,
        unreadCount: get().unreadCount + (notification.is_read ? 0 : 1),
      }
    })
  },
}))
