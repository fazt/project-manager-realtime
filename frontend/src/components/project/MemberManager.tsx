import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, Trash2, Shield, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useProjectStore } from '@/stores/project-store'
import { useAuthStore } from '@/stores/auth-store'
import type { MemberRole } from '@/types'

interface MemberManagerProps {
  projectId: string
}

const roleColors: Record<MemberRole, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  editor: 'secondary',
  viewer: 'outline',
}

export function MemberManager({ projectId }: MemberManagerProps) {
  const { user } = useAuthStore()
  const { members, addMember, updateMember, removeMember } = useProjectStore()
  const [view, setView] = useState<'list' | 'invite'>('list')
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState<MemberRole>('editor')
  const [isInviting, setIsInviting] = useState(false)

  const currentMember = members.find((m) => m.user_id === user?.id)
  const isAdmin = currentMember?.role === 'admin'

  const handleRoleChange = async (userId: string, role: MemberRole) => {
    try {
      await updateMember(projectId, userId, { role })
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  const handleRemove = async (userId: string) => {
    try {
      await removeMember(projectId, userId)
      toast.success('Member removed')
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!identifier.trim()) return

    setIsInviting(true)
    try {
      const isEmail = identifier.includes('@')
      await addMember(projectId, {
        [isEmail ? 'email' : 'username']: identifier.trim(),
        role,
      })
      toast.success('Member added successfully!')
      setIdentifier('')
      setView('list')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } }
      toast.error(error?.response?.data?.detail ?? 'Failed to add member')
    } finally {
      setIsInviting(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (view === 'invite') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView('list')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium">Invite Member</span>
        </div>

        <Separator />

        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or Username</Label>
            <Input
              id="identifier"
              placeholder="user@example.com or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setView('list')}>
              Cancel
            </Button>
            <Button type="submit" disabled={isInviting || !identifier.trim()}>
              {isInviting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Add Member
            </Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Team Members ({members.length})</span>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setView('invite')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite
          </Button>
        )}
      </div>

      <Separator />

      <ScrollArea className="h-[300px]">
        <div className="space-y-3 pr-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.user.avatar_url} />
                <AvatarFallback className="text-xs">
                  {getInitials(member.user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.user.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">@{member.user.username}</p>
              </div>
              {isAdmin && member.user_id !== user?.id ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onValueChange={(v) => handleRoleChange(member.user_id, v as MemberRole)}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(member.user_id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Badge variant={roleColors[member.role]} className="capitalize text-xs">
                  {member.role}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
