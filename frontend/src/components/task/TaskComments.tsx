import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Send, Pencil, Trash2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import api from '@/lib/api'
import type { TaskComment } from '@/types'

interface TaskCommentsProps {
  projectId: string
  taskId: string
}

export function TaskComments({ projectId, taskId }: TaskCommentsProps) {
  const { user } = useAuthStore()
  const [comments, setComments] = useState<TaskComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [taskId])

  const fetchComments = async () => {
    setIsLoading(true)
    try {
      const response = await api.get<TaskComment[]>(
        `/projects/${projectId}/tasks/${taskId}/comments`
      )
      setComments(response.data)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await api.post<TaskComment>(
        `/projects/${projectId}/tasks/${taskId}/comments`,
        { content: newComment.trim() }
      )
      setComments((prev) => [...prev, response.data])
      setNewComment('')
    } catch {
      toast.error('Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (id: string) => {
    if (!editContent.trim()) return
    try {
      const response = await api.patch<TaskComment>(
        `/projects/${projectId}/tasks/${taskId}/comments/${id}`,
        { content: editContent.trim() }
      )
      setComments((prev) => prev.map((c) => (c.id === id ? response.data : c)))
      setEditingId(null)
    } catch {
      toast.error('Failed to update comment')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${id}`)
      setComments((prev) => prev.filter((c) => c.id !== id))
    } catch {
      toast.error('Failed to delete comment')
    }
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  return (
    <div className="space-y-4">
      <Separator />
      <h4 className="text-sm font-semibold">Comments ({comments.length})</h4>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={comment.user.avatar_url} />
                <AvatarFallback className="text-xs">
                  {getInitials(comment.user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{comment.user.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), 'MMM d, h:mm a')}
                    {comment.updated_at !== comment.created_at && ' (edited)'}
                  </span>
                </div>

                {editingId === comment.id ? (
                  <div className="mt-1 space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(comment.id)}>
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-start gap-2">
                    <p className="text-sm mt-0.5 flex-1 whitespace-pre-wrap">{comment.content}</p>
                    {comment.user_id === user?.id && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingId(comment.id)
                            setEditContent(comment.content)
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(comment.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <Avatar className="h-7 w-7 flex-shrink-0 mt-2">
          <AvatarImage src={user?.avatar_url} />
          <AvatarFallback className="text-xs">
            {user ? getInitials(user.full_name) : 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit(e)
              }
            }}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSubmitting || !newComment.trim()}>
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Comment
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
