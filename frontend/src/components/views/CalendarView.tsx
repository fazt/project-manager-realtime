import { useMemo, useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  getDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TaskDetailDialog } from '@/components/task/TaskDetailDialog'
import { useTaskStore } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { cn } from '@/lib/utils'
import type { Task } from '@/types'

interface CalendarViewProps {
  projectId: string
}

const priorityColors = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
}

export function CalendarView({ projectId }: CalendarViewProps) {
  const { tasks } = useTaskStore()
  const { statuses } = useProjectStore()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const allTasks = useMemo(() => Object.values(tasks).flat(), [tasks])

  const tasksWithDueDates = useMemo(
    () => allTasks.filter((t) => t.due_date),
    [allTasks]
  )

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const getTasksForDay = (day: Date) => {
    return tasksWithDueDates.filter((t) => t.due_date && isSameDay(new Date(t.due_date), day))
  }

  const getStatusName = (statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.name ?? ''
  }

  const getStatusColor = (statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.color ?? '#888'
  }

  // Calculate padding for first day of month
  const firstDayOfWeek = getDay(daysInMonth[0])

  const today = new Date()

  return (
    <>
      <div className="space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentMonth(new Date())}>
              Today
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before start */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-28 rounded-lg bg-muted/20" />
          ))}

          {daysInMonth.map((day) => {
            const dayTasks = getTasksForDay(day)
            const isToday = isSameDay(day, today)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  'h-28 rounded-lg border p-1.5 transition-colors hover:bg-accent/30',
                  isToday && 'border-primary bg-primary/5'
                )}
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {dayTasks.length}
                    </Badge>
                  )}
                </div>

                <div className="mt-1 space-y-0.5">
                  {dayTasks.slice(0, 2).map((task) => (
                    <Popover key={task.id}>
                      <PopoverTrigger
                        className="w-full flex items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] hover:bg-accent transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', priorityColors[task.priority])}
                        />
                        <span className="truncate">{task.title}</span>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3" align="start">
                        <div className="space-y-2">
                          <p className="font-medium text-sm">{task.title}</p>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: getStatusColor(task.status_id) }}
                            />
                            <span className="text-xs text-muted-foreground">
                              {getStatusName(task.status_id)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setSelectedTask(task)
                              setShowDetail(true)
                            }}
                          >
                            Open Task
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                  {dayTasks.length > 2 && (
                    <Popover>
                      <PopoverTrigger className="w-full text-left px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                        +{dayTasks.length - 2} more
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <ScrollArea className="max-h-60">
                          <div className="p-2 space-y-1">
                            {dayTasks.map((task) => (
                              <button
                                key={task.id}
                                className="w-full flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-accent transition-colors"
                                onClick={() => {
                                  setSelectedTask(task)
                                  setShowDetail(true)
                                }}
                              >
                                <div
                                  className={cn('h-2 w-2 rounded-full flex-shrink-0', priorityColors[task.priority])}
                                />
                                <span className="truncate">{task.title}</span>
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={showDetail}
        onOpenChange={setShowDetail}
        projectId={projectId}
      />
    </>
  )
}
