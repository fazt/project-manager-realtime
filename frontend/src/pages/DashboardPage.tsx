import { useEffect, useState } from 'react'
import { Plus, FolderOpen, Loader2, Sun, Moon, Sunrise } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectCard } from '@/components/project/ProjectCard'
import { ProjectForm } from '@/components/project/ProjectForm'
import { useProjectStore } from '@/stores/project-store'
import { useAuthStore } from '@/stores/auth-store'

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours()
  if (hour < 12) return { text: 'Good morning', icon: Sunrise }
  if (hour < 18) return { text: 'Good afternoon', icon: Sun }
  return { text: 'Good evening', icon: Moon }
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const { projects, fetchProjects, isLoading } = useProjectStore()
  const [showCreate, setShowCreate] = useState(false)
  const greeting = getGreeting()
  const GreetingIcon = greeting.icon

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div
        className="rounded-2xl p-6 animate-slide-up"
        style={{
          background: 'linear-gradient(135deg, var(--color-sand) 0%, var(--color-cream) 100%)',
          border: '1px solid var(--color-sand-dark)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: 'var(--color-terracotta)', color: 'white' }}
            >
              <GreetingIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-serif" style={{ color: 'var(--color-coffee)' }}>
                {greeting.text}, {user?.full_name?.split(' ')[0]}!
              </h2>
              <p className="text-muted-foreground mt-0.5">
                You have {projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace
              </p>
            </div>
          </div>
          <Button
            className="rounded-xl h-10 px-5 transition-all"
            style={{ backgroundColor: 'var(--color-terracotta)', color: 'white' }}
            onClick={() => setShowCreate(true)}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-terracotta-dark)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-terracotta)')}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--color-terracotta)' }} />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-scale-in">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-2xl mb-5"
            style={{ backgroundColor: 'var(--color-sand)', border: '2px dashed var(--color-sand-dark)' }}
          >
            <FolderOpen className="h-9 w-9" style={{ color: 'var(--color-terracotta)' }} />
          </div>
          <h3 className="text-xl font-semibold font-serif" style={{ color: 'var(--color-coffee)' }}>No projects yet</h3>
          <p className="text-muted-foreground mt-2 mb-5 max-w-sm">
            Create your first project to start organizing tasks and collaborating with your team.
          </p>
          <Button
            className="rounded-xl h-10 px-5"
            style={{ backgroundColor: 'var(--color-terracotta)', color: 'white' }}
            onClick={() => setShowCreate(true)}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-terracotta-dark)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-terracotta)')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, i) => (
            <div key={project.id} className={`animate-slide-up animate-stagger-${Math.min(i + 1, 5)}`}>
              <ProjectCard project={project} index={i} />
            </div>
          ))}
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer hover:shadow-warm animate-slide-up"
            style={{
              borderColor: 'var(--color-sand-dark)',
              color: 'var(--color-muted-foreground, #A89F91)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-terracotta)'
              e.currentTarget.style.backgroundColor = 'var(--color-sand)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-sand-dark)'
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            <Plus className="h-8 w-8 mb-2" />
            <span className="text-sm font-medium">New Project</span>
          </button>
        </div>
      )}

      <ProjectForm open={showCreate} onOpenChange={setShowCreate} />
    </div>
  )
}
