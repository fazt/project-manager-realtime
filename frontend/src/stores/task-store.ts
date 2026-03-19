import { create } from 'zustand'
import api from '@/lib/api'
import type { Task, TaskCreate, TaskUpdate, TaskMove } from '@/types'

interface TaskState {
  tasks: Record<string, Task[]> // keyed by status_id
  isLoading: boolean

  fetchTasks: (projectId: string) => Promise<void>
  createTask: (projectId: string, data: TaskCreate) => Promise<Task>
  updateTask: (projectId: string, taskId: string, data: TaskUpdate) => Promise<void>
  deleteTask: (projectId: string, taskId: string) => Promise<void>
  moveTask: (projectId: string, taskId: string, data: TaskMove) => Promise<void>
  reorderTasks: (statusId: string, tasks: Task[]) => void

  addAssignee: (projectId: string, taskId: string, userId: string) => Promise<void>
  removeAssignee: (projectId: string, taskId: string, userId: string) => Promise<void>

  addLabel: (projectId: string, taskId: string, labelId: string) => Promise<void>
  removeLabel: (projectId: string, taskId: string, labelId: string) => Promise<void>

  // Internal helpers for socket updates
  _addTask: (task: Task) => void
  _updateTask: (task: Task) => void
  _deleteTask: (taskId: string, statusId: string) => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: {},
  isLoading: false,

  fetchTasks: async (projectId: string) => {
    set({ isLoading: true })
    try {
      const response = await api.get<Task[]>(`/projects/${projectId}/tasks`)
      const tasks = response.data
      const grouped: Record<string, Task[]> = {}
      for (const task of tasks) {
        if (!grouped[task.status_id]) {
          grouped[task.status_id] = []
        }
        grouped[task.status_id].push(task)
      }
      // Sort by position
      for (const statusId of Object.keys(grouped)) {
        grouped[statusId].sort((a, b) => a.position - b.position)
      }
      set({ tasks: grouped })
    } finally {
      set({ isLoading: false })
    }
  },

  createTask: async (projectId: string, data: TaskCreate) => {
    const response = await api.post<Task>(`/projects/${projectId}/tasks`, data)
    const task = response.data
    set((state) => {
      for (const tasks of Object.values(state.tasks)) {
        if (tasks.find((t) => t.id === task.id)) return state
      }
      return {
        tasks: {
          ...state.tasks,
          [task.status_id]: [...(state.tasks[task.status_id] ?? []), task],
        },
      }
    })
    return task
  },

  updateTask: async (projectId: string, taskId: string, data: TaskUpdate) => {
    const response = await api.patch<Task>(`/projects/${projectId}/tasks/${taskId}`, data)
    const updated = response.data
    set((state) => {
      const newTasks = { ...state.tasks }
      // Remove from old status if status changed
      for (const statusId of Object.keys(newTasks)) {
        newTasks[statusId] = newTasks[statusId].filter((t) => t.id !== taskId)
      }
      // Add to new status
      if (!newTasks[updated.status_id]) {
        newTasks[updated.status_id] = []
      }
      newTasks[updated.status_id] = [...newTasks[updated.status_id], updated].sort(
        (a, b) => a.position - b.position
      )
      return { tasks: newTasks }
    })
  },

  deleteTask: async (projectId: string, taskId: string) => {
    const state = get()
    let statusId = ''
    for (const [sid, tasks] of Object.entries(state.tasks)) {
      if (tasks.find((t) => t.id === taskId)) {
        statusId = sid
        break
      }
    }
    await api.delete(`/projects/${projectId}/tasks/${taskId}`)
    if (statusId) {
      set((state) => ({
        tasks: {
          ...state.tasks,
          [statusId]: state.tasks[statusId].filter((t) => t.id !== taskId),
        },
      }))
    }
  },

  moveTask: async (projectId: string, taskId: string, data: TaskMove) => {
    const state = get()
    // Find current task
    let currentTask: Task | undefined
    let currentStatusId = ''
    for (const [statusId, tasks] of Object.entries(state.tasks)) {
      const found = tasks.find((t) => t.id === taskId)
      if (found) {
        currentTask = found
        currentStatusId = statusId
        break
      }
    }
    if (!currentTask) return

    // Optimistic update
    const updatedTask = { ...currentTask, status_id: data.status_id, position: data.position }
    set((state) => {
      const newTasks = { ...state.tasks }
      // Remove from current status
      if (currentStatusId) {
        newTasks[currentStatusId] = newTasks[currentStatusId].filter((t) => t.id !== taskId)
      }
      // Add to new status
      if (!newTasks[data.status_id]) {
        newTasks[data.status_id] = []
      }
      const targetTasks = [...newTasks[data.status_id]]
      targetTasks.splice(data.position, 0, updatedTask)
      newTasks[data.status_id] = targetTasks.map((t, i) => ({ ...t, position: i }))
      return { tasks: newTasks }
    })

    try {
      await api.post(`/projects/${projectId}/tasks/${taskId}/move`, data)
    } catch {
      // Revert on error
      await get().fetchTasks(projectId)
    }
  },

  reorderTasks: (statusId: string, tasks: Task[]) => {
    set((state) => ({
      tasks: {
        ...state.tasks,
        [statusId]: tasks.map((t, i) => ({ ...t, position: i })),
      },
    }))
  },

  addAssignee: async (projectId: string, taskId: string, userId: string) => {
    const response = await api.post<Task>(`/projects/${projectId}/tasks/${taskId}/assignees`, {
      user_id: userId,
    })
    const updated = response.data
    set((state) => ({
      tasks: {
        ...state.tasks,
        [updated.status_id]: state.tasks[updated.status_id]?.map((t) =>
          t.id === taskId ? updated : t
        ),
      },
    }))
  },

  removeAssignee: async (projectId: string, taskId: string, userId: string) => {
    const response = await api.delete<Task>(
      `/projects/${projectId}/tasks/${taskId}/assignees/${userId}`
    )
    const updated = response.data
    set((state) => ({
      tasks: {
        ...state.tasks,
        [updated.status_id]: state.tasks[updated.status_id]?.map((t) =>
          t.id === taskId ? updated : t
        ),
      },
    }))
  },

  addLabel: async (projectId: string, taskId: string, labelId: string) => {
    const response = await api.post<Task>(`/projects/${projectId}/tasks/${taskId}/labels`, {
      label_id: labelId,
    })
    const updated = response.data
    set((state) => ({
      tasks: {
        ...state.tasks,
        [updated.status_id]: state.tasks[updated.status_id]?.map((t) =>
          t.id === taskId ? updated : t
        ),
      },
    }))
  },

  removeLabel: async (projectId: string, taskId: string, labelId: string) => {
    const response = await api.delete<Task>(
      `/projects/${projectId}/tasks/${taskId}/labels/${labelId}`
    )
    const updated = response.data
    set((state) => ({
      tasks: {
        ...state.tasks,
        [updated.status_id]: state.tasks[updated.status_id]?.map((t) =>
          t.id === taskId ? updated : t
        ),
      },
    }))
  },

  _addTask: (task: Task) => {
    set((state) => {
      for (const tasks of Object.values(state.tasks)) {
        if (tasks.find((t) => t.id === task.id)) return state
      }
      return {
        tasks: {
          ...state.tasks,
          [task.status_id]: [...(state.tasks[task.status_id] ?? []), task],
        },
      }
    })
  },

  _updateTask: (task: Task) => {
    set((state) => {
      const newTasks = { ...state.tasks }
      for (const statusId of Object.keys(newTasks)) {
        newTasks[statusId] = newTasks[statusId].filter((t) => t.id !== task.id)
      }
      if (!newTasks[task.status_id]) newTasks[task.status_id] = []
      newTasks[task.status_id] = [...newTasks[task.status_id], task].sort(
        (a, b) => a.position - b.position
      )
      return { tasks: newTasks }
    })
  },

  _deleteTask: (taskId: string, statusId: string) => {
    set((state) => ({
      tasks: {
        ...state.tasks,
        [statusId]: (state.tasks[statusId] ?? []).filter((t) => t.id !== taskId),
      },
    }))
  },
}))
