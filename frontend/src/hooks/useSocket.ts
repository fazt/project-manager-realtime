import { useEffect, useRef, useState } from 'react'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useAuthStore } from '@/stores/auth-store'
import { useProjectStore } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'
import { useNotificationStore } from '@/stores/notification-store'
import type { Task, Notification } from '@/types'

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const accessToken = useAuthStore((s) => s.accessToken)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentProjectId = useProjectStore((s) => s.currentProject?.id)
  const joinedRoomRef = useRef<string | null>(null)

  // Connect/disconnect socket based on auth state
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      disconnectSocket()
      setIsConnected(false)
      return
    }

    const socket = connectSocket(accessToken)

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    // Task events - use getState() to avoid stale closures
    const handleTaskCreated = (task: Task) => {
      useTaskStore.getState()._addTask(task)
    }
    const handleTaskUpdated = (task: Task) => {
      useTaskStore.getState()._updateTask(task)
    }
    const handleTaskMoved = (task: Task) => {
      useTaskStore.getState()._updateTask(task)
    }
    const handleTaskDeleted = (data: { task_id: string; status_id: string }) => {
      useTaskStore.getState()._deleteTask(data.task_id, data.status_id)
    }

    // Status events
    const handleStatusChange = () => {
      const pid = useProjectStore.getState().currentProject?.id
      if (pid) useProjectStore.getState().fetchStatuses(pid)
    }

    // Comment events
    const handleCommentCreated = (data: { task_id: string; status_id: string }) => {
      const { tasks, _updateTask } = useTaskStore.getState()
      const task = tasks[data.status_id]?.find((t) => t.id === data.task_id)
      if (task) {
        _updateTask({ ...task, comment_count: (task.comment_count ?? 0) + 1 })
      }
    }

    // Notification events
    const handleNotification = (notification: Notification) => {
      useNotificationStore.getState().addNotification(notification)
    }

    socket.on('task:created', handleTaskCreated)
    socket.on('task:updated', handleTaskUpdated)
    socket.on('task:moved', handleTaskMoved)
    socket.on('task:deleted', handleTaskDeleted)
    socket.on('status:created', handleStatusChange)
    socket.on('status:updated', handleStatusChange)
    socket.on('status:deleted', handleStatusChange)
    socket.on('comment:created', handleCommentCreated)
    socket.on('notification:new', handleNotification)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('task:created', handleTaskCreated)
      socket.off('task:updated', handleTaskUpdated)
      socket.off('task:moved', handleTaskMoved)
      socket.off('task:deleted', handleTaskDeleted)
      socket.off('status:created', handleStatusChange)
      socket.off('status:updated', handleStatusChange)
      socket.off('status:deleted', handleStatusChange)
      socket.off('comment:created', handleCommentCreated)
      socket.off('notification:new', handleNotification)
    }
  }, [isAuthenticated, accessToken])

  // Join/leave project room - only depends on project ID
  useEffect(() => {
    const socket = getSocket()
    if (!socket?.connected || !currentProjectId) return

    // Leave previous room if any
    if (joinedRoomRef.current && joinedRoomRef.current !== currentProjectId) {
      socket.emit('leave_project', { project_id: joinedRoomRef.current })
    }

    socket.emit('join_project', { project_id: currentProjectId })
    joinedRoomRef.current = currentProjectId

    return () => {
      if (joinedRoomRef.current) {
        socket.emit('leave_project', { project_id: joinedRoomRef.current })
        joinedRoomRef.current = null
      }
    }
  }, [currentProjectId, isConnected])

  return { isConnected }
}
