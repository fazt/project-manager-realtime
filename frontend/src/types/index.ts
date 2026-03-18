// Auth
export interface User {
  id: string
  email: string
  username: string
  full_name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface UserCreate {
  email: string
  username: string
  full_name: string
  password: string
}

export interface UserLogin {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// Projects
export interface Project {
  id: string
  name: string
  description?: string
  owner_id: string
  created_at: string
  updated_at: string
  member_count?: number
  task_count?: number
}

export interface ProjectCreate {
  name: string
  description?: string
}

export interface ProjectUpdate {
  name?: string
  description?: string
}

// Members
export type MemberRole = 'admin' | 'editor' | 'viewer'

export interface Member {
  id: string
  project_id: string
  user_id: string
  role: MemberRole
  user: User
  joined_at: string
}

export interface MemberAdd {
  user_id?: string
  email?: string
  username?: string
  role: MemberRole
}

export interface MemberUpdate {
  role: MemberRole
}

// Statuses
export interface TaskStatus {
  id: string
  project_id: string
  name: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export interface StatusCreate {
  name: string
  color: string
  position?: number
}

export interface StatusUpdate {
  name?: string
  color?: string
  position?: number
}

// Labels
export interface TaskLabel {
  id: string
  project_id: string
  name: string
  color: string
  created_at: string
}

export interface LabelCreate {
  name: string
  color: string
}

export interface LabelUpdate {
  name?: string
  color?: string
}

// Tasks
export type Priority = 'low' | 'medium' | 'high'

export interface Task {
  id: string
  project_id: string
  status_id: string
  title: string
  description?: string
  priority: Priority
  due_date?: string
  position: number
  created_by: string
  created_at: string
  updated_at: string
  assignments: { id: string; user: User; assigned_at: string }[]
  labels: TaskLabel[]
  comment_count?: number
}

export interface TaskCreate {
  title: string
  description?: string
  priority?: Priority
  due_date?: string
  status_id: string
}

export interface TaskUpdate {
  title?: string
  description?: string
  priority?: Priority
  due_date?: string | null
  status_id?: string
}

export interface TaskMove {
  status_id: string
  position: number
}

// Task Assignments
export interface TaskAssignment {
  id: string
  task_id: string
  user_id: string
  user: User
  assigned_at: string
}

// Comments
export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  user: User
  created_at: string
  updated_at: string
}

export interface CommentCreate {
  content: string
}

export interface CommentUpdate {
  content: string
}

// Notifications
export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  data?: Record<string, unknown>
  created_at: string
}
