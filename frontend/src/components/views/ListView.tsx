import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { ArrowUpDown, Plus, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskDetailDialog } from '@/components/task/TaskDetailDialog'
import { TaskForm } from '@/components/task/TaskForm'
import { useTaskStore } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { cn } from '@/lib/utils'
import type { Task, Priority } from '@/types'

const priorityColors: Record<Priority, string> = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

type SortField = 'title' | 'priority' | 'due_date' | 'status'
type SortDir = 'asc' | 'desc'

const priorityOrder: Record<Priority, number> = { low: 0, medium: 1, high: 2 }

interface ListViewProps {
  projectId: string
}

export function ListView({ projectId }: ListViewProps) {
  const { tasks } = useTaskStore()
  const { statuses } = useProjectStore()

  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')

  const allTasks = useMemo(() => Object.values(tasks).flat(), [tasks])

  const filteredAndSorted = useMemo(() => {
    let result = [...allTasks]

    if (filterStatus !== 'all') {
      result = result.filter((t) => t.status_id === filterStatus)
    }
    if (filterPriority !== 'all') {
      result = result.filter((t) => t.priority === filterPriority)
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'priority':
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case 'due_date':
          if (!a.due_date && !b.due_date) comparison = 0
          else if (!a.due_date) comparison = 1
          else if (!b.due_date) comparison = -1
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          break
        case 'status': {
          const aStatus = statuses.findIndex((s) => s.id === a.status_id)
          const bStatus = statuses.findIndex((s) => s.id === b.status_id)
          comparison = aStatus - bStatus
          break
        }
      }
      return sortDir === 'asc' ? comparison : -comparison
    })

    return result
  }, [allTasks, filterStatus, filterPriority, sortField, sortDir, statuses])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3.5 w-3.5" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5" />
    )
  }

  const getStatusName = (statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.name ?? 'Unknown'
  }

  const getStatusColor = (statusId: string) => {
    return statuses.find((s) => s.id === statusId)?.color ?? '#888'
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const defaultStatusId = statuses[0]?.id ?? ''

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? 'all')}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v ?? 'all')}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredAndSorted.length} tasks
            </span>
          </div>
          <Button size="sm" onClick={() => setShowTaskForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Task
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 gap-1"
                    onClick={() => handleSort('title')}
                  >
                    Title
                    <SortIcon field="title" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 gap-1"
                    onClick={() => handleSort('status')}
                  >
                    Status
                    <SortIcon field="status" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 gap-1"
                    onClick={() => handleSort('priority')}
                  >
                    Priority
                    <SortIcon field="priority" />
                  </Button>
                </TableHead>
                <TableHead>Assignees</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 gap-1"
                    onClick={() => handleSort('due_date')}
                  >
                    Due Date
                    <SortIcon field="due_date" />
                  </Button>
                </TableHead>
                <TableHead>Labels</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No tasks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSorted.map((task) => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedTask(task)
                      setShowDetail(true)
                    }}
                  >
                    <TableCell className="font-medium max-w-[300px] truncate">
                      {task.title}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getStatusColor(task.status_id) }}
                        />
                        <span className="text-sm">{getStatusName(task.status_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium capitalize',
                          priorityColors[task.priority]
                        )}
                      >
                        {task.priority}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-1.5">
                        {(task.assignments ?? []).slice(0, 4).map((assignment) => (
                          <Avatar key={assignment.id} className="h-6 w-6 border border-background">
                            <AvatarImage src={assignment.user.avatar_url} />
                            <AvatarFallback className="text-[9px]">
                              {getInitials(assignment.user.full_name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {(task.assignments ?? []).length > 4 && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted border border-background text-[9px] font-medium">
                            +{(task.assignments ?? []).length - 4}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {task.due_date ? (
                        <span className="text-sm">
                          {format(new Date(task.due_date), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(task.labels ?? []).slice(0, 2).map((label) => (
                          <Badge
                            key={label.id}
                            variant="outline"
                            className="text-xs py-0 px-1.5 h-5"
                            style={{ borderColor: label.color, color: label.color }}
                          >
                            {label.name}
                          </Badge>
                        ))}
                        {(task.labels ?? []).length > 2 && (
                          <span className="text-xs text-muted-foreground">
                            +{(task.labels ?? []).length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={showDetail}
        onOpenChange={setShowDetail}
        projectId={projectId}
      />

      <TaskForm
        open={showTaskForm}
        onOpenChange={setShowTaskForm}
        projectId={projectId}
        statusId={defaultStatusId}
        statuses={statuses}
      />
    </>
  )
}
