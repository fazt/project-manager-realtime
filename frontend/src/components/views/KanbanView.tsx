import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from '@/components/task/TaskCard'
import { TaskDetailDialog } from '@/components/task/TaskDetailDialog'
import { useTaskStore } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import type { Task } from '@/types'

interface KanbanViewProps {
  projectId: string
}

export function KanbanView({ projectId }: KanbanViewProps) {
  const { tasks, moveTask } = useTaskStore()
  const { statuses, createStatus, deleteStatus } = useProjectStore()

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showTaskDetail, setShowTaskDetail] = useState(false)
  const [showAddColumn, setShowAddColumn] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task
    setActiveTask(task)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback handled by droppable hooks
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event
    if (!over) return

    const activeTask = active.data.current?.task as Task
    if (!activeTask) return

    // Determine target status ID
    let targetStatusId = over.id as string
    // If dropped over a task, get its status
    const overTask = over.data.current?.task as Task | undefined
    if (overTask) {
      targetStatusId = overTask.status_id
    }

    // Find position in target column
    const targetTasks = tasks[targetStatusId] ?? []
    let position = targetTasks.length

    if (overTask && overTask.status_id === targetStatusId) {
      position = targetTasks.findIndex((t) => t.id === overTask.id)
      if (position === -1) position = targetTasks.length
    }

    if (activeTask.status_id === targetStatusId && activeTask.position === position) return

    try {
      await moveTask(projectId, activeTask.id, {
        status_id: targetStatusId,
        position,
      })
    } catch {
      toast.error('Failed to move task')
    }
  }

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task)
    setShowTaskDetail(true)
  }

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return
    try {
      await createStatus(projectId, {
        name: newColumnName.trim(),
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        position: statuses.length,
      })
      setNewColumnName('')
      setShowAddColumn(false)
      toast.success('Column added!')
    } catch {
      toast.error('Failed to add column')
    }
  }

  const handleDeleteStatus = async (statusId: string) => {
    try {
      await deleteStatus(projectId, statusId)
      toast.success('Column deleted')
    } catch {
      toast.error('Failed to delete column')
    }
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {statuses.map((status) => (
            <KanbanColumn
              key={status.id}
              status={status}
              tasks={tasks[status.id] ?? []}
              projectId={projectId}
              statuses={statuses}
              onTaskClick={handleTaskClick}
              onDeleteStatus={statuses.length > 1 ? handleDeleteStatus : undefined}
            />
          ))}

          {/* Add Column */}
          <div className="flex-shrink-0 w-72">
            {showAddColumn ? (
              <div className="rounded-xl bg-muted/40 p-3 space-y-2">
                <Input
                  placeholder="Column name..."
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn()
                    if (e.key === 'Escape') setShowAddColumn(false)
                  }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddColumn}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddColumn(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-dashed"
                onClick={() => setShowAddColumn(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="rotate-3 opacity-90">
              <TaskCard task={activeTask} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <TaskDetailDialog
        task={selectedTask}
        open={showTaskDetail}
        onOpenChange={setShowTaskDetail}
        projectId={projectId}
      />
    </>
  )
}
