import { formatDistanceToNow } from 'date-fns'
import { Bell, CheckCheck, Info, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useNotificationStore } from '@/stores/notification-store'
import { cn } from '@/lib/utils'
import type { Notification } from '@/types'

const notificationIcons: Record<string, React.ElementType> = {
  task_assigned: CheckCircle2,
  task_updated: Info,
  comment_added: MessageSquare,
  member_added: CheckCircle2,
  mention: AlertCircle,
}

interface NotificationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: () => void
}) {
  const Icon = notificationIcons[notification.type] ?? Bell

  return (
    <button
      className={cn(
        'w-full flex gap-3 p-3 text-left hover:bg-muted/50 transition-colors rounded-md',
        !notification.is_read && 'bg-accent/30'
      )}
      onClick={onRead}
    >
      <div
        className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full',
          notification.is_read ? 'bg-muted' : 'bg-primary/10'
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4',
            notification.is_read ? 'text-muted-foreground' : 'text-primary'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', !notification.is_read && 'font-medium')}>{notification.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
      )}
    </button>
  )
}

export function NotificationPanel({ open, onOpenChange }: NotificationPanelProps) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationStore()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-96 p-0">
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => markAllRead()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
          <SheetDescription>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
          </SheetDescription>
        </SheetHeader>

        <Separator className="mt-4" />

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="p-2">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Bell className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={() => {
                      if (!notification.is_read) {
                        markRead(notification.id)
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
