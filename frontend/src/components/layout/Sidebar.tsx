import { Link, useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, Plus, Settings, LogOut, FolderKanban, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth-store'
import { useProjectStore } from '@/stores/project-store'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { ProjectForm } from '@/components/project/ProjectForm'

const projectColors = ['#C2754F', '#7D8B6A', '#5A8A5E', '#D4936F', '#A8603E', '#96A580']

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { projects } = useProjectStore()
  const [showCreateProject, setShowCreateProject] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getProjectColor = (index: number) => projectColors[index % projectColors.length]

  return (
    <>
      <aside className="flex h-full w-64 flex-col border-r" style={{ backgroundColor: 'var(--color-sand)', borderColor: 'var(--color-sand-dark)' }}>
        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-5" style={{ borderBottom: '1px solid var(--color-sand-dark)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--color-terracotta)' }}>
            <FolderKanban className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold font-serif" style={{ color: 'var(--color-coffee)' }}>ProjectFlow</span>
        </div>

        {/* Navigation */}
        <div className="px-3 py-4">
          <Link to="/">
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                location.pathname === '/'
                  ? 'font-medium shadow-warm-sm'
                  : 'hover:translate-x-0.5'
              )}
              style={
                location.pathname === '/'
                  ? { backgroundColor: 'white', color: 'var(--color-terracotta)' }
                  : { color: 'var(--color-coffee)' }
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </div>
          </Link>
        </div>

        {/* Projects */}
        <div className="px-3 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted-foreground, #A89F91)' }}>
              Projects
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg hover:bg-white/60"
              onClick={() => setShowCreateProject(true)}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 pb-4">
              {projects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">No projects yet</p>
              ) : (
                projects.map((project, index) => {
                  const isActive = location.pathname === `/projects/${project.id}`
                  return (
                    <Link key={project.id} to={`/projects/${project.id}`}>
                      <div
                        className={cn(
                          'group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200',
                          isActive
                            ? 'font-medium shadow-warm-sm'
                            : 'hover:translate-x-0.5'
                        )}
                        style={
                          isActive
                            ? { backgroundColor: 'white', color: 'var(--color-coffee)' }
                            : { color: 'var(--color-coffee)' }
                        }
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getProjectColor(index) }}
                        />
                        <span className="flex-1 truncate">{project.name}</span>
                        <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-terracotta)' }} />
                      </div>
                    </Link>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* User section */}
        <div className="p-3" style={{ borderTop: '1px solid var(--color-sand-dark)' }}>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 hover:bg-white/60 transition-all duration-200 text-left">
              <Avatar className="h-7 w-7 ring-2 ring-offset-1" style={{ '--tw-ring-color': 'var(--color-terracotta)' } as React.CSSProperties}>
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback className="text-xs" style={{ backgroundColor: 'var(--color-terracotta)', color: 'white' }}>
                  {user ? getInitials(user.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate" style={{ color: 'var(--color-coffee)' }}>{user?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{user?.username}</p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <ProjectForm
        open={showCreateProject}
        onOpenChange={setShowCreateProject}
      />
    </>
  )
}
