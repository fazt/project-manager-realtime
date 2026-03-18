import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import {
  Calendar,
  Tag,
  Users,
  Trash2,
  Plus,
  X,
  Check,
  Pencil,
  Flag,
  AlertCircle,
  ArrowDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTaskStore } from '@/stores/task-store'
import { useProjectStore } from '@/stores/project-store'
import { TaskComments } from './TaskComments'
import type { Task, Priority } from '@/types'
import { cn } from '@/lib/utils'

const priorityConfig = {
  low: { label: 'Low', icon: ArrowDown, className: 'text-blue-500' },
  medium: { label: 'Medium', icon: Flag, className: 'text-yellow-500' },
  high: { label: 'High', icon: AlertCircle, className: 'text-red-500' },
}

interface TaskDetailDialogProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
}

export function TaskDetailDialog({ task, open, onOpenChange, projectId }: TaskDetailDialogProps) {
  const { updateTask, deleteTask, addAssignee, removeAssignee, addLabel, removeLabel } = useTaskStore()
  const { statuses, labels, members } = useProjectStore()

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const [showAssigneeSearch, setShowAssigneeSearch] = useState(false)
  const [showLabelSearch, setShowLabelSearch] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setIsEditingTitle(false)
      setIsEditingDesc(false)
    }
  }, [task])

  if (!task) return null

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  const handleUpdateTitle = async () => {
    if (!title.trim() || title === task.title) {
      setTitle(task.title)
      setIsEditingTitle(false)
      return
    }
    try {
      await updateTask(projectId, task.id, { title: title.trim() })
      setIsEditingTitle(false)
    } catch {
      toast.error('Failed to update title')
      setTitle(task.title)
    }
  }

  const handleUpdateDescription = async () => {
    if (description === task.description) {
      setIsEditingDesc(false)
      return
    }
    try {
      await updateTask(projectId, task.id, { description })
      setIsEditingDesc(false)
    } catch {
      toast.error('Failed to update description')
    }
  }

  const handleStatusChange = async (statusId: string | null) => {
    if (!statusId) return
    try {
      await updateTask(projectId, task.id, { status_id: statusId })
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handlePriorityChange = async (priority: Priority | null) => {
    if (!priority) return
    try {
      await updateTask(projectId, task.id, { priority })
    } catch {
      toast.error('Failed to update priority')
    }
  }

  const handleDateChange = async (date: Date | undefined) => {
    try {
      await updateTask(projectId, task.id, {
        due_date: date ? date.toISOString().split('T')[0] : null,
      })
      setShowDatePicker(false)
    } catch {
      toast.error('Failed to update due date')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTask(projectId, task.id)
      toast.success('Task deleted')
      onOpenChange(false)
    } catch {
      toast.error('Failed to delete task')
    }
  }

  const handleAddAssignee = async (userId: string) => {
    if ((task.assignments ?? []).find((a) => a.user.id === userId)) return
    try {
      await addAssignee(projectId, task.id, userId)
      setShowAssigneeSearch(false)
    } catch {
      toast.error('Failed to add assignee')
    }
  }

  const handleRemoveAssignee = async (userId: string) => {
    try {
      await removeAssignee(projectId, task.id, userId)
    } catch {
      toast.error('Failed to remove assignee')
    }
  }

  const handleAddLabel = async (labelId: string) => {
    if ((task.labels ?? []).find((l) => l.id === labelId)) return
    try {
      await addLabel(projectId, task.id, labelId)
      setShowLabelSearch(false)
    } catch {
      toast.error('Failed to add label')
    }
  }

  const handleRemoveLabel = async (labelId: string) => {
    try {
      await removeLabel(projectId, task.id, labelId)
    } catch {
      toast.error('Failed to remove label')
    }
  }

  const PriorityIcon = priorityConfig[task.priority].icon

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            {isEditingTitle ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-semibold"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateTitle()
                    if (e.key === 'Escape') {
                      setTitle(task.title)
                      setIsEditingTitle(false)
                    }
                  }}
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleUpdateTitle}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => {
                    setTitle(task.title)
                    setIsEditingTitle(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <DialogTitle
                className="text-xl cursor-pointer hover:text-muted-foreground transition-colors flex items-center gap-2 group flex-1"
                onClick={() => setIsEditingTitle(true)}
              >
                {task.title}
                <Pencil className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </DialogTitle>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-6 pb-6">
            {/* Properties row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </label>
                <Select value={task.status_id} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          {status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Priority
                </label>
                <Select value={task.priority} onValueChange={(v) => handlePriorityChange(v as Priority | null)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        <PriorityIcon
                          className={cn('h-3.5 w-3.5', priorityConfig[task.priority].className)}
                        />
                        <span className="capitalize">{task.priority}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => {
                      const Icon = config.icon
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn('h-3.5 w-3.5', config.className)} />
                            {config.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Due Date
                </label>
                <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                  <PopoverTrigger
                    className="inline-flex h-8 w-full items-center justify-start gap-2 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm whitespace-nowrap transition-colors hover:bg-accent"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    {task.due_date
                      ? format(new Date(task.due_date), 'MMM d, yyyy')
                      : 'Set due date'}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={task.due_date ? new Date(task.due_date) : undefined}
                      onSelect={handleDateChange}
                    />
                    {task.due_date && (
                      <div className="p-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-destructive hover:text-destructive"
                          onClick={() => handleDateChange(undefined)}
                        >
                          Clear date
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </label>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Add a description..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdateDescription}>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDescription(task.description ?? '')
                        setIsEditingDesc(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="min-h-[60px] cursor-pointer rounded-md border border-transparent p-2 hover:border-border hover:bg-muted/50 transition-colors"
                  onClick={() => setIsEditingDesc(true)}
                >
                  {description ? (
                    <p className="text-sm whitespace-pre-wrap">{description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to add a description...</p>
                  )}
                </div>
              )}
            </div>

            {/* Assignees */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Assignees
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(task.assignments ?? []).map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-xs"
                  >
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={assignment.user.avatar_url} />
                      <AvatarFallback className="text-[8px]">
                        {getInitials(assignment.user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{assignment.user.full_name}</span>
                    <button
                      onClick={() => handleRemoveAssignee(assignment.user.id)}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Popover open={showAssigneeSearch} onOpenChange={setShowAssigneeSearch}>
                  <PopoverTrigger className="inline-flex h-7 items-center gap-1 rounded-lg border border-input bg-transparent px-2.5 text-xs hover:bg-accent transition-colors">
                    <Plus className="h-3 w-3" />
                    Add
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-56" align="start">
                    <Command>
                      <CommandInput placeholder="Search members..." />
                      <CommandList>
                        <CommandEmpty>No members found</CommandEmpty>
                        <CommandGroup>
                          {members
                            .filter((m) => !(task.assignments ?? []).find((a) => a.user.id === m.user_id))
                            .map((member) => (
                              <CommandItem
                                key={member.id}
                                onSelect={() => handleAddAssignee(member.user_id)}
                              >
                                <Avatar className="h-5 w-5 mr-2">
                                  <AvatarImage src={member.user.avatar_url} />
                                  <AvatarFallback className="text-[8px]">
                                    {getInitials(member.user.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                {member.user.full_name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Labels
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(task.labels ?? []).map((label) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    className="gap-1 pl-1.5"
                    style={{ borderColor: label.color, color: label.color }}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                    <button
                      onClick={() => handleRemoveLabel(label.id)}
                      className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Popover open={showLabelSearch} onOpenChange={setShowLabelSearch}>
                  <PopoverTrigger className="inline-flex h-7 items-center gap-1 rounded-lg border border-input bg-transparent px-2.5 text-xs hover:bg-accent transition-colors">
                    <Plus className="h-3 w-3" />
                    Add
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-48" align="start">
                    <Command>
                      <CommandInput placeholder="Search labels..." />
                      <CommandList>
                        <CommandEmpty>No labels found</CommandEmpty>
                        <CommandGroup>
                          {labels
                            .filter((l) => !(task.labels ?? []).find((tl) => tl.id === l.id))
                            .map((label) => (
                              <CommandItem
                                key={label.id}
                                onSelect={() => handleAddLabel(label.id)}
                              >
                                <div
                                  className="h-3 w-3 rounded-full mr-2 flex-shrink-0"
                                  style={{ backgroundColor: label.color }}
                                />
                                {label.name}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Delete */}
            <div className="flex justify-end pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Task
              </Button>
            </div>

            {/* Comments */}
            <TaskComments projectId={projectId} taskId={task.id} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
