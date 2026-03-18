import { useLocation, useParams } from 'react-router-dom'
import { useProjectStore } from '@/stores/project-store'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ChevronRight, Home } from 'lucide-react'

export function Header() {
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const { currentProject } = useProjectStore()

  const getBreadcrumbs = () => {
    const crumbs: { label: string; icon?: boolean }[] = [{ label: 'Home', icon: true }]
    if (location.pathname === '/') {
      crumbs.push({ label: 'Dashboard' })
    } else if (location.pathname === '/settings') {
      crumbs.push({ label: 'Settings' })
    } else if (id && currentProject) {
      crumbs.push({ label: 'Projects' })
      crumbs.push({ label: currentProject.name })
    }
    return crumbs
  }

  const crumbs = getBreadcrumbs()

  return (
    <header
      className="flex h-16 items-center justify-between px-6 backdrop-blur-md"
      style={{
        backgroundColor: 'hsl(var(--background) / 0.8)',
        borderBottom: '1px solid var(--color-sand-dark)',
      }}
    >
      <nav className="flex items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {crumb.icon ? (
              <Home className="h-4 w-4 text-muted-foreground" />
            ) : (
              <span
                className={i === crumbs.length - 1 ? 'font-medium' : 'text-muted-foreground'}
                style={i === crumbs.length - 1 ? { color: 'var(--color-coffee)' } : undefined}
              >
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <NotificationBell />
      </div>
    </header>
  )
}
