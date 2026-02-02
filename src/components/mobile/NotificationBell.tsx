import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Calendar, Clock, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useMentionNotifications, MentionNotification } from "@/hooks/useMentionNotifications";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseLocalDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
  isRead: boolean;
  onMarkAsRead: () => void;
  onNavigate: () => void;
}

const NotificationItem = ({ notification, isRead, onMarkAsRead, onNavigate }: NotificationItemProps) => {
  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead();
    }
    onNavigate();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-colors",
        isRead 
          ? "bg-muted/30 border-border/50" 
          : "bg-primary/5 border-primary/20 hover:bg-primary/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">OS #{notification.os_number}</span>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: notification.status_color }}
            >
              {notification.status_name}
            </span>
          </div>
          <p className="text-sm text-foreground/80 truncate mt-1">
            {notification.client_name}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(parseLocalDate(notification.scheduled_date), "dd/MM", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {notification.scheduled_time}
            </span>
          </div>
        </div>
        {!isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

interface MentionNotificationItemProps {
  notification: MentionNotification;
  onNavigate: () => void;
  onMarkAsRead: () => void;
}

const MentionNotificationItem = ({ notification, onNavigate, onMarkAsRead }: MentionNotificationItemProps) => {
  const isRead = !!notification.read_at;
  
  const handleClick = () => {
    if (!isRead) {
      onMarkAsRead();
    }
    onNavigate();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-colors",
        isRead 
          ? "bg-muted/30 border-border/50" 
          : "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <AtSign className="h-4 w-4 text-blue-500" />
            <span className="font-medium text-sm">
              OS #{notification.metadata?.os_number || '?'}
            </span>
          </div>
          <p className="text-sm text-foreground/80 mt-1">
            {notification.body}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
              locale: ptBR
            })}
          </p>
        </div>
        {!isRead && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead();
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("os");
  
  // OS notifications (existing)
  const { 
    notifications: osNotifications, 
    unreadCount: osUnreadCount, 
    isLoading: osLoading, 
    markAsRead: osMarkAsRead, 
    markAllAsRead: osMarkAllAsRead, 
    isRead: osIsRead 
  } = useNotifications();

  // Mention notifications (new)
  const {
    notifications: mentionNotifications,
    unreadCount: mentionUnreadCount,
    isLoading: mentionLoading,
    markAsRead: mentionMarkAsRead,
    markAllAsRead: mentionMarkAllAsRead,
    goToNotification,
  } = useMentionNotifications();

  // Total unread count
  const totalUnreadCount = osUnreadCount + mentionUnreadCount;

  const handleOsNavigate = (id: string) => {
    setOpen(false);
    navigate(`/service-calls?open=${id}`);
  };

  const handleMentionNavigate = (notification: MentionNotification) => {
    setOpen(false);
    goToNotification(notification);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalUnreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium px-1">
              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 sm:w-96 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Notificações</SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger 
              value="os" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
            >
              Ordens de Serviço
              {osUnreadCount > 0 && (
                <span className="ml-2 h-5 min-w-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-medium px-1">
                  {osUnreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="mentions" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-4"
            >
              Menções
              {mentionUnreadCount > 0 && (
                <span className="ml-2 h-5 min-w-5 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-medium px-1">
                  {mentionUnreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="os" className="mt-0">
            {osUnreadCount > 0 && (
              <div className="p-2 border-b flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={osMarkAllAsRead}
                >
                  <CheckCheck className="h-4 w-4" />
                  Marcar todas
                </Button>
              </div>
            )}
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="p-4 space-y-2">
                {osLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : osNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma notificação</p>
                  </div>
                ) : (
                  osNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      isRead={!!osIsRead(notification.id)}
                      onMarkAsRead={() => osMarkAsRead(notification.id)}
                      onNavigate={() => handleOsNavigate(notification.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="mentions" className="mt-0">
            {mentionUnreadCount > 0 && (
              <div className="p-2 border-b flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={mentionMarkAllAsRead}
                >
                  <CheckCheck className="h-4 w-4" />
                  Marcar todas
                </Button>
              </div>
            )}
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="p-4 space-y-2">
                {mentionLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </div>
                ) : mentionNotifications.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AtSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma menção</p>
                  </div>
                ) : (
                  mentionNotifications.map((notification) => (
                    <MentionNotificationItem
                      key={notification.id}
                      notification={notification}
                      onNavigate={() => handleMentionNavigate(notification)}
                      onMarkAsRead={() => mentionMarkAsRead(notification.id)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
