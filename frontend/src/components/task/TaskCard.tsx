import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { Calendar, MessageSquare, GripVertical } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

const priorityConfig = {
  low: { color: '#7D8B6A', bg: 'rgba(125,139,106,0.12)', label: 'low' },
  medium: { color: '#C2754F', bg: 'rgba(194,117,79,0.12)', label: 'medium' },
  high: { color: '#D4553A', bg: 'rgba(212,85,58,0.12)', label: 'high' },
}

interface TaskCardProps {
  task: Task
  onClick: () => void
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { task },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const priority = priorityConfig[task.priority] ?? priorityConfig.low

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        borderLeftColor: priority.color,
        borderTopColor: 'var(--color-sand-dark)',
        borderRightColor: 'var(--color-sand-dark)',
        borderBottomColor: 'var(--color-sand-dark)',
        borderTopWidth: '1px',
        borderRightWidth: '1px',
        borderBottomWidth: '1px',
      }}
      className={cn(
        'group rounded-xl bg-card p-3.5 shadow-warm-sm hover:shadow-warm transition-all duration-200 cursor-pointer border-l-[3px]',
        isDragging && 'opacity-50 shadow-warm-lg ring-2 ring-[var(--color-terracotta)]'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0 space-y-2.5">
          {/* Title */}
          <p className="text-sm font-medium leading-snug" style={{ color: 'var(--color-coffee)' }}>{task.title}</p>

          {/* Labels */}
          {(task.labels ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {task.labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-block h-2 w-2 rounded-full ring-1 ring-white"
                  style={{ backgroundColor: label.color }}
                />
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium capitalize"
                style={{ backgroundColor: priority.bg, color: priority.color }}
              >
                {task.priority}
              </span>

              {task.due_date && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(task.due_date), 'MMM d')}
                </span>
              )}

              {(task.comment_count ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  {task.comment_count}
                </span>
              )}
            </div>

            {/* Assignees */}
            {(task.assignments ?? []).length > 0 && (
              <div className="flex -space-x-1.5">
                {task.assignments.slice(0, 3).map((a) => (
                  <Avatar key={a.id} className="h-5 w-5 border-2 border-card">
                    <AvatarImage src={a.user.avatar_url} />
                    <AvatarFallback className="text-[8px]" style={{ backgroundColor: 'var(--color-terracotta)', color: 'white' }}>
                      {getInitials(a.user.full_name || '')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignments.length > 3 && (
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-card text-[8px] font-medium"
                    style={{ backgroundColor: 'var(--color-sand)', color: 'var(--color-coffee)' }}
                  >
                    +{task.assignments.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
