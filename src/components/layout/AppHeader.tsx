import { Bell, Moon, Sun, Loader2, LogOut, ChevronDown, UserPlus, CheckSquare, FileText, DollarSign, Info, Settings, HelpCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useNotifications, useUnreadNotificationsCount, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { MobileSidebar } from './MobileSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
const notificationIcons: Record<string, typeof Bell> = {
  lead: UserPlus,
  task: CheckSquare,
  contract: FileText,
  commission: DollarSign,
  system: Bell,
  info: Info
};
interface AppHeaderProps {
  title?: string;
}
export function AppHeader({
  title
}: AppHeaderProps) {
  const {
    profile,
    signOut,
    isSuperAdmin
  } = useAuth();
  const {
    theme,
    setTheme,
    resolvedTheme
  } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    data: notifications = [],
    isLoading
  } = useNotifications();
  const {
    data: unreadCount = 0
  } = useUnreadNotificationsCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const handleNotificationClick = (notification: any) => {
    markRead.mutate(notification.id);
    if (notification.lead_id) {
      navigate(`/crm/pipelines?lead_id=${notification.lead_id}`);
    }
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };
  return <header className="h-12 flex items-center px-2 lg:px-6 mx-3 mt-3">
      {/* Mobile menu */}
      {isMobile && <MobileSidebar />}
      
      {/* Page title - aligned with content */}
      {title && <h1 className="text-xl font-semibold text-foreground ml-2 lg:ml-0">{title}</h1>}

      {/* Right side actions - floating pill */}
      <div className="flex items-center gap-1.5 lg:gap-2 ml-auto bg-card rounded-full px-2 py-1.5 shadow-sm border-0">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="h-8 w-8 rounded-full">
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={16} className="w-[calc(100vw-2rem)] sm:w-80 max-w-[380px] bg-popover">
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium">Notificações</p>
            </div>
            {isLoading ? <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div> : notifications.length > 0 ? <>
                {notifications.slice(0, 5).map(notification => {
              const NotificationIcon = notificationIcons[notification.type] || Bell;
              return <DropdownMenuItem key={notification.id} className="p-3 cursor-pointer" onClick={() => handleNotificationClick(notification)}>
                      <div className={`flex items-start gap-3 w-full ${notification.is_read ? 'opacity-60' : ''}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${notification.is_read ? 'bg-muted' : 'bg-primary/10'}`}>
                          <NotificationIcon className={`h-4 w-4 ${notification.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!notification.is_read ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                          </div>
                          {notification.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.content}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>;
            })}
                <DropdownMenuSeparator />
                <div className="p-2 flex gap-2">
                  {unreadCount > 0 && <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => markAllRead.mutate()}>
                      Marcar todas como lidas
                    </Button>}
                  <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => navigate('/notifications')}>
                    Ver todas
                  </Button>
                </div>
              </> : <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 pl-1 pr-2 rounded-full">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.name ? getInitials(profile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              {!isMobile && <>
                  <span className="text-sm font-medium max-w-[100px] truncate">
                    {profile?.name?.split(' ')[0] || 'Usuário'}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={16} className="w-48 bg-popover">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/help')} className="cursor-pointer">
              <HelpCircle className="h-4 w-4 mr-2" />
              Ajuda
            </DropdownMenuItem>
            {isSuperAdmin && <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer">
                <Shield className="h-4 w-4 mr-2" />
                Super Admin
              </DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Erro no logout:', error);
            }
            window.location.href = '/auth';
          }} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>;
}