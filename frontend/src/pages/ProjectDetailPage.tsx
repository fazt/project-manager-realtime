import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Kanban,
  List,
  CalendarDays,
  Settings,
  Trash2,
  Pencil,
  Users,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { KanbanView } from '@/components/views/KanbanView'
import { ListView } from '@/components/views/ListView'
import { CalendarView } from '@/components/views/CalendarView'
import { ProjectForm } from '@/components/project/ProjectForm'
import { MemberManager } from '@/components/project/MemberManager'
import { useProjectStore } from '@/stores/project-store'
import { useTaskStore } from '@/stores/task-store'
import { useSocket } from '@/hooks/useSocket'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, fetchProject, fetchMembers, fetchStatuses, fetchLabels, deleteProject, members } =
    useProjectStore()
  const { fetchTasks } = useTaskStore()

  const [isLoading, setIsLoading] = useState(true)
  const [showEditProject, setShowEditProject] = useState(false)
  const [showMembers, setShowMembers] = useState(false)

  useSocket()

  useEffect(() => {
    if (!id) return
    const loadAll = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          fetchProject(id),
          fetchMembers(id),
          fetchStatuses(id),
          fetchLabels(id),
          fetchTasks(id),
        ])
      } catch {
        toast.error('Failed to load project')
        navigate('/')
      } finally {
        setIsLoading(false)
      }
    }
    loadAll()
  }, [id])

  const handleDelete = async () => {
    if (!currentProject) return
    try {
      await deleteProject(currentProject.id)
      toast.success('Project deleted')
      navigate('/')
    } catch {
      toast.error('Failed to delete project')
    }
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!currentProject) return null

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">{currentProject.name}</h2>
            {currentProject.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{currentProject.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Member avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {members.slice(0, 4).map((member) => (
                <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={member.user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(member.user.full_name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {members.length > 4 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted border-2 border-background text-xs font-medium">
                  +{members.length - 4}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setShowMembers(true)}
            >
              <Users className="h-3.5 w-3.5" />
              Members
            </Button>
          </div>

          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-input bg-background h-8 w-8 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              <Settings className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowEditProject(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Views */}
      <Tabs defaultValue="kanban" className="flex-1 flex flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="kanban" className="gap-1.5">
            <Kanban className="h-3.5 w-3.5" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-1.5">
            <List className="h-3.5 w-3.5" />
            List
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Calendar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex-1 mt-4">
          <KanbanView projectId={currentProject.id} />
        </TabsContent>

        <TabsContent value="list" className="flex-1 mt-4">
          <ListView projectId={currentProject.id} />
        </TabsContent>

        <TabsContent value="calendar" className="flex-1 mt-4">
          <CalendarView projectId={currentProject.id} />
        </TabsContent>
      </Tabs>

      {/* Edit Project Dialog */}
      <ProjectForm
        open={showEditProject}
        onOpenChange={setShowEditProject}
        project={currentProject}
      />

      {/* Members Dialog */}
      <Dialog open={showMembers} onOpenChange={setShowMembers}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Project Members</DialogTitle>
          </DialogHeader>
          <MemberManager projectId={currentProject.id} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
