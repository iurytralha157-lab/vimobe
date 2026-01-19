import { Search, Bell, Moon, Sun, Loader2, LogOut, ChevronDown, UserPlus, CheckSquare, FileText, DollarSign, Info, Settings, HelpCircle, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const notificationIcons: Record<string, typeof Bell> = {
  lead: UserPlus,
  task: CheckSquare,
  contract: FileText,
  commission: DollarSign,
  system: Bell,
  info: Info,
};

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { profile, organization, signOut, isSuperAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: notifications = [], isLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();
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

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        {isMobile && <MobileSidebar />}
        
        {title && (
          <h1 className="text-lg lg:text-xl font-semibold text-foreground">{title}</h1>
        )}
        {!title && !isMobile && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Bem-vindo,</span>
            <span className="font-medium text-foreground">{profile?.name?.split(' ')[0] || 'Usuário'}</span>
            {organization && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{organization.name}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        {/* Search - hidden on mobile */}
        {!isMobile && (
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads, imóveis..."
              className="pl-9 bg-secondary border-0"
            />
          </div>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="text-muted-foreground hover:text-foreground"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={16} className="w-[calc(100vw-2rem)] sm:w-80 max-w-[380px] bg-popover">
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium">Notificações</p>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length > 0 ? (
              <>
                {notifications.slice(0, 5).map((notification) => {
                  const NotificationIcon = notificationIcons[notification.type] || Bell;
                  return (
                    <DropdownMenuItem 
                      key={notification.id} 
                      className="p-3 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={`flex items-start gap-3 w-full ${notification.is_read ? 'opacity-60' : ''}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          notification.is_read ? 'bg-muted' : 'bg-primary/10'
                        }`}>
                          <NotificationIcon className={`h-4 w-4 ${notification.is_read ? 'text-muted-foreground' : 'text-primary'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm truncate ${!notification.is_read ? 'font-semibold' : ''}`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          {notification.content && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.content}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <div className="p-2 flex gap-2">
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="flex-1 text-xs"
                      onClick={() => markAllRead.mutate()}
                    >
                      Marcar todas como lidas
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 text-xs"
                    onClick={() => navigate('/notifications')}
                  >
                    Ver todas
                  </Button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-secondary">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {profile?.name ? getInitials(profile.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-foreground hidden sm:inline">
                {profile?.name || 'Usuário'}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={16} className="w-48 bg-popover">
            <div className="px-3 py-2">
              <p className="text-sm font-medium">{profile?.name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => navigate('/settings')}
              className="cursor-pointer"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate('/help')}
              className="cursor-pointer"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Ajuda
            </DropdownMenuItem>
            {isSuperAdmin && (
              <DropdownMenuItem 
                onClick={() => navigate('/admin')}
                className="cursor-pointer"
              >
                <Shield className="h-4 w-4 mr-2" />
                Super Admin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={signOut}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
