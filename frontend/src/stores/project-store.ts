import { create } from 'zustand'
import api from '@/lib/api'
import type {
  Project,
  ProjectCreate,
  ProjectUpdate,
  Member,
  MemberAdd,
  MemberUpdate,
  TaskStatus,
  StatusCreate,
  StatusUpdate,
  TaskLabel,
  LabelCreate,
  LabelUpdate,
} from '@/types'

interface ProjectState {
  projects: Project[]
  currentProject: Project | null
  members: Member[]
  statuses: TaskStatus[]
  labels: TaskLabel[]
  isLoading: boolean

  // Projects
  fetchProjects: () => Promise<void>
  fetchProject: (id: string) => Promise<void>
  createProject: (data: ProjectCreate) => Promise<Project>
  updateProject: (id: string, data: ProjectUpdate) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  // Members
  fetchMembers: (projectId: string) => Promise<void>
  addMember: (projectId: string, data: MemberAdd) => Promise<void>
  updateMember: (projectId: string, memberId: string, data: MemberUpdate) => Promise<void>
  removeMember: (projectId: string, memberId: string) => Promise<void>

  // Statuses
  fetchStatuses: (projectId: string) => Promise<void>
  createStatus: (projectId: string, data: StatusCreate) => Promise<TaskStatus>
  updateStatus: (projectId: string, statusId: string, data: StatusUpdate) => Promise<void>
  deleteStatus: (projectId: string, statusId: string) => Promise<void>
  reorderStatuses: (projectId: string, statusIds: string[]) => Promise<void>

  // Labels
  fetchLabels: (projectId: string) => Promise<void>
  createLabel: (projectId: string, data: LabelCreate) => Promise<TaskLabel>
  updateLabel: (projectId: string, labelId: string, data: LabelUpdate) => Promise<void>
  deleteLabel: (projectId: string, labelId: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  members: [],
  statuses: [],
  labels: [],
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true })
    try {
      const response = await api.get<Project[]>('/projects')
      set({ projects: response.data })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true })
    try {
      const response = await api.get<Project>(`/projects/${id}`)
      set({ currentProject: response.data })
    } finally {
      set({ isLoading: false })
    }
  },

  createProject: async (data: ProjectCreate) => {
    const response = await api.post<Project>('/projects', data)
    set((state) => ({ projects: [...state.projects, response.data] }))
    return response.data
  },

  updateProject: async (id: string, data: ProjectUpdate) => {
    const response = await api.patch<Project>(`/projects/${id}`, data)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? response.data : p)),
      currentProject: state.currentProject?.id === id ? response.data : state.currentProject,
    }))
  },

  deleteProject: async (id: string) => {
    await api.delete(`/projects/${id}`)
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }))
  },

  fetchMembers: async (projectId: string) => {
    const response = await api.get<Member[]>(`/projects/${projectId}/members`)
    set({ members: response.data })
  },

  addMember: async (projectId: string, data: MemberAdd) => {
    const response = await api.post<Member>(`/projects/${projectId}/members`, data)
    set((state) => ({ members: [...state.members, response.data] }))
  },

  updateMember: async (projectId: string, userId: string, data: MemberUpdate) => {
    const response = await api.patch<Member>(`/projects/${projectId}/members/${userId}`, data)
    set((state) => ({
      members: state.members.map((m) => (m.user_id === userId ? response.data : m)),
    }))
  },

  removeMember: async (projectId: string, userId: string) => {
    await api.delete(`/projects/${projectId}/members/${userId}`)
    set((state) => ({ members: state.members.filter((m) => m.user_id !== userId) }))
  },

  fetchStatuses: async (projectId: string) => {
    const response = await api.get<TaskStatus[]>(`/projects/${projectId}/statuses`)
    set({ statuses: response.data.sort((a, b) => a.position - b.position) })
  },

  createStatus: async (projectId: string, data: StatusCreate) => {
    const response = await api.post<TaskStatus>(`/projects/${projectId}/statuses`, data)
    set((state) => ({
      statuses: [...state.statuses, response.data].sort((a, b) => a.position - b.position),
    }))
    return response.data
  },

  updateStatus: async (projectId: string, statusId: string, data: StatusUpdate) => {
    const response = await api.patch<TaskStatus>(`/projects/${projectId}/statuses/${statusId}`, data)
    set((state) => ({
      statuses: state.statuses
        .map((s) => (s.id === statusId ? response.data : s))
        .sort((a, b) => a.position - b.position),
    }))
  },

  deleteStatus: async (projectId: string, statusId: string) => {
    await api.delete(`/projects/${projectId}/statuses/${statusId}`)
    set((state) => ({ statuses: state.statuses.filter((s) => s.id !== statusId) }))
  },

  reorderStatuses: async (projectId: string, statusIds: string[]) => {
    const { statuses } = get()
    const reordered = statusIds.map((id, index) => {
      const status = statuses.find((s) => s.id === id)!
      return { ...status, position: index }
    })
    set({ statuses: reordered })
    await api.post(`/projects/${projectId}/statuses/reorder`, { status_ids: statusIds })
  },

  fetchLabels: async (projectId: string) => {
    const response = await api.get<TaskLabel[]>(`/projects/${projectId}/labels`)
    set({ labels: response.data })
  },

  createLabel: async (projectId: string, data: LabelCreate) => {
    const response = await api.post<TaskLabel>(`/projects/${projectId}/labels`, data)
    set((state) => ({ labels: [...state.labels, response.data] }))
    return response.data
  },

  updateLabel: async (projectId: string, labelId: string, data: LabelUpdate) => {
    const response = await api.patch<TaskLabel>(`/projects/${projectId}/labels/${labelId}`, data)
    set((state) => ({
      labels: state.labels.map((l) => (l.id === labelId ? response.data : l)),
    }))
  },

  deleteLabel: async (projectId: string, labelId: string) => {
    await api.delete(`/projects/${projectId}/labels/${labelId}`)
    set((state) => ({ labels: state.labels.filter((l) => l.id !== labelId) }))
  },
}))
