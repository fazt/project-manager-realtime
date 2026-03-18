import { useNavigate } from 'react-router-dom'
import { Users, CheckSquare, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Project } from '@/types'

const cardColors = ['#C2754F', '#7D8B6A', '#5A8A5E', '#D4936F', '#A8603E', '#96A580']

interface ProjectCardProps {
  project: Project
  index?: number
}

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const navigate = useNavigate()
  const color = cardColors[index % cardColors.length]

  const taskCount = project.task_count ?? 0
  const memberCount = project.member_count ?? 0

  return (
    <Card
      className="overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-warm-lg rounded-2xl border"
      style={{ borderColor: 'var(--color-sand-dark)' }}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Color bar */}
      <div className="h-1.5" style={{ backgroundColor: color }} />

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-semibold text-sm"
            style={{ backgroundColor: color }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <CardTitle className="text-base mt-2.5 transition-colors duration-200 group-hover:text-[var(--color-terracotta)]" style={{ color: 'var(--color-coffee)' }}>
          {project.name}
        </CardTitle>
        <CardDescription className="line-clamp-2">
          {project.description ?? 'No description'}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            <span>{taskCount} task{taskCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Progress bar */}
        {taskCount > 0 && (
          <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-sand)' }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                backgroundColor: color,
                width: `${Math.min(100, Math.max(10, (memberCount / taskCount) * 100))}%`,
                opacity: 0.7,
              }}
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button variant="ghost" size="sm" className="ml-auto gap-1 group-hover:gap-2 transition-all" style={{ color: 'var(--color-terracotta)' }}>
          Open <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}
