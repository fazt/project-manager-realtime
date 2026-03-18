import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TaskCard } from '@/components/task/TaskCard'
import { TaskForm } from '@/components/task/TaskForm'
import type { Task, TaskStatus } from '@/types'

interface KanbanColumnProps {
  status: TaskStatus
  tasks: Task[]
  projectId: string
  statuses: TaskStatus[]
  onTaskClick: (task: Task) => void
  onDeleteStatus?: (statusId: string) => void
}

export function KanbanColumn({
  status,
  tasks,
  projectId,
  statuses,
  onTaskClick,
  onDeleteStatus,
}: KanbanColumnProps) {
  const [showTaskForm, setShowTaskForm] = useState(false)

  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
    data: { type: 'column', statusId: status.id },
  })

  return (
    <>
      <div className="flex flex-col w-72 flex-shrink-0">
        {/* Column Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="h-3.5 w-3.5 rounded-full flex-shrink-0 ring-2 ring-offset-2" style={{ backgroundColor: status.color, '--tw-ring-color': status.color + '40', '--tw-ring-offset-color': 'var(--color-cream)' } as React.CSSProperties} />
          <span className="font-medium text-sm flex-1 truncate" style={{ color: 'var(--color-coffee)' }}>{status.name}</span>
          <Badge
            variant="secondary"
            className="text-xs h-5 px-2 rounded-full"
            style={{ backgroundColor: 'var(--color-sand)', color: 'var(--color-coffee)' }}
          >
            {tasks.length}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center justify-center rounded-lg h-6 w-6 text-muted-foreground hover:bg-white hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowTaskForm(true)}>
                Add task
              </DropdownMenuItem>
              {onDeleteStatus && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDeleteStatus(status.id)}
                >
                  Delete column
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tasks container */}
        <div
          ref={setNodeRef}
          className="flex-1 rounded-2xl p-2.5 transition-all duration-200 min-h-[200px]"
          style={
            isOver
              ? {
                  backgroundColor: 'var(--color-sand)',
                  border: '2px dashed var(--color-terracotta)',
                  boxShadow: '0 0 0 4px rgba(194, 117, 79, 0.1)',
                }
              : {
                  backgroundColor: 'hsl(var(--background) / 0.5)',
                  border: '2px dashed transparent',
                }
          }
        >
          <ScrollArea className="h-[calc(100vh-280px)]">
            <SortableContext
              items={tasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5 pr-2">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task)} />
                ))}
              </div>
            </SortableContext>
          </ScrollArea>
        </div>

        {/* Add task button */}
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start rounded-xl text-muted-foreground hover:text-foreground"
          style={{ '--tw-text-opacity': 1 } as React.CSSProperties}
          onClick={() => setShowTaskForm(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add task
        </Button>
      </div>

      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        projectId={projectId}
        statusId={status.id}
        statuses={statuses}
      />
    </>
  )
}
